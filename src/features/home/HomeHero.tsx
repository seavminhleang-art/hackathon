"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CloudRain,
  Flame,
  HeartPulse,
  Info,
  Megaphone,
  Construction,
  Trash2,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { formatDateParts, shortDate } from "@/lib/i18n/format";
import { Carousel, Marquee, Skeleton } from "@/components/ui";
import type { CsAnnouncementCategory, CsAnnouncementView, CsPostView } from "@/types/community";
import { HERO_IMAGES } from "./heroImages";

// ---------- News ticker ----------

/** Scrolling strip of every active announcement. Red while an emergency alert is active. */
export function NewsTicker({ news }: { news?: CsAnnouncementView[] }) {
  const { t, tx, locale } = useLocale();
  if (!news?.length) return null;
  const hasAlert = news.some((n) => n.level === "ALERT");

  return (
    <Marquee
      tone={hasAlert ? "danger" : "primary"}
      label={
        <>
          {hasAlert ? <TriangleAlert aria-hidden size={18} /> : <Megaphone aria-hidden size={18} />}
          <span className="hidden sm:inline">{hasAlert ? t.alertTicker : t.newsTicker}</span>
        </>
      }
      items={news.map((n) => (
        <Link key={n.id} href={`/announcements/${n.id}`} className="flex items-center gap-2 hover:underline">
          {n.level === "ALERT" && <TriangleAlert aria-hidden size={16} />}
          <span className="font-bold">{tx(n.title)}</span>
          <span className="text-white/85">{tx(n.body)}</span>
          <span className="text-meta text-white/70">· {formatDateParts(n.validFrom, locale).time}</span>
        </Link>
      ))}
    />
  );
}

// ---------- Hero carousel ----------

type Theme = { bg: string; icon: LucideIcon };

// Hero gradients are fixed (theme-independent) like photos: text on them is always white.
const CATEGORY_THEME: Partial<Record<CsAnnouncementCategory, Theme>> = {
  FLOOD: { bg: "from-[#0b3a8c] via-[#032ea1] to-[#0a6fa8]", icon: CloudRain },
  FIRE: { bg: "from-[#8f0b21] via-[#c8102e] to-[#c2410c]", icon: Flame },
  ROAD_CLOSURE: { bg: "from-[#1c1a17] via-[#3a3328] to-[#8a4a05]", icon: Construction },
  WASTE: { bg: "from-[#0f5434] via-[#157347] to-[#2f8f5f]", icon: Trash2 },
  HEALTH: { bg: "from-[#0f5434] via-[#11695a] to-[#1d8a7a]", icon: HeartPulse },
  UTILITY_OUTAGE: { bg: "from-[#1c1a17] via-[#2b2a3a] to-[#032ea1]", icon: Zap },
};
const DEFAULT_THEME: Theme = { bg: "from-[#032ea1] via-[#1e47b5] to-[#0b1f6b]", icon: Info };
const EVENT_THEME: Theme = { bg: "from-[#9a3412] via-[#c2410c] to-[#c99a2e]", icon: CalendarDays };

interface Slide {
  id: string;
  kicker: string;
  title: string;
  body: string;
  meta: string;
  href: string;
  theme: Theme;
}

/** Photo fades in over the slide's category gradient, which doubles as its placeholder. */
function HeroPhoto({ src, priority }: { src: string; priority: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <span className="absolute inset-0 bg-white/10 motion-safe:animate-pulse" aria-hidden />}
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes="(min-width: 1440px) 1344px, 100vw"
        quality={90}
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-opacity duration-500 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

/** Same shape as a slide (kicker, two-line title, body) so nothing jumps when the data arrives. */
function HeroSkeleton() {
  const { t } = useLocale();
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t.loading}
      className="relative h-72 overflow-hidden rounded-3xl bg-surface shadow-card sm:h-80 lg:h-96"
    >
      <div className="absolute inset-x-0 bottom-0 flex max-w-2xl flex-col gap-3 p-6 pb-14 lg:px-24 lg:pb-14">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-8 w-4/5 lg:h-10" />
        <Skeleton className="h-8 w-3/5 lg:h-10" />
        <Skeleton className="mt-1 h-4 w-full opacity-70" />
        <Skeleton className="h-4 w-2/3 opacity-70" />
      </div>
    </div>
  );
}

