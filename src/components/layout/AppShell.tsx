"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  House,
  KeyRound,
  Languages,
  LogIn,
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
  { href: "/dashboard", icon: UserIcon, label: "navMe" },
];

/** Guests and signed-in residents share the same Home navigation. */
function primaryTabs(): NavItem[] {
  return TABS;
}

/**
 * Renders with the current path. On routes whose URL is only known at request time
 * (e.g. /community/posts/[id]) the path isn't available while prerendering, so the
 * fallback renders with no active item and the real one streams in.
 */
function WithPath({ render }: { render: (pathname: string) => ReactNode }) {
  return (
    <Suspense fallback={render("")}>
      <PathReader render={render} />
    </Suspense>
  );
}
function PathReader({ render }: { render: (pathname: string) => ReactNode }) {
  return render(usePathname());
}

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

/**
 * Layout for every citizen screen (wired in src/app/(app)/layout.tsx):
 * - phone: blue navbar (logo, language, bell), bottom tabs, floating SOS
 * - desktop (lg+): same navbar plus 4 feature links, avatar and SOS; no bottom tabs
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
      <WithPath
        render={(pathname) => {
          const authPage = pathname === "/login" || pathname === "/register";
          // Login / register are focused flows with their own header; everything else gets the shell.
          const standalonePage = authPage;
          return (
            <>
              {!standalonePage && <Navbar onSos={openSos} unread={user ? unread : 0} />}
              {/* Auth flows provide their own navigation; citizen pages share the Home navbar. */}
              <div className={`flex-1 ${standalonePage ? "pb-0" : "pb-36 lg:pb-16"}`}>{children}</div>
              {!standalonePage && <BottomTabs onSos={openSos} />}
              {sosOpen && <SosSheet onClose={closeSos} />}
            </>
          );
        }}
      />
    </SosContext.Provider>
  );
}

/** Max-width content column. Use as the root of every screen. */
export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto w-full max-w-[1440px] px-4 pt-5 sm:px-6 lg:px-12 lg:pt-10 2xl:px-16 ${className}`}
    >
      {children}
    </main>
  );
}

// ---------- Language toggle: one language at a time ----------

export function LanguageToggle({
  variant = "light",
  compact = false,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const { t, locale, setLocale } = useLocale();
  const next = locale === "km" ? "en" : "km";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      lang={next}
      className={`flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-meta font-semibold ${
        variant === "dark"
          ? "text-white hover:bg-white/10"
          : "text-ink hover:bg-sand-deep"
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
        className={`flex size-9 flex-none items-center justify-center rounded-xl text-meta font-extrabold ${
          dark ? "bg-white text-primary" : "bg-primary text-white"
        }`}
      >
        CV
      </span>
      <span
        className={`text-row font-bold ${dark ? "text-white" : "text-ink"}`}
      >
        {t.appName}
      </span>
    </Link>
  );
}

// ---------- Navbar (phone + desktop) ----------

/**
 * One blue bar for every screen size. Kept deliberately short:
 * phone = logo · language · bell; desktop adds the 4 feature links, avatar and SOS.
 * Everything else (services, settings, notifications list) lives on its own page.
 */
