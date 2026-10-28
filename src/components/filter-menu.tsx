"use client";

import { CheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-media-query";

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
  /** Optional leading visual (a dot, an icon…) */
  adornment?: React.ReactNode;
};

export type FilterGroup<T extends string = string> =
  | {
      id: string;
      label: string;
      type: "multi";
      options: FilterOption<T>[];
      value: T[];
      onChange: (value: T[]) => void;
    }
  | {
      id: string;
      label: string;
      type: "single";
      options: FilterOption<T>[];
      value: T;
      onChange: (value: T) => void;
    };

type Props = {
  /** Groups shown in order: e.g. Status, Type, Sort by */
  groups: FilterGroup[];
  /** Number of groups that differ from their default — drives the badge */
  activeCount: number;
  onReset: () => void;
  title?: string;
  /** Label for the phone trigger */
  triggerLabel?: string;
  className?: string;
};

/**
 * One grouped filter menu for every list: a popover from a 30px icon button on
 * desktop, a swipe-to-dismiss bottom sheet with a labelled button on phones.
 */
export function FilterMenu({ groups, activeCount, onReset, title = "Filters", triggerLabel = "Filters", className }: Props) {
  const t = useT();
  const isMobile = useIsMobile();
  const body = <FilterGroups groups={groups} />;
  const triggerText = t(triggerLabel);
  const countLabel = activeCount ? t("{label}, {n} active", { label: triggerText, n: activeCount }) : triggerText;
  const titleText = t(title);

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button className={cn("relative h-10 gap-1.5 px-3", className)} aria-label={countLabel}>
            <SlidersHorizontalIcon className={cn(activeCount > 0 && "text-brand")} />
            {triggerText}
            {activeCount > 0 && (
              <span className="t-12 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-white">{activeCount}</span>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="flex-row items-center justify-between pb-2 text-left">
            <div className="grid gap-1">
              <DrawerTitle>{titleText}</DrawerTitle>
              <DrawerDescription className="sr-only">{t("Filter and sort the list")}</DrawerDescription>
            </div>
            <Button variant="ghost" size="sm" disabled={activeCount === 0} onClick={onReset}>
              {t("Reset")}
            </Button>
          </DrawerHeader>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-2">{body}</div>
          <DrawerFooter className="border-t border-hairline pt-3">
            <DrawerClose asChild>
              <Button variant="brand" size="lg" className="w-full">
                {t("Show results")}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button size="icon" aria-label={countLabel} className={cn("relative", className)}>
              <Icon name="filter" className={cn(activeCount > 0 && "text-brand")} />
              {activeCount > 0 && <span className="absolute top-[5px] right-[5px] size-1.5 rounded-full bg-brand ring-2 ring-surface" />}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{titleText}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-72 gap-0 p-0">
        <div className="flex h-11 items-center justify-between border-b border-hairline pr-2 pl-3">
          <span className="t-14 text-fg">{titleText}</span>
          <Button variant="ghost" size="sm" disabled={activeCount === 0} onClick={onReset}>
            {t("Reset")}
          </Button>
        </div>
        <div className="scroll-thin max-h-[min(460px,70dvh)] overflow-y-auto p-3">{body}</div>
      </PopoverContent>
    </Popover>
  );
}

function FilterGroups({ groups }: { groups: FilterGroup[] }) {
  const t = useT();
  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <fieldset key={group.id} className="grid gap-2">
          <legend className="t-12 mb-2 text-fg-2">{t(group.label)}</legend>
          <div className="flex flex-wrap gap-1.5" role={group.type === "single" ? "radiogroup" : "group"}>
            {group.options.map((opt) => {
              const selected = group.type === "multi" ? group.value.includes(opt.value) : group.value === opt.value;
              const toggle = () => {
                if (group.type === "single") return group.onChange(opt.value);
                const next = selected ? group.value.filter((v) => v !== opt.value) : [...group.value, opt.value];
                group.onChange(next);
              };
              return (
                <button
                  key={opt.value}
                  type="button"
                  role={group.type === "single" ? "radio" : "checkbox"}
                  aria-checked={selected}
                  onClick={toggle}
                  className={cn(
                    "press t-14 salt flex h-8 items-center gap-1.5 rounded-lg border px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    selected
                      ? "border-brand/40 bg-brand-tint text-fg"
                      : "border-control bg-surface text-fg-2 hover-fine:bg-hover hover-fine:text-fg",
                  )}
                >
                  {opt.adornment}
                  {t(opt.label)}
                  {selected && group.type === "multi" && <CheckIcon className="size-3.5 text-brand" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
