"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GR_CATEGORIES } from "@/lib/mock/gov-reporting";
import { NavIcon, ReportHeader } from "@/features/gov-reporting/ReportHeader";
import { ReportMobileNav } from "@/features/gov-reporting/ReportMobileNav";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { GrCategory, I18nText } from "@/types";

type PublicStatus = "IN_PROGRESS" | "RESOLVED" | "CLOSED";
const publicRows: {
  code: string;
  category: GrCategory;
  title: I18nText;
  description: I18nText;
  location: I18nText;
  status: PublicStatus;
  date: string;
  supporters: number;
}[] = [
  {
    code: "RPT-2026-00001", category: "DRAINAGE_FLOODING",
    title: { km: "លូស្ទះដោយសារសំរាម", en: "Drain blocked by rubbish" },
    description: { km: "ទឹកឡើងលឿនពេលមានភ្លៀង ហើយរារាំងអ្នកដំណើរ។", en: "Water rises quickly when it rains and blocks the sidewalk." },
    location: { km: "ទួលគោក · ភ្នំពេញ", en: "Tuol Kouk · Phnom Penh" },
    status: "CLOSED", date: "12 Nov 2026", supporters: 18,
  },
  {
    code: "RPT-2026-00009", category: "DRAINAGE_FLOODING",
    title: { km: "គម្របលូបាក់នៅលើចិញ្ចើមផ្លូវ", en: "Broken drain cover on sidewalk" },
    description: { km: "មានរន្ធចំហនៅលើចិញ្ចើមផ្លូវ ដែលអាចបង្កគ្រោះថ្នាក់។", en: "An open hole on the sidewalk could be dangerous." },
    location: { km: "ទួលទំពូង · ភ្នំពេញ", en: "Toul Tompoung · Phnom Penh" },
    status: "RESOLVED", date: "21 Nov 2026", supporters: 7,
  },
  {
    code: "RPT-2026-00012", category: "ROAD_TRANSPORT",
    title: { km: "រណ្តៅជ្រៅនៅលើផ្លូវ", en: "Deep pothole on the road" },
    description: { km: "រណ្តៅជ្រៅនៅគន្លងខាងស្តាំ បង្កគ្រោះថ្នាក់ដល់ម៉ូតូ។", en: "A deep hole in the right lane is a risk for motorbikes." },
    location: { km: "ចំការមន · ភ្នំពេញ", en: "Chamkar Mon · Phnom Penh" },
    status: "IN_PROGRESS", date: "20 Nov 2026", supporters: 14,
  },
];

const publicStatusStyle: Record<PublicStatus, string> = {
  IN_PROGRESS: "bg-progress-tint text-progress-ink",
  RESOLVED: "bg-fixed-tint text-fixed",
  CLOSED: "bg-fixed-tint text-fixed",
};

