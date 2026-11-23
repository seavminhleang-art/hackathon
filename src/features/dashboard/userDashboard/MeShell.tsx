"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut, MapPin } from "lucide-react";
import { useUserCity } from "@/components/layout/AppShell";
import { Button, SubNav } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";

/**
 * Top of the "Me" area (/dashboard, /dashboard/activity, /dashboard/profile).
 * Greeting + area + log out, then in-page tabs. The app's shared navbar, bottom tabs
 * and SOS stay around it, like every other screen.
 */
export function MeShell({ children }: { children: ReactNode }) {
  const { t, tx } = useLocale();
  const { user, logout } = useAuth();
  const city = useUserCity();
  const pathname = usePathname();

  return (
    <>
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 sm:px-6 lg:px-12 lg:pt-10 2xl:px-16">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div className="min-w-0">
            <h1 className="text-page leading-tight font-bold lg:text-display">{user ? fmt(t.hello, { name: user.fullName }) : t.navMe}</h1>
            {user && (
              <p className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-meta font-medium text-ink-muted shadow-card">
                <MapPin aria-hidden size={15} className="text-primary" />
                {[user.sangkat, city ? tx(city.name) : null].filter(Boolean).join(", ") || t.chooseArea}
              </p>
            )}
          </div>
          {user && (
            <Button variant="ghost" icon={LogOut} onClick={() => void logout()}>
              {t.logout}
            </Button>
          )}
        </div>
        <SubNav
          active={pathname}
          items={[
            { href: "/dashboard", label: t.dashOverview },
            { href: "/dashboard/activity", label: t.navMyActivity },
            { href: "/dashboard/profile", label: t.accountProfile },
          ]}
        />
      </div>
      {children}
    </>
  );
}
