"use client";

import { useState } from "react";
import { CopyIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EVENT_COLORS } from "@/components/calendar/event-colors";
import { parseTime, timeInputValue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalEvent, EventColor } from "@/lib/types";
import { useT } from "@/hooks/use-i18n";
import { useAppStore } from "@/stores/app-store";
import { Field } from "./field";

type Props = {
  open: boolean;
  session: number;
  onClose: () => void;
  eventId?: string;
  date?: string;
  start?: number;
  end?: number;
  allDay?: boolean;
};

export function EventDialog({ open, session, onClose, ...payload }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-5 p-5 sm:max-w-[440px]">
        <EventForm key={session} {...payload} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

type Draft = Omit<CalEvent, "id">;

function EventForm({
  eventId,
  date,
  start,
  end,
  allDay,
  onDone,
}: Omit<Props, "open" | "session" | "onClose"> & { onDone: () => void }) {
  const existing = useAppStore((s) => s.events.find((e) => e.id === eventId));
  const saveEvent = useAppStore((s) => s.saveEvent);
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const duplicateEvent = useAppStore((s) => s.duplicateEvent);
  const t = useT();

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? { ...existing }
      : {
          title: "",
          date: date ?? "",
          start: start ?? 540,
          end: end ?? (start ?? 540) + 60,
          allDay: allDay ?? false,
          color: "blue",
          note: "",
          location: "",
        },
  );
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const error = !draft.allDay && draft.end <= draft.start ? t("End time must be after the start time.") : null;
  const linked = Boolean(existing?.requestId);

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (error || !draft.title.trim() || !draft.date) return;
        saveEvent({
          ...draft,
          id: existing?.id,
          title: draft.title.trim(),
          start: draft.allDay ? 0 : draft.start,
          end: draft.allDay ? 1440 : draft.end,
        });
        onDone();
      }}
    >
      <DialogHeader className="gap-1.5">
        <DialogTitle className="t-16">{t(existing ? "Edit event" : "New event")}</DialogTitle>
        <DialogDescription className="t-14">
          {t(linked ? "This event belongs to a leave request." : "Add it to your calendar — only you can see it.")}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <Field label={t("Title")} htmlFor="ev-title">
          <Input
            id="ev-title"
            autoFocus
            required
            placeholder={t("e.g. Dentist appointment")}
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-[1.4fr_1fr_1fr] items-end gap-3 max-sm:grid-cols-2 max-sm:[&>*:first-child]:col-span-2">
          <Field label={t("Date")} htmlFor="ev-date">
            <Input id="ev-date" type="date" required value={draft.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label={t("Start")} htmlFor="ev-start">
            <Input
              id="ev-start"
              type="time"
              step={900}
              disabled={draft.allDay}
              value={timeInputValue(draft.start)}
              onChange={(e) => {
                const next = parseTime(e.target.value);
                const length = draft.end - draft.start;
                setDraft((d) => ({ ...d, start: next, end: Math.min(1440, next + Math.max(15, length)) }));
              }}
            />
          </Field>
          <Field label={t("End")} htmlFor="ev-end">
            <Input
              id="ev-end"
              type="time"
              step={900}
              disabled={draft.allDay}
              value={timeInputValue(draft.end)}
              onChange={(e) => set("end", parseTime(e.target.value) || 1440)}
            />
          </Field>
        </div>
        {error && (
          <p className="t-12 -mt-2 text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <Switch checked={draft.allDay} onCheckedChange={(v) => set("allDay", v)} />
            <span className="t-14 text-fg">{t("All day")}</span>
          </label>
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label={t("Color")}>
            {EVENT_COLORS.map((c) => (
              <ColorSwatch key={c} color={c} selected={draft.color === c} onSelect={() => set("color", c)} />
            ))}
          </div>
        </div>

        <Field label={t("Location")} htmlFor="ev-location">
          <Input
            id="ev-location"
            placeholder={t("Add a place or a link")}
            value={draft.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
          />
        </Field>

        <Field label={t("Notes")} htmlFor="ev-note" hint={t("Short notes show on the event in the calendar.")}>
          <Textarea id="ev-note" rows={2} value={draft.note ?? ""} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </div>

      <DialogFooter className="-mx-5 -mb-5 items-center bg-app px-5 py-3 sm:justify-between">
        <div className="flex gap-1">
          {existing && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("Delete event")}
                    onClick={() => {
                      deleteEvent(existing.id);
                      onDone();
                    }}
                  >
                    <Trash2Icon className="text-danger" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("Delete")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("Duplicate event")}
                    onClick={() => {
                      duplicateEvent(existing.id);
                      onDone();
                    }}
                  >
                    <CopyIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("Duplicate")}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onDone}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="brand" disabled={!!error || !draft.title.trim()}>
            {t(existing ? "Save" : "Create event")}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function ColorSwatch({ color, selected, onSelect }: { color: EventColor; selected: boolean; onSelect: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={t(color)}
      onClick={onSelect}
      className={cn(
        "press size-5 rounded-full outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-brand/50",
        selected && "ring-2",
      )}
      style={{
        background: `var(--event-${color}-bg)`,
        boxShadow: `inset 0 0 0 1.5px var(--event-${color}-fg)`,
        ...(selected ? ({ "--tw-ring-color": `var(--event-${color}-fg)` } as React.CSSProperties) : {}),
      }}
    />
  );
}
