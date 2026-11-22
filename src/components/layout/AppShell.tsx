"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  ChevronRight,
  FileText,
  House,
  KeyRound,
  Languages,
  LogIn,
  MapPin,
  Palette,
  Siren,
  User as UserIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { CountBadge, Sheet } from "@/components/ui";
import type { City, EmergencyHotline } from "@/types";

// ---------- SOS sheet context: any screen can open it ----------

const SosContext = createContext<{ openSos: () => void } | null>(null);

export function useSos() {
  const ctx = useContext(SosContext);
  if (!ctx) throw new Error("useSos must be used inside <AppShell>");
  return ctx;
}

type NavItem = { href: string; icon: LucideIcon; label: keyof Dictionary };

/** Bottom tabs on phones (max 5). */
const TABS: NavItem[] = [
  { href: "/", icon: House, label: "navHome" },
  { href: "/reports", icon: FileText, label: "navReports" },
  { href: "/lost-found", icon: KeyRound, label: "navLostFound" },
  { href: "/community", icon: Users, label: "navCommunity" },
  { href: "/me", icon: UserIcon, label: "navMe" },
];

/** Desktop sidebar: room for every feature. */
const SIDEBAR: NavItem[] = [
  { href: "/", icon: House, label: "navHome" },
  { href: "/reports", icon: FileText, label: "navReports" },
  { href: "/lost-found", icon: KeyRound, label: "navLostFound" },
  { href: "/services", icon: Building2, label: "navServices" },
  { href: "/community", icon: Users, label: "navCommunity" },
  { href: "/notifications", icon: Bell, label: "notifications" },
  { href: "/me", icon: UserIcon, label: "navMe" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/**
 * Layout for every citizen screen (wired in src/app/(app)/layout.tsx):
 * - phone: compact blue header, bottom tabs, floating SOS
 * - desktop (lg+): left sidebar with all features and SOS, content beside it
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [sosOpen, setSosOpen] = useState(false);
  const openSos = useCallback(() => setSosOpen(true), []);
  const closeSos = useCallback(() => setSosOpen(false), []);
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.unreadCount().then((n) => alive && setUnread(n));
    return () => {
      alive = false;
    };
  }, [user]);

  return (
    <SosContext.Provider value={{ openSos }}>
      <div className="flex min-h-dvh flex-1">
        <Sidebar onSos={openSos} unread={user ? unread : 0} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader unread={user ? unread : 0} />
          {/* Bottom padding keeps content clear of the fixed tabs + SOS on phones. */}
          <div className="flex-1 pb-36 lg:pb-12">{children}</div>
        </div>
      </div>
      <BottomTabs onSos={openSos} />
      {sosOpen && <SosSheet onClose={closeSos} />}
    </SosContext.Provider>
  );
}

/** Max-width content column. Use as the root of every screen. */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-6xl px-4 pt-5 lg:px-10 lg:pt-10 ${className}`}>{children}</main>;
}

// ---------- Language toggle: one language at a time ----------

export function LanguageToggle({ variant = "light", compact = false }: { variant?: "light" | "dark"; compact?: boolean }) {
  const { t, locale, setLocale } = useLocale();
  const next = locale === "km" ? "en" : "km";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      lang={next}
      className={`flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold ${
        variant === "dark" ? "text-white hover:bg-white/10" : "text-ink hover:bg-sand-deep"
      }`}
    >
      <Languages aria-hidden size={18} />
      {compact ? t.langSwitchShort : t.langSwitch}
    </button>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  const { t } = useLocale();
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={t.appName}>
      <span
        className={`flex size-9 flex-none items-center justify-center rounded-xl text-[13px] font-extrabold ${
          dark ? "bg-white text-primary" : "bg-primary text-white"
        }`}
      >
        CV
      </span>
      <span className={`text-[17px] font-bold ${dark ? "text-white" : "text-ink"}`}>{t.appName}</span>
    </Link>
  );
}

// ---------- Phone header ----------

function MobileHeader({ unread }: { unread: number }) {
  const { t } = useLocale();
  const { user, ready } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-primary text-white shadow-raised lg:hidden">
      <div className="flex min-h-14 items-center gap-1 py-1.5 pr-2 pl-4">
        <div className="flex-1">
          <Logo dark />
        </div>
        <LanguageToggle variant="dark" compact />
        {ready && user && (
          <Link
            href="/notifications"
            className="relative flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
            aria-label={`${t.notifications} (${unread})`}
          >
            <Bell aria-hidden size={22} />
            <span className="absolute top-1 right-0.5">
              <CountBadge count={unread} />
            </span>
          </Link>
        )}
        {ready && !user && (
          <Link href="/login" className="flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-primary">
            <LogIn aria-hidden size={16} />
            {t.login}
          </Link>
        )}
      </div>
    </header>
  );
}

// ---------- Desktop sidebar ----------

function Sidebar({ onSos, unread }: { onSos: () => void; unread: number }) {
  const { t, tx } = useLocale();
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const city = useUserCity();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 flex-none flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 pt-6 pb-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label={t.appName}>
        {SIDEBAR.map((n) => {
          const active = isActive(pathname, n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold ${
                active ? "bg-primary-tint text-primary" : "text-ink hover:bg-sand"
              }`}
            >
              <Icon aria-hidden size={20} className={active ? "" : "text-ink-muted"} />
              <span className="flex-1">{t[n.label]}</span>
              {n.href === "/notifications" && <CountBadge count={unread} />}
            </Link>
          );
        })}
        {process.env.NODE_ENV !== "production" && (
          <Link
            href="/design"
            className={`mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold ${
              isActive(pathname, "/design") ? "bg-primary-tint text-primary" : "text-ink-muted hover:bg-sand"
            }`}
          >
            <Palette aria-hidden size={18} />
            UI kit
          </Link>
        )}
      </nav>

      <div className="flex flex-col gap-3 border-t border-line p-4">
        <button
          type="button"
          onClick={onSos}
          className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-danger font-bold text-white shadow-sos hover:bg-danger-ink"
        >
          <Siren aria-hidden size={20} />
          SOS · {t.tileEmergency}
        </button>
        <LanguageToggle />
        {ready && user ? (
          <Link href="/me" className="flex items-center gap-3 rounded-xl p-2 hover:bg-sand">
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-primary-tint text-sm font-bold text-primary">
              {user.fullName.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user.fullName}</span>
              {city && (
                <span className="flex items-center gap-1 truncate text-xs text-ink-muted">
                  <MapPin aria-hidden size={12} />
                  {tx(city.name)}
                </span>
              )}
            </span>
            <ChevronRight aria-hidden size={16} className="text-ink-muted" />
          </Link>
        ) : (
          ready && (
            <Link
              href="/login"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary ring-1 ring-primary/35 ring-inset hover:bg-primary-tint"
            >
              <LogIn aria-hidden size={16} />
              {t.login}
            </Link>
          )
        )}
      </div>
    </aside>
  );
}

