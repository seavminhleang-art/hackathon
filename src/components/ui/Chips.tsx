"use client";

import Link from "next/link";
import { Check, type LucideIcon } from "lucide-react";

/**
 * Row of filter chips (single choice). Scrolls sideways on phones; the cut-off chip
 * hints there's more. Selected = filled + check icon, so it doesn't rely on color.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  wrap = false,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
  /** Accessible name for the group. */
  label: string;
  /** Wrap onto new lines instead of scrolling (desktop). */
  wrap?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`-mx-4 flex gap-2 px-4 sm:mx-0 sm:px-0 ${wrap ? "flex-wrap" : "overflow-x-auto scrollbar-none lg:flex-wrap"}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        const Icon = on ? Check : o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-11 flex-none items-center gap-1.5 rounded-full px-4 text-meta font-semibold whitespace-nowrap transition-colors ${
              on ? "bg-primary text-white shadow-card" : "bg-surface text-ink ring-1 ring-line-strong ring-inset hover:bg-sand-deep"
            }`}
          >
            {Icon && <Icon aria-hidden size={16} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * In-screen sub-navigation (e.g. Board · Groups · News). Links, so each tab has its own URL.
 * Active = blue + bold + gold underline. Lives in the screen, never in the navbar.
 */
export function SubNav({ items, active }: { items: { href: string; label: string }[]; active: string }) {
  return (
    <nav className="-mx-4 flex border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Sections">
      {items.map((it) => {
        const on = it.href === active;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex min-h-13 flex-1 items-center justify-center px-4 text-body sm:flex-none ${
              on ? "font-bold text-primary-ink" : "font-semibold text-ink-muted hover:text-ink"
            }`}
          >
            {it.label}
            {on && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-t-full bg-gold" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Labelled on/off switch (e.g. "Open now"). */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 items-center gap-2.5 rounded-xl px-1 text-body font-semibold"
    >
      <span className={`relative h-7 w-12 flex-none rounded-full transition-colors ${checked ? "bg-primary" : "bg-line-strong"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow-card transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
      {label}
    </button>
  );
}
