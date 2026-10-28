"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, PageRoot } from "@/components/pages/shared/page-chrome";
import { useT } from "@/hooks/use-i18n";
import { formatShort } from "@/lib/dates";
import { getAdminOverview, setRequestStatus, updateUser, type AdminOverview } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", manager: "Manager", employee: "Employee" };

export function AdminPage() {
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const role = me?.role;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getAdminOverview());
      setError(null);
    } catch {
      setError(t("Couldn’t load team data."));
    }
  }, [t]);

  useEffect(() => {
    if (role === "admin" || role === "manager") void load();
  }, [role, load]);

  const changeUser = async (id: string, patch: { role?: string; managerId?: string | null }) => {
    try {
      await updateUser(id, patch);
      toast.success(t("Member updated"));
      await load();
    } catch {
      toast.error(t("Couldn’t update the user."));
    }
  };

  const decide = async (id: string, status: "approved" | "declined") => {
    setBusy(id);
    try {
      await setRequestStatus(id, status);
      toast.success(t(status === "approved" ? "Request approved" : "Request declined"));
      await load();
    } catch {
      toast.error(t("Couldn’t update the request."));
    } finally {
      setBusy(null);
    }
  };

  if (role !== "admin" && role !== "manager") {
    return (
      <PageRoot>
        <PageHeader title={t("Team approvals")} description={t("Only managers and admins can view this page.")} />
      </PageRoot>
    );
  }

  const pending = data?.requests.filter((r) => r.status === "pending") ?? [];

  return (
    <PageRoot>
      <PageHeader title={t("Team approvals")} description={t("Approve or decline your team’s time-off requests.")} />

      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4 p-4">
        {error && <p className="t-13 text-danger">{error}</p>}

        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <h2 className="t-14 text-fg">{t("Pending requests")}</h2>
            <span className="t-12 text-fg-2">{t("{n} pending", { n: pending.length })}</span>
          </div>
          {pending.length === 0 ? (
            <p className="px-4 py-8 t-13 text-fg-2">{t("Nothing waiting on approval")}</p>
          ) : (
            <ul>
              {pending.map((r, i) => (
                <li
                  key={r.id}
                  className={cn("flex flex-wrap items-center gap-3 px-4 py-3", i > 0 && "border-t border-subtle")}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="t-14 text-fg">
                      {r.userName} · {t(r.type)} · {r.days} {t("days")}
                    </span>
                    <span className="t-12 text-fg-2">
                      {formatShort(r.from)} – {formatShort(r.to)} · {r.notes}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" disabled={busy === r.id} onClick={() => void decide(r.id, "approved")}>
                      {t("Approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === r.id}
                      onClick={() => void decide(r.id, "declined")}
                    >
                      {t("Decline")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="border-b border-hairline px-4 py-3">
            <h2 className="t-14 text-fg">{t("Members")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-hairline text-left">
                  {[t("Name"), t("Email"), t("Role"), t("Manager"), t("Available days"), t("Pending requests")].map((h) => (
                    <th key={h} className="t-12 px-4 py-2 font-normal text-fg-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.users ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-subtle last:border-0">
                    <td className="t-14 px-4 py-2.5 text-table">{u.name}</td>
                    <td className="t-14 px-4 py-2.5 text-table">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <select
                        aria-label={t("Role")}
                        className="h-8 rounded-md border border-control bg-surface px-2 t-13 text-fg"
                        value={u.role}
                        disabled={u.id === me?.id || role !== "admin"}
                        onChange={(e) => void changeUser(u.id, { role: e.target.value })}
                      >
                        {["employee", "manager", "admin"].map((r) => (
                          <option key={r} value={r}>
                            {t(ROLE_LABEL[r])}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        aria-label={t("Manager")}
                        className="h-8 max-w-[160px] rounded-md border border-control bg-surface px-2 t-13 text-fg"
                        value={u.managerId ?? ""}
                        disabled={role !== "admin"}
                        onChange={(e) => void changeUser(u.id, { managerId: e.target.value || null })}
                      >
                        <option value="">{t("No manager")}</option>
                        {(data?.users ?? [])
                          .filter((x) => x.id !== u.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="t-14 px-4 py-2.5 text-table tabular-nums">{u.available}</td>
                    <td className="t-14 px-4 py-2.5 text-table tabular-nums">{u.pendingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageRoot>
  );
}