function Navbar({ onSos, unread }: { onSos: () => void; unread: number }) {
  const { t } = useLocale();
  const { user, ready } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-primary text-white shadow-raised">
      <div className="mx-auto flex min-h-14 max-w-[1440px] items-center gap-1 py-1.5 pr-2 pl-4 sm:px-6 lg:min-h-16 lg:gap-2 lg:px-12 2xl:px-16">
        <Logo dark />

        <nav
          className="ml-8 hidden h-16 items-stretch gap-1 lg:flex"
          aria-label={t.appName}
        >
          <WithPath
            render={(pathname) =>
              primaryTabs().slice(0, 4).map((n) => {
                const active = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center px-3.5 text-body font-semibold transition-colors ${
                      active ? "text-white" : "text-white/75 hover:text-white"
                    }`}
                  >
                    {t[n.label]}
                    {active && (
                      <span
                        className="absolute inset-x-3.5 bottom-0 h-[3px] rounded-t-full bg-gold"
                        aria-hidden
                      />
                    )}
                  </Link>
                );
              })
            }
          />
        </nav>

        <div className="flex-1" />

        <LanguageToggle variant="dark" compact />

        {ready && user && (
          <>
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
            <Link href="/dashboard/profile" aria-label={`${t.accountProfile}: ${user.fullName}`} className="ml-1 flex min-h-11 items-center gap-2 rounded-xl px-2 text-white hover:bg-white/10">
                <span className="flex size-9 items-center justify-center rounded-full bg-white text-body font-bold text-primary ring-2 ring-white/30">
                  {user.fullName.slice(0, 1)}
                </span>
                <span className="hidden max-w-36 truncate text-meta font-semibold sm:block">{user.fullName}</span>
                <ChevronDown aria-hidden size={16} />
            </Link>
          </>
        )}
        {ready && !user && (
          <Link
            href="/login"
            className="flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-meta font-semibold text-primary hover:bg-primary-tint"
          >
            <LogIn aria-hidden size={18} />
            {t.login}
          </Link>
        )}

        <button
          type="button"
          onClick={onSos}
          className="ml-2 hidden min-h-11 items-center gap-2 rounded-xl bg-danger px-4 text-body font-bold text-white shadow-sos ring-2 ring-white/90 hover:bg-danger-ink lg:flex"
        >
          <Siren aria-hidden size={20} />
          SOS
        </button>
      </div>
    </header>
  );
}

/** The signed-in user's city (khan), or null. */
export function useUserCity(): City | null {
  const { user } = useAuth();
  const [city, setCity] = useState<City | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .getCities(user.provinceId)
      .then(
        (cs) => alive && setCity(cs.find((c) => c.id === user.cityId) ?? null),
      );
    return () => {
      alive = false;
    };
  }, [user]);
  return user ? city : null;
}

// ---------- Phone bottom tabs + SOS ----------

function BottomTabs({ onSos }: { onSos: () => void }) {
  const { t, locale } = useLocale();
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
            <span className="text-row leading-tight font-extrabold">SOS</span>
            {locale === "km" && (
              <span className="text-caption leading-tight font-semibold">
                {t.sos}
              </span>
            )}
          </span>
        </button>
      </div>
      <nav
        className="grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label={t.appName}
      >
        <WithPath
          render={(pathname) =>
            primaryTabs().map((n) => {
              const active = isActive(pathname, n.href);
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-[68px] flex-col items-center justify-center gap-1 ${active ? "text-primary" : "text-ink-muted"}`}
                >
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-primary-tint" : ""}`}
                  >
                    <Icon
                      aria-hidden
                      size={22}
                      strokeWidth={active ? 2.4 : 2}
                    />
                  </span>
                  <span className="max-w-full truncate px-0.5 text-caption leading-tight font-semibold">
                    {t[n.label]}
                  </span>
                </Link>
              );
            })
          }
        />
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
    <Sheet
      title={t.sosTitle}
      tone="danger"
      icon={<Siren aria-hidden size={22} />}
      onClose={onClose}
    >
      <div>
        <p className="text-title font-bold">{t.sosCallFirst}</p>
        <p className="text-body text-ink-muted">{t.sosCallFirstHint}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {hotlines.map((h) => (
          <a
            key={h.id}
            href={`tel:${h.number}`}
            className="flex min-h-20 items-center gap-4 rounded-2xl bg-danger px-5 text-white shadow-card hover:bg-danger-ink"
          >
            <span className="text-display font-extrabold tabular-nums">
              {h.number}
            </span>
            <span className="text-title font-semibold">{tx(h.name)}</span>
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
          <span className="block text-meta text-ink-muted">
            {t.sosSendInAppHint}
          </span>
        </span>
        <ChevronRight aria-hidden size={20} />
      </Link>
    </Sheet>
  );
}
