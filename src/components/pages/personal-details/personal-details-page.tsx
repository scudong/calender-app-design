"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseIcon, CakeIcon, MailIcon, MapPinIcon, PhoneIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/dialogs/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMonthDay, fromKey, monthShort } from "@/lib/dates";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { Card, CardHeader, PageHeader, PageRoot } from "@/components/pages/shared/page-chrome";

/** Phones: 40px fields with 16px text, so iOS doesn't zoom in on focus. */
const TOUCH_FIELD = "max-md:h-10 max-md:text-[16px]";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIO_MAX = 280;

type TFn = ReturnType<typeof useT>;

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function tenure(start: string, today: string, t: TFn) {
  if (!start || start > today) return null;
  const a = fromKey(start);
  const b = fromKey(today);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y && !m) return t("Less than a month");
  return [y ? t(y === 1 ? "{n} year" : "{n} years", { n: y }) : "", m ? t(m === 1 ? "{n} month" : "{n} months", { n: m }) : ""]
    .filter(Boolean)
    .join(" ");
}

function validate(p: Profile, t: TFn): Partial<Record<keyof Profile, string>> {
  const errors: Partial<Record<keyof Profile, string>> = {};
  if (!p.name.trim()) errors.name = t("Your name is required.");
  if (!p.email.trim()) errors.email = t("An email address is required.");
  else if (!EMAIL_RE.test(p.email.trim())) errors.email = t("Enter a valid email address.");
  if (!p.initials.trim()) errors.initials = t("Add 1–3 initials.");
  if (p.bio.length > BIO_MAX) errors.bio = t("Keep it under {n} characters.", { n: BIO_MAX });
  if (p.startDate && p.birthday && p.birthday >= p.startDate) errors.birthday = t("Birthday must be before your start date.");
  return errors;
}

