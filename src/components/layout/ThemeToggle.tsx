"use client";

import sun from "react-useanimations/lib/sun";
import moon from "react-useanimations/lib/moon";
import { useSyncExternalStore } from "react";
import { AnimatedIcon } from "@/components/ui/AnimatedIcon";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme";


type Theme = "light" | "dark";
const listeners = new Set<() => void>();

/** The theme lives on <html data-theme>, set before paint by THEME_INIT_SCRIPT (no light flash). */
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
const readTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  const { locale } = useLocale();
  const dark = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme) === "dark";

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current page still changes theme if storage is disabled.
    }
    listeners.forEach((l) => l());
  }

  const label = dark
    ? locale === "km" ? "ប្តូរទៅពន្លឺថ្ងៃ" : "Switch to light theme"
    : locale === "km" ? "ប្តូរទៅពន្លឺងងឹត" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex size-12 items-center justify-center rounded-xl text-white hover:bg-white/10 focus-visible:outline-white"
    >
      {dark ? <AnimatedIcon key="sun" animation={sun} size={20} /> : <AnimatedIcon key="moon" animation={moon} size={20} />}
    </button>
  );
}