export default function PublicReportsPage() {
  const { t, tx } = useLocale();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GrCategory | "ALL">("ALL");
  const filtered = useMemo(() => publicRows.filter((report) => {
    const q = search.trim().toLocaleLowerCase();
    const matchesQuery = !q || [tx(report.title), tx(report.description), tx(report.location), report.code].some((value) => value.toLocaleLowerCase().includes(q));
    return matchesQuery && (selectedCategory === "ALL" || report.category === selectedCategory);
  }), [search, selectedCategory, tx]);

  const statusLabels: Record<PublicStatus, string> = {
    IN_PROGRESS: t.reportInProgressStatus,
    RESOLVED: t.reportResolvedStatus,
    CLOSED: t.reportClosedStatus,
  };

  return (
    <>
      <ReportHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-7">
        <div className="mb-4 hidden text-xs text-ink-muted sm:block"><Link href="/">{t.homeNav}</Link><span className="mx-2">›</span><span className="font-semibold text-ink">{t.publicReports}</span></div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.publicReports}</h1><p className="mt-1 text-sm text-ink-muted">{t.publicReportsIntro}</p></div>
          <Link href="/report/new" className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:flex"><span className="text-lg leading-none">+</span>{t.newReport}</Link>
        </div>

        <section className="mb-4 rounded-2xl border border-line bg-white p-3 shadow-sm sm:p-4">
          <label className="flex h-11 items-center gap-3 rounded-xl border border-line bg-sand px-3 text-ink-muted">
            <svg aria-hidden="true" className="size-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchReports} className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted" />
            <span className="hidden rounded-lg border border-line bg-white px-2 py-1 text-[10px] text-ink-muted sm:block">⌕　{t.searchReports}</span>
          </label>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setSelectedCategory("ALL")} className={selectedCategory === "ALL" ? "shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white" : "shrink-0 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-muted"}>{t.allCategories}</button>
              {GR_CATEGORIES.map((category) => <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={selectedCategory === category.id ? "shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white" : "shrink-0 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-muted"}>{tx(category.label)}</button>)}
            </div>
            <p className="mb-3 text-xs text-ink-muted">{filtered.length} {t.resultsFound}</p>
            <div className="space-y-3">
              {filtered.map((report) => {
                const category = GR_CATEGORIES.find((item) => item.id === report.category)!;
                return <article key={report.code} className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-tint text-xl text-primary">{category.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><h2 className="font-bold"><Link href={"/reports/" + report.code} className="hover:text-primary">{tx(report.title)}</Link></h2><p className="mt-0.5 text-xs text-ink-muted">{tx(category.label)} · {report.code}</p></div>
                        <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold " + publicStatusStyle[report.status]}><span aria-hidden="true">{report.status === "CLOSED" ? "✓" : "↗"}</span>{statusLabels[report.status]}</span>
                      </div>
                      <p className="mt-2 text-sm text-ink-muted">{tx(report.description)}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1"><NavIcon name="location" className="size-4"/>{tx(report.location)}</span>
                        <span>{t.locationApproximate}</span><span>{report.date}</span><span>♡ {report.supporters} {t.reportSupporters}</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Link href={"/reports/" + report.code} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-tint">{t.viewReport}</Link>
                        <Link href={"/reports/" + report.code} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover">♡　{t.supportReport}</Link>
                      </div>
                    </div>
                  </div>
                </article>;
              })}
              {filtered.length === 0 && <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-ink-muted">{t.errGeneric}</div>}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between"><h2 className="font-bold">{t.nearestFirst}</h2><NavIcon name="location" className="size-5 text-primary" /></div>
              <div className="relative mt-3 h-52 overflow-hidden rounded-xl bg-[#e9e5d9]" aria-hidden="true">
                <div className="absolute inset-x-0 top-1/4 h-2 -rotate-3 bg-white"/><div className="absolute inset-x-0 top-2/3 h-2 bg-white"/><div className="absolute inset-y-0 left-1/3 w-2 bg-white"/><div className="absolute inset-y-0 right-1/4 w-2 bg-white"/>
                <span className="absolute left-[30%] top-[40%] grid size-7 place-items-center rounded-full bg-primary text-xs text-white shadow">1</span>
                <span className="absolute left-[65%] top-[57%] grid size-7 place-items-center rounded-full bg-primary text-xs text-white shadow">2</span>
                <span className="absolute left-[48%] top-[24%] grid size-7 place-items-center rounded-full bg-progress text-xs font-bold text-progress-ink shadow">3</span>
                <span className="absolute bottom-2 right-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] text-ink-muted">{t.mapPlaceholder}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t.locationPrivate}</p>
            </section>
            <Link href="/me/reports" className="block rounded-2xl border border-primary/20 bg-primary-tint/60 p-4 text-sm font-semibold text-primary hover:bg-primary-tint">{t.myReportsTitle}　→</Link>
          </aside>
        </div>
        <Link href="/report/new" className="fixed bottom-20 right-4 z-10 grid size-12 place-items-center rounded-full bg-primary text-2xl font-light text-white shadow-lg sm:hidden" aria-label={t.newReport}>+</Link>
      </main>
      <ReportMobileNav />
    </>
  );
}
