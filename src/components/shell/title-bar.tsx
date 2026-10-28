"use client";

import { usePathname } from "next/navigation";
import { BookOpenIcon, CalendarHeartIcon, KeyboardIcon, LifeBuoyIcon } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { pageTitle } from "@/lib/nav";
import { useT } from "@/hooks/use-i18n";
import { openOverlay } from "@/stores/overlay-store";
import { GlobalSearchTrigger } from "./global-search";
import { MobileNav } from "./mobile-nav";
import { NotificationsPopover } from "./notifications-popover";
import { Brand } from "./workspace-switcher";

function HelpMenu() {
  const t = useT();
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button size="icon" aria-label={t("Help")}>
              <Icon name="help" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("Help")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuItem onSelect={() => openOverlay({ kind: "shortcuts" })}>
          <KeyboardIcon /> {t("Keyboard shortcuts")}
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openOverlay({ kind: "policy" })}>
          <BookOpenIcon /> {t("Leave policy")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openOverlay({ kind: "holidays" })}>
          <CalendarHeartIcon /> {t("Holiday list")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => toast(t("Message sent to HR"), { description: t("Someone from People Ops will reply by email.") })}
        >
          <LifeBuoyIcon /> {t("Contact HR")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TitleBar() {
  const pathname = usePathname();
  const t = useT();
  return (
    <header className="flex h-[53px] w-full shrink-0 items-center overflow-hidden border-b border-hairline bg-app pr-3 pt-[env(safe-area-inset-top)] sm:pr-4">
      <Brand className="hidden lg:flex" />
      <MobileNav />
      <div className="flex h-full min-w-0 flex-1 items-center overflow-hidden pl-2 lg:pl-4">
        <h1 className="t-16 min-w-0 flex-1 truncate font-medium text-fg">{t(pageTitle(pathname))}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <GlobalSearchTrigger />
        <div className="hidden md:contents">
          <HelpMenu />
        </div>
        <NotificationsPopover />
        <div className="hidden h-4 w-px bg-hairline sm:block" aria-hidden />
        <Button
          variant="brand"
          className="gap-1.5 max-sm:w-[30px] max-sm:px-0"
          aria-label={t("Request time-off")}
          onClick={() => openOverlay({ kind: "request" })}
        >
          <Icon name="request-time-off" className="text-white" />
          <span className="max-sm:sr-only">{t("Request time-off")}</span>
        </Button>
      </div>
    </header>
  );
}
