"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Swipeable slide carousel (CSS scroll-snap, so touch swipe is native).
 * - Auto-advances every `interval` ms; stops while hovered or focused, then carries on. No pause button.
 * - No autoplay when the user prefers reduced motion.
 * - Arrows on desktop, dots everywhere. Each slide fills the width.
 */
export function Carousel({
  slides,
  label,
  interval = 6000,
  className = "",
}: {
  slides: ReactNode[];
  label: string;
  interval?: number;
  className?: string;
}) {
  const { t } = useLocale();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el || count === 0) return;
      const next = (i + count) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [count, reduced],
  );

  // Keep the dot in sync with manual swipes.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const playing = count > 1 && !hover && !reduced;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => go(index + 1), interval);
    return () => window.clearInterval(id);
  }, [playing, index, interval, go]);

  if (count === 0) return null;

  const arrow =
    "absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised hover:bg-surface lg:flex";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={`relative overflow-hidden rounded-3xl shadow-raised ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div ref={track} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-none">
        {slides.map((s, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            className="w-full flex-none snap-start"
            inert={i !== index ? true : undefined}
          >
            {s}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label={t.previous} className={`${arrow} left-4`}>
            <ChevronLeft aria-hidden size={24} />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label={t.next} className={`${arrow} right-4`}>
            <ChevronRight aria-hidden size={24} />
          </button>
          <div className="absolute right-4 bottom-4 z-10 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm lg:right-6 lg:bottom-6">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1} / ${count}`}
                aria-current={i === index || undefined}
                className="flex size-6 items-center justify-center"
              >
                <span className={`block h-2 rounded-full bg-white transition-all ${i === index ? "w-6" : "w-2 opacity-50"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