function HeroSlide({ s, priority }: { s: Slide; priority: boolean }) {
  const { t } = useLocale();
  const img = HERO_IMAGES[s.id];
  const Icon = s.theme.icon;
  return (
    <Link href={s.href} className={`relative flex h-72 flex-col justify-end overflow-hidden bg-linear-to-br p-6 text-white sm:h-80 lg:h-96 lg:px-24 lg:py-10 ${s.theme.bg}`}>
      {img ? (
        <>
          <HeroPhoto src={img} priority={priority} />
          {/* Shade only where the text sits (bottom-left), so the rest of the photo stays bright. */}
          <span className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-black/80 via-black/35 to-transparent" aria-hidden />
          <span className="absolute inset-y-0 left-0 w-full bg-linear-to-r from-black/45 via-black/15 to-transparent lg:w-2/3" aria-hidden />
        </>
      ) : (
        <>
          {/* Illustration: soft rings + oversized category icon. */}
          <span className="absolute -top-24 -right-16 size-96 rounded-full bg-white/8" aria-hidden />
          <span className="absolute -right-4 -bottom-28 size-72 rounded-full bg-white/6" aria-hidden />
          <Icon aria-hidden strokeWidth={1.25} className="absolute top-6 right-6 size-28 text-white/20 sm:size-40 lg:top-10 lg:right-16 lg:size-56" />
          <span className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" aria-hidden />
        </>
      )}
      <span className="relative flex max-w-2xl flex-col items-start gap-2.5 pb-8 [text-shadow:0_1px_3px_rgb(0_0_0/0.45)] lg:pb-4">
        <span className="rounded-full bg-white/20 px-3 py-1 text-meta font-semibold backdrop-blur-sm">{s.kicker}</span>
        <span className="text-page leading-tight font-bold text-balance lg:text-display">{s.title}</span>
        <span className="line-clamp-2 text-body text-white/90">{s.body}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-meta text-white/80">{s.meta}</span>
          <span className="inline-flex items-center gap-1.5 text-body font-semibold underline-offset-4 group-hover:underline">
            {t.learnMore}
            <ArrowRight aria-hidden size={18} />
          </span>
        </span>
      </span>
    </Link>
  );
}

/**
 * Major events and news. Up to 5 slides: upcoming events and non-alert announcements
 * (the alert already runs in the red ticker above).
 */
export function HomeHero({ news, events }: { news?: CsAnnouncementView[]; events?: CsPostView[] }) {
  const { t, tx, locale } = useLocale();

  if (!news || !events) {
    return <HeroSkeleton />;
  }

  const eventSlides: Slide[] = events.slice(0, 2).map((e) => {
    const when = e.event ? formatDateParts(e.event.start, locale) : null;
    return {
      id: e.id,
      kicker: t.kickerEvent,
      title: e.title,
      body: e.body,
      meta: [when && `${when.weekday} ${when.day} ${when.month} · ${when.time}`, e.event?.place, e.event && fmt(t.going, { n: e.event.goingCount })]
        .filter(Boolean)
        .join(" · "),
      href: `/community/posts/${e.id}`,
      theme: EVENT_THEME,
    };
  });
  const newsSlides: Slide[] = news
    .filter((n) => n.level !== "ALERT")
    .slice(0, 3)
    .map((n) => ({
      id: n.id,
      kicker: t.kickerAnnouncement,
      title: tx(n.title),
      body: tx(n.body),
      meta: shortDate(n.validFrom, locale),
      href: `/announcements/${n.id}`,
      theme: CATEGORY_THEME[n.category] ?? DEFAULT_THEME,
    }));

  // Interleave so the carousel alternates news and events.
  const slides: Slide[] = [];
  for (let i = 0; i < Math.max(eventSlides.length, newsSlides.length); i++) {
    if (newsSlides[i]) slides.push(newsSlides[i]);
    if (eventSlides[i]) slides.push(eventSlides[i]);
  }

  return <Carousel label={t.heroLabel} slides={slides.map((s, i) => <HeroSlide key={s.id} s={s} priority={i === 0} />)} />;
}