export function PersonalDetailsPage() {
  const t = useT();
  const today = useToday();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);

  // Only the fields the user touched are kept locally; everything else reads
  // through to the store, so a late store hydration never clobbers the form.
  const [edits, setEdits] = useState<Partial<Profile>>({});
  const [showErrors, setShowErrors] = useState(false);

  const draft = useMemo(() => ({ ...profile, ...edits }), [profile, edits]);
  const changed = useMemo(
    () => (Object.keys(edits) as (keyof Profile)[]).filter((k) => edits[k] !== profile[k]),
    [edits, profile],
  );
  const dirty = changed.length > 0;
  const errors = useMemo(() => validate(draft, t), [draft, t]);
  const hasErrors = Object.keys(errors).length > 0;

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setEdits((e) => {
      const next = { ...e, [key]: value };
      if (value === profile[key]) delete next[key];
      return next;
    });

  const reset = () => {
    setEdits({});
    setShowErrors(false);
  };

  const save = () => {
    if (!dirty) return;
    if (hasErrors) {
      setShowErrors(true);
      toast.error(t("Check the highlighted fields"), { description: t("Some details need fixing before saving.") });
      return;
    }
    const patch: Partial<Profile> = {};
    for (const k of changed) (patch as Record<string, string>)[k] = (draft[k] as string).trim();
    if (patch.initials) patch.initials = patch.initials.toUpperCase();
    updateProfile(patch);
    setEdits({});
    setShowErrors(false);
    toast.success(t("Profile saved"), {
      description: t(changed.length === 1 ? "{n} field updated" : "{n} fields updated", { n: changed.length }),
    });
  };

  // ⌘S / Ctrl+S saves; warn before leaving with unsaved edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        document.getElementById("profile-save")?.click();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [dirty]);

  // Errors show once a field has been edited, or for every field after a failed save.
  const err = (k: keyof Profile) => ((showErrors || k in edits) && errors[k]) || null;
  const input = (k: keyof Profile, { className, ...props }: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={`pd-${k}`}
      value={draft[k]}
      onChange={(e) => set(k, e.target.value)}
      aria-invalid={err(k) ? true : undefined}
      className={cn(TOUCH_FIELD, className)}
      {...props}
    />
  );

  const tenureText = tenure(draft.startDate, today, t);
  const birthday = draft.birthday ? fromKey(draft.birthday) : null;

  return (
    <PageRoot>
      <PageHeader
        title={t("Your profile")}
        description={
          dirty ? (
            <>
              {t(changed.length === 1 ? "{n} unsaved change" : "{n} unsaved changes", { n: changed.length })}
              <span className="max-md:hidden"> · {t("⌘S to save")}</span>
            </>
          ) : (
            t("Shared with your manager and People Ops")
          )
        }
        actions={
          // Phones get a sticky save bar at the bottom instead (see below).
          <div className="hidden items-center gap-2 md:flex">
            <Button onClick={reset} disabled={!dirty}>
              <RotateCcwIcon className="text-icon" /> {t("Reset")}
            </Button>
            <Button id="profile-save" type="submit" form="profile-form" variant="brand" disabled={!dirty}>
              {t("Save changes")}
            </Button>
          </div>
        }
      />
      <form
        id="profile-form"
        className="mx-auto grid w-full max-w-[1040px] grid-cols-1 items-start gap-3 p-4 md:gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        {/* Summary */}
        <Card className="lg:sticky lg:top-[84px]">
          {/* Below lg the summary is a compact horizontal header; the sidebar card from lg. */}
          <div className="flex items-center gap-3.5 p-4 lg:flex-col lg:gap-3 lg:px-4 lg:pt-6 lg:pb-5 lg:text-center">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-brand-tint lg:size-16 lg:rounded-[18px]">
              <span className="font-inter text-[20px] leading-none font-semibold tracking-[-0.3px] text-brand lg:text-[22px] lg:tracking-[-0.33px]">
                {draft.initials.toUpperCase() || "?"}
              </span>
            </span>
            <div className="grid min-w-0 gap-2">
              <p className="t-16 text-fg">{draft.name || t("Your name")}</p>
              <p className="t-14 text-fg-2">
                {[draft.jobTitle, draft.department].filter(Boolean).join(" · ") || t("Add a job title")}
              </p>
            </div>
          </div>
          <ul className="grid gap-x-4 gap-y-3 border-t border-subtle px-4 py-4 sm:grid-cols-2 lg:grid-cols-1">
            <SummaryRow icon={<MailIcon />}>{draft.email || "—"}</SummaryRow>
            <SummaryRow icon={<PhoneIcon />}>{draft.phone || "—"}</SummaryRow>
            <SummaryRow icon={<MapPinIcon />}>{draft.location || "—"}</SummaryRow>
            <SummaryRow icon={<BriefcaseIcon />}>
              {draft.startDate
                ? t("Joined {month} {year}", { month: monthShort(draft.startDate), year: draft.startDate.slice(0, 4) })
                : "—"}
              {tenureText ? <span className="text-placeholder"> · {tenureText}</span> : null}
            </SummaryRow>
            <SummaryRow icon={<CakeIcon />}>
              {birthday ? formatMonthDay(draft.birthday) : "—"}
            </SummaryRow>
          </ul>
        </Card>

        <div className="grid min-w-0 gap-4">
          <Section title={t("Basic information")} description={t("How you appear across the workspace")}>
            <div className="grid grid-cols-[minmax(0,1fr)_88px] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_120px] sm:gap-4">
              <Field label={t("Full name")} htmlFor="pd-name" error={err("name")}>
                {input("name", { autoComplete: "name", required: true })}
              </Field>
              <Field label={t("Initials")} htmlFor="pd-initials" error={err("initials")}>
                {input("initials", {
                  maxLength: 3,
                  className: "uppercase",
                  onChange: (e) => set("initials", e.target.value.toUpperCase().replace(/[^A-Z]/g, "")),
                })}
              </Field>
            </div>
            {initialsFrom(draft.name) && initialsFrom(draft.name) !== draft.initials ? (
              <button
                type="button"
                onClick={() => set("initials", initialsFrom(draft.name))}
                className="t-12 -mt-2 w-fit text-brand outline-none hover-fine:text-brand-strong focus-visible:underline max-md:-my-1 max-md:py-1.5"
              >
                {t("Use “{initials}” from your name", { initials: initialsFrom(draft.name) })}
              </button>
            ) : null}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <Field label={t("Email")} htmlFor="pd-email" error={err("email")}>
                {input("email", { type: "email", autoComplete: "email", required: true })}
              </Field>
              <Field label={t("Phone")} htmlFor="pd-phone">
                {input("phone", { type: "tel", autoComplete: "tel", placeholder: "+44 20 0000 0000" })}
              </Field>
            </div>
          </Section>

          <Section title={t("Work")} description={t("Your role and reporting line")}>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <Field label={t("Job title")} htmlFor="pd-jobTitle">
                {input("jobTitle", { autoComplete: "organization-title" })}
              </Field>
              <Field label={t("Department")} htmlFor="pd-department">
                {input("department")}
              </Field>
              <Field label={t("Manager")} htmlFor="pd-manager">
                {input("manager")}
              </Field>
              <Field label={t("Location")} htmlFor="pd-location">
                {input("location", { placeholder: t("City, Country") })}
              </Field>
              <Field
                label={t("Start date")}
                htmlFor="pd-startDate"
                hint={tenureText ? t("{tenure} at the company", { tenure: tenureText }) : undefined}
              >
                {input("startDate", { type: "date", max: today })}
              </Field>
            </div>
          </Section>

          <Section title={t("Personal")} description={t("Only visible to People Ops")}>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <Field label={t("Birthday")} htmlFor="pd-birthday" error={err("birthday")}>
                {input("birthday", { type: "date", max: today })}
              </Field>
              <Field label={t("Emergency contact")} htmlFor="pd-emergencyContact" hint={t("Name and phone number")}>
                {input("emergencyContact", { placeholder: t("Name · phone") })}
              </Field>
              <Field label={t("Home address")} htmlFor="pd-address" className="sm:col-span-2">
                {input("address", { autoComplete: "street-address" })}
              </Field>
            </div>
          </Section>

          <Section title={t("About")} description={t("A short intro for your teammates")}>
            <Field
              label={t("Bio")}
              htmlFor="pd-bio"
              error={err("bio")}
              hint={
                <span className={cn("tabular-nums", draft.bio.length > BIO_MAX * 0.9 && "text-warning")}>
                  {draft.bio.length}/{BIO_MAX}
                </span>
              }
            >
              <Textarea
                id="pd-bio"
                className="max-md:text-[16px]"
                rows={3}
                value={draft.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder={t("What you work on, what you love…")}
                aria-invalid={err("bio") ? true : undefined}
              />
            </Field>
          </Section>
        </div>
      </form>

      {/* Phones: unsaved edits surface a save bar pinned above the home indicator. */}
      {dirty ? (
        <div className="sticky bottom-0 z-10 mt-auto flex gap-2 border-t border-hairline bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] duration-200 ease-(--ease-out) animate-in fade-in-0 slide-in-from-bottom-4 md:hidden">
          <Button className="h-10 px-3.5" onClick={reset}>
            <RotateCcwIcon className="text-icon" /> {t("Reset")}
          </Button>
          <Button type="submit" form="profile-form" variant="brand" className="h-10 flex-1">
            {changed.length === 1 ? t("Save change") : t("Save {n} changes", { n: changed.length })}
          </Button>
        </div>
      ) : null}
    </PageRoot>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="grid gap-4 p-4">{children}</div>
    </Card>
  );
}

function SummaryRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-icon">
      {icon}
      <span className="t-14 min-w-0 flex-1 truncate text-fg-2">{children}</span>
    </li>
  );
}
