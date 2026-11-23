"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, BookOpen, Building2, ClipboardList, Clock3, Heart, House, Landmark, LogOut, MapPin, MessageCircle, Search, Settings, TriangleAlert, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LanguageToggle, useUserCity } from "@/components/layout/AppShell";
import { CountBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t, tx } = useLocale();
  const city = useUserCity();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let alive = true;
    api.unreadCount().then((count) => alive && setUnread(count));
    return () => { alive = false; };
  }, [user]);

  return <div className="min-h-[100dvh] bg-sand lg:flex">
    <aside className="hidden h-screen w-60 flex-none flex-col overflow-y-auto bg-primary px-3 py-5 text-white lg:sticky lg:top-0 lg:flex xl:w-64">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2" aria-label={t.appName}>
        <span className="flex size-11 items-center justify-center rounded-xl bg-white text-meta font-extrabold text-primary">CV</span>
        <span className="text-row font-bold leading-tight">{t.appName}</span>
      </Link>
      <nav className="flex flex-col gap-1" aria-label={t.dashboardFeatures}>
        <SideLink href="/dashboard" icon={House} label={t.navDashboard} active={pathname === "/dashboard"} />
        <SideLink href="/dashboard/lost-found" icon={Search} label={t.navLostFound} active={pathname.startsWith("/dashboard/lost-found")} />
        <SideLink href="/dashboard/announcements" icon={TriangleAlert} label={t.dashboardEmergency} active={pathname.startsWith("/dashboard/announcements")} />
        <SideLink href="/dashboard#reports-by-status" icon={Landmark} label={t.governmentReporting} />
        <div className="my-3 border-t border-white/20" />
        <SideLink href="/dashboard/activity" icon={Clock3} label={t.navMyActivity} active={pathname === "/dashboard/activity"} />
        <SideLink href="/dashboard#reports-by-status" icon={ClipboardList} label={t.navMyReports} />
        <SideLink href="/notifications" icon={Bell} label={t.notifications} badge={unread} />
        <SideLink href="/dashboard/community" icon={MessageCircle} label={t.navMessages} active={pathname.startsWith("/dashboard/community")} />
        <SideLink href="/dashboard/lost-found" icon={Heart} label={t.navFavorites} />
        <div className="my-3 border-t border-white/20" />
        <SideLink href="/dashboard/announcements" icon={TriangleAlert} label={t.navPublicAlerts} active={pathname.startsWith("/dashboard/announcements")} />
        <SideLink href="/dashboard/services" icon={Building2} label={t.navServices} active={pathname.startsWith("/dashboard/services")} />
        <SideLink href="/dashboard/guides" icon={BookOpen} label={t.navHelpCenter} active={pathname.startsWith("/dashboard/guides")} />
        <SideLink href="/dashboard/profile" icon={Settings} label={t.navSettings} active={pathname === "/dashboard/profile"} />
      </nav>
      {user && <div id="profile" className="mt-auto rounded-2xl border border-white/20 bg-white/10 p-3"><div className="flex items-center gap-2.5"><Link href="/dashboard/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg"><span className="flex size-9 flex-none items-center justify-center rounded-full bg-white/20 text-meta font-bold">{user.fullName.slice(0, 1)}</span><span className="min-w-0"><b className="block truncate text-meta">{user.fullName}</b><span className="text-caption text-white/75">{t.roleCITIZEN}</span></span></Link><button type="button" aria-label={t.logout} onClick={() => void logout()} className="flex size-9 items-center justify-center rounded-lg hover:bg-white/10"><LogOut aria-hidden size={17} /></button></div></div>}
    </aside>

    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 shadow-card backdrop-blur sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><Link href="/" className="flex size-9 flex-none items-center justify-center rounded-lg text-ink-muted hover:bg-sand hover:text-primary" aria-label={t.navHome} title={t.navHome}><ArrowLeft aria-hidden size={19} /></Link><Link href="/dashboard" className="flex size-9 items-center justify-center rounded-xl bg-primary text-caption font-extrabold text-white lg:hidden" aria-label={t.navDashboard}>CV</Link><span className="hidden items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-meta text-ink-muted sm:flex"><MapPin aria-hidden size={16} className="text-primary" />{city ? tx(city.name) : t.chooseArea}</span></div>
        <div className="flex flex-none items-center gap-2"><LanguageToggle compact /><Link href="/notifications" aria-label={`${t.notifications} (${unread})`} className="relative flex size-11 items-center justify-center rounded-xl text-ink hover:bg-sand"><Bell aria-hidden size={20} /><span className="absolute top-0.5 right-0.5"><CountBadge count={unread} /></span></Link></div>
      </header>
      <nav className="flex gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-2 lg:hidden" aria-label={t.dashboardFeatures}><MobileLink href="/dashboard" label={t.navDashboard} /><MobileLink href="/dashboard/activity" label={t.navMyActivity} /><MobileLink href="/dashboard/lost-found" label={t.navLostFound} /><MobileLink href="/dashboard/announcements" label={t.dashboardEmergency} /><MobileLink href="/dashboard#reports-by-status" label={t.governmentReporting} /><MobileLink href="/dashboard/services" label={t.navServices} /></nav>
      {children}
    </div>
  </div>;
}

function SideLink({ href, icon: Icon, label, active = false, badge = 0 }: { href: string; icon: LucideIcon; label: string; active?: boolean; badge?: number }) {
  return <Link href={href} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-meta font-medium transition-colors ${active ? "bg-white/15 text-white shadow-card" : "text-white/90 hover:bg-white/10"}`}><Icon aria-hidden size={18} /><span className="min-w-0 flex-1">{label}</span><CountBadge count={badge} /></Link>;
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="flex min-h-10 flex-none items-center rounded-xl px-3 text-caption font-semibold text-ink-muted hover:bg-sand">{label}</Link>;
}
