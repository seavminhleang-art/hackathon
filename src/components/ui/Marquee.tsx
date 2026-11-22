import type { ReactNode } from "react";

/**
 * News ticker. Items scroll right-to-left in a continuous loop. It only stops while
 * the mouse is over it (so people can read and click), then carries on. No pause button.
 * - Speed scales with the number of items (`secondsPerItem`).
 * - Only exception: with the OS "reduce motion" setting on, it stays still and
 *   becomes a swipeable row, for people who get motion sickness.
 */
export function Marquee({
  label,
  items,
  tone = "primary",
  secondsPerItem = 9,
}: {
  /** Fixed badge on the left, e.g. "News" / "Alert". */
  label: ReactNode;
  items: ReactNode[];
  tone?: "primary" | "danger" | "ink";
  secondsPerItem?: number;
}) {
  if (items.length === 0) return null;

  const bg = tone === "danger" ? "bg-danger" : tone === "ink" ? "bg-ink" : "bg-primary";
  const badge = tone === "danger" ? "bg-danger-ink" : tone === "ink" ? "bg-black" : "bg-primary-hover";
  const row = (hidden: boolean) => (
    <ul className="flex flex-none items-center" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <li key={i} className="flex flex-none items-center gap-6 pr-6 whitespace-nowrap">
          {it}
          <span className="size-1.5 rounded-full bg-white/50" aria-hidden />
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`cv-marquee flex min-h-12 items-stretch text-white ${bg}`} role="region" aria-label={typeof label === "string" ? label : undefined}>
      <div className={`relative z-10 flex flex-none items-center gap-2 px-4 text-meta font-bold tracking-wide uppercase ${badge}`}>{label}</div>
      <div className="relative min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto motion-reduce:scrollbar-none">
        <div
          className="cv-marquee-track flex w-max items-center py-2.5 pl-6 text-body"
          style={{ ["--marquee-duration" as string]: `${Math.max(20, items.length * secondsPerItem)}s` }}
        >
          {row(false)}
          {/* Second copy makes the loop seamless; hidden from screen readers. */}
          <span className="contents motion-reduce:hidden">{row(true)}</span>
        </div>
      </div>
      {/* Scoped styles: React 19 hoists and de-duplicates <style href>. Kept here (not in
          globals.css) so the ticker works without restarting the dev server. */}
      <style href="cv-marquee" precedence="default">{MARQUEE_CSS}</style>
    </div>
  );
}

const MARQUEE_CSS = `
@keyframes cv-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
.cv-marquee-track { animation: cv-marquee var(--marquee-duration, 40s) linear infinite; will-change: transform; }
.cv-marquee:hover .cv-marquee-track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .cv-marquee-track { animation: none !important; } }
`;
