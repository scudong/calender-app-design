"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { computeLeaveStats, formatDays } from "@/lib/leave";
import { useT } from "@/hooks/use-i18n";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { openOverlay } from "@/stores/overlay-store";

type Stat = {
  id: string;
  icon: string;
  tint: string;
  value: string;
  caption: React.ReactNode;
  label: string;
  onSelect: () => void;
};

export function StatsPanel({ onShowPending }: { onShowPending: () => void }) {
  const requests = useAppStore((s) => s.requests);
  const settings = useAppStore((s) => s.settings);
  const holidays = useAppStore((s) => s.holidays);
  const today = useToday();
  const t = useT();
  const s = useMemo(() => computeLeaveStats({ requests, settings, holidays }, today), [requests, settings, holidays, today]);

  const days = (n: number) => t(n === 1 ? "{n} day" : "{n} days", { n: formatDays(n) });

  const stats: Stat[] = [
    {
      id: "available",
      icon: "stat-available",
      tint: "var(--category-green-tint)",
      value: t("{days} available", { days: days(s.available) }),
      caption: t("To book time off"),
      label: t("Request time-off"),
      onSelect: () => openOverlay({ kind: "request" }),
    },
    {
      id: "pending",
      icon: "stat-pending",
      tint: "var(--category-orange-tint)",
      value: t(s.pendingCount === 1 ? "{n} pending request" : "{n} pending requests", { n: s.pendingCount }),
      caption: t("Awaiting manager approval"),
      label: t("Show pending requests"),
      onSelect: onShowPending,
    },
    {
      id: "upcoming",
      icon: "stat-upcoming",
      tint: "var(--category-blue-tint)",
      value: t("{days} upcoming", { days: days(s.upcoming) }),
      caption: t("Total days taken"),
      label: t("Leave policy"),
      onSelect: () => openOverlay({ kind: "policy" }),
    },
    {
      id: "contract",
      icon: "stat-per-year",
      tint: "var(--category-cyan-tint)",
      value: t("{days} per year", { days: days(s.contract) }),
      caption: t("In the contract"),
      label: t("Leave policy"),
      onSelect: () => openOverlay({ kind: "policy" }),
    },
    {
      id: "carryover",
      icon: "stat-extra",
      tint: "var(--category-pink-tint)",
      value: t("{days} extra leave", { days: days(s.carryover) }),
      caption: t("From carryover days"),
      label: t("Leave policy"),
      onSelect: () => openOverlay({ kind: "policy" }),
    },
    {
      id: "holidays",
      icon: "stat-holidays",
      tint: "var(--category-purple-tint)",
      value: t(s.holidays === 1 ? "{n} national holiday" : "{n} national holidays", { n: s.holidays }),
      caption: <span className="underline decoration-from-font [text-underline-position:from-font]">{t("See holiday list")}</span>,
      label: t("See holiday list"),
      onSelect: () => openOverlay({ kind: "holidays" }),
    },
  ];

  return (
    <aside
      aria-label={t("Time off stats")}
      className="flex w-full shrink-0 flex-col overflow-hidden border-t border-hairline bg-app xl:h-full xl:w-[304px] xl:border-t-0 xl:border-l"
    >
      <div className="flex h-[68px] w-full shrink-0 items-center gap-4 overflow-hidden border-b border-hairline px-4">
        <h2 className="t-16 min-w-0 flex-1 text-fg">{t("Time off stats")}</h2>
        <Button size="sm" className="text-fg-2" onClick={() => openOverlay({ kind: "policy" })}>
          {t("Learn more")}
        </Button>
      </div>
      <div className="scroll-thin grid min-h-0 flex-1 grid-cols-1 gap-x-6 overflow-y-auto px-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:flex xl:flex-col xl:gap-x-0">
        {stats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            onClick={stat.onSelect}
            aria-label={`${stat.value}. ${stat.label}`}
            className="group relative flex w-full shrink-0 items-center gap-3 py-4 pr-2 text-left outline-none before:absolute before:-inset-x-2 before:inset-y-1.5 before:rounded-lg before:transition-colors before:duration-150 hover-fine:before:bg-hover focus-visible:before:ring-2 focus-visible:before:ring-brand/40"
          >
            <span
              className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
              style={{ background: stat.tint }}
            >
              <Image src={`/icons/${stat.icon}.svg`} alt="" width={20} height={20} unoptimized />
            </span>
            <span className="relative flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
              <span className="t-16 w-full text-fg">{stat.value}</span>
              <span className={stat.id === "holidays" ? "t-14 salt w-full text-brand" : "t-14 salt w-full text-fg-2"}>
                {stat.caption}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
