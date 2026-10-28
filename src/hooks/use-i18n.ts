"use client";

import { useCallback } from "react";
import { translate, type Lang, type Vars } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";

/** Current UI language (persisted in settings). */
export function useLang(): Lang {
  return useAppStore((s) => s.settings.language ?? "zh");
}

/**
 * Translation function bound to the current language.
 *
 * Usage: `const t = useT(); ... t("Time off")` or
 * `t("{n} days", { n })` for interpolated strings.
 */
export function useT() {
  const lang = useLang();
  return useCallback((text: string, vars?: Vars) => translate(text, vars, lang), [lang]);
}
