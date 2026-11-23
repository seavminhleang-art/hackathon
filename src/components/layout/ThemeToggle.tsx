"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const STORAGE_KEY = "cityvoice.theme";

export function ThemeToggle() {
  const { locale } = useLocale();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Keep the default light theme when browser storage is unavailable.
    }
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // The current page still changes theme if storage is disabled.
    }
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
      {dark ? <Sun aria-hidden size={20} /> : <Moon aria-hidden size={20} />}
    </button>
  );
}
