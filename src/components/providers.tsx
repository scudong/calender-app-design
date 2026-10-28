"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLang } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-media-query";
import { setActiveLang } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";

/** Loads persisted data once the client has hydrated the seed markup. */
function StoreHydrator() {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Keep non-React helpers (dates, store toasts) on the same language the UI
  // renders with. Runs during render so the first paint is already correct.
  const lang = useLang();
  setActiveLang(lang);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);
  // Phones: toasts drop from the top so they never cover bottom bars and sheets.
  const isMobile = useIsMobile();
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delayDuration={400} skipDelayDuration={300}>
        <StoreHydrator />
        {children}
        <Toaster position={isMobile ? "top-center" : "bottom-right"} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