/** The signed-in user's city (khan), or null. */
export function useUserCity(): City | null {
  const { user } = useAuth();
  const [city, setCity] = useState<City | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.getCities(user.provinceId).then((cs) => alive && setCity(cs.find((c) => c.id === user.cityId) ?? null));
    return () => {
      alive = false;
    };
  }, [user]);
  return user ? city : null;
}

// ---------- Phone bottom tabs + SOS ----------

function BottomTabs({ onSos }: { onSos: () => void }) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
      {/* SOS floats bottom-right in the thumb zone, outside the tab row. */}
      <div className="pointer-events-none flex justify-end px-4 pb-3">
        <button
          type="button"
          onClick={onSos}
          aria-label={`SOS ${t.tileEmergency}`}
          className="pointer-events-auto flex h-14 items-center gap-2 rounded-2xl bg-danger px-4 text-white shadow-sos ring-4 ring-white"
        >
          <Siren aria-hidden size={20} />
          <span className="flex flex-col items-start">
            <span className="text-base leading-tight font-extrabold">SOS</span>
            {locale === "km" && <span className="text-[11px] leading-tight font-semibold">{t.sos}</span>}
          </span>
        </button>
      </div>
      <nav
        className="grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label={t.appName}
      >
        {TABS.map((n) => {
          const active = isActive(pathname, n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 ${active ? "text-primary" : "text-ink-muted"}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-primary-tint" : ""}`}>
                <Icon aria-hidden size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="max-w-full truncate px-0.5 text-[11px] leading-tight font-semibold">{t[n.label]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ---------- SOS sheet: call first ----------

function SosSheet({ onClose }: { onClose: () => void }) {
  const { t, tx } = useLocale();
  const [hotlines, setHotlines] = useState<EmergencyHotline[]>([]);
  useEffect(() => {
    api.getEmergencyHotlines().then(setHotlines);
  }, []);

  return (
    <Sheet title={t.sosTitle} tone="danger" icon={<Siren aria-hidden size={22} />} onClose={onClose}>
      <div>
        <p className="text-lg font-bold">{t.sosCallFirst}</p>
        <p className="text-sm text-ink-muted">{t.sosCallFirstHint}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {hotlines.map((h) => (
          <a
            key={h.id}
            href={`tel:${h.number}`}
            className="flex min-h-20 items-center gap-4 rounded-2xl bg-danger px-5 text-white shadow-card hover:bg-danger-ink"
          >
            <span className="text-3xl font-extrabold tabular-nums">{h.number}</span>
            <span className="text-lg font-semibold">{tx(h.name)}</span>
          </a>
        ))}
      </div>
      <Link
        href="/sos"
        onClick={onClose}
        className="flex min-h-16 items-center justify-between gap-2 rounded-2xl bg-surface px-4 text-danger shadow-card ring-1 ring-danger/30 ring-inset"
      >
        <span>
          <span className="block font-bold">{t.sosSendInApp}</span>
          <span className="block text-xs text-ink-muted">{t.sosSendInAppHint}</span>
        </span>
        <ChevronRight aria-hidden size={20} />
      </Link>
    </Sheet>
  );
}
