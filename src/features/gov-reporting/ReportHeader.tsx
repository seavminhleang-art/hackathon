"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function NavIcon({ name, className = "size-[18px]" }: { name: "home" | "report" | "services" | "location" | "community" | "bell" | "user" | "translate" | "siren"; className?: string }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></>,
    report: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5M10 12h5M10 16h5" /></>,
    services: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1z" /><path d="M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8v1" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0z" /></>,
    translate: <><path d="m5 8 4 4 4-4M9 4v8" /><path d="M3 4h12M6 16h9M9 13l-3 7M12 13l3 7M13 18H8" /></>,
    siren: <><path d="M7 18v-6a5 5 0 0 1 10 0v6" /><path d="M5 21h14M6 18h12M12 2v2M4.2 4.2l1.4 1.4M1.5 12h2M20.5 12h2M18.4 5.6l1.4-1.4" /></>,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function ReportHeader() {
  const { t, locale, setLocale } = useLocale();
  return (
    <header className="sticky top-0 z-20 border-b border-blue-950/15 bg-primary text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link className="flex shrink-0 items-center gap-2.5 font-bold" href="/">
          <span className="grid size-9 place-items-center rounded-xl bg-white text-sm font-black text-primary">CV</span>
          <span className="text-base">{t.appName}</span>
        </Link>
        <nav className="ml-8 hidden h-full flex-1 items-center gap-1 text-sm md:flex" aria-label="Main navigation">
          <Link className="h-full px-3.5 py-[21px] opacity-90 hover:bg-white/5 hover:opacity-100" href="/">{t.homeNav}</Link>
          <Link className="h-full border-b-[3px] border-gold px-3.5 py-[21px] font-semibold" href="/me/reports">{t.reportNav}</Link>
          <a className="h-full px-3.5 py-[21px] opacity-90 hover:bg-white/5 hover:opacity-100" href="#services">{t.servicesNav}</a>
          <a className="h-full px-3.5 py-[21px] opacity-90 hover:bg-white/5 hover:opacity-100" href="#community">{t.communityNav}</a>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setLocale(locale === "km" ? "en" : "km")} className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold hover:bg-white/10" aria-label="Change language">
            <NavIcon name="translate" /><span>EN</span>
          </button>
          <button type="button" className="relative hidden size-10 place-items-center rounded-full bg-white/10 hover:bg-white/15 sm:grid" aria-label={t.notification}><NavIcon name="bell" className="size-5" /><span className="absolute right-2 top-2 size-2.5 rounded-full bg-danger" /></button>
          <button type="button" className="hidden items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 sm:flex"><NavIcon name="user" />{t.login}</button>
          <Link href="/sos" className="flex items-center gap-2 rounded-xl bg-danger px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-danger-ink"><NavIcon name="siren" className="size-5" />SOS</Link>
        </div>
      </div>
    </header>
  );
}
