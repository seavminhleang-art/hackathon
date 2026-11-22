"use client";

import Link from "next/link";
import { ReportHeader } from "@/features/gov-reporting/ReportHeader";
import { ReportMobileNav } from "@/features/gov-reporting/ReportMobileNav";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const candidates = [
  {
    code: "RPT-2026-00027",
    title: { km: "លូស្ទះជិតផ្ទះលេខ ១២០", en: "Blocked drain near house no. 120" },
    detail: { km: "ផ្លូវ ២៧១ · លូ និងទឹកជំនន់ · រូបថត ៣", en: "St 271 · Drainage & flooding · 3 photos" },
    status: { km: "កំពុងដោះស្រាយ", en: "Assigned" },
    distance: "40 m",
    supporters: 18,
  },
  {
    code: "RPT-2026-00019",
    title: { km: "ទឹកជន់លើផ្លូវ ២៧១", en: "Street 271 flooding" },
    detail: { km: "ផ្លូវ ២៧១ · លូ និងទឹកជំនន់ · រូបថត ២", en: "St 271 · Drainage & flooding · 2 photos" },
    status: { km: "កំពុងដំណើរការ", en: "In progress" },
    distance: "85 m",
    supporters: 7,
  },
];

export default function ReportDuplicatesPage() {
  const { t, tx } = useLocale();
  return (
    <>
      <ReportHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-7">
        <div className="mb-4 hidden text-xs text-ink-muted sm:block">
          <Link href="/">{t.homeNav}</Link><span className="mx-2">›</span><Link href="/report/new">{t.reportBreadcrumb}</Link><span className="mx-2">›</span><span className="font-semibold text-ink">{t.potentialMatches}</span>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary-tint/70 p-4 sm:flex sm:items-center sm:gap-3 sm:p-5">
          <span className="mb-2 grid size-9 place-items-center rounded-lg bg-white text-primary sm:mb-0">▢</span>
          <div><h1 className="font-bold text-ink">{t.potentialMatches}</h1><p className="text-sm text-ink-muted">{t.duplicateIntro}</p></div>
        </div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div><h2 className="font-bold">{t.similarReports}</h2><p className="text-xs text-ink-muted">Existing reports</p></div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-muted">{candidates.length} nearby</span>
            </div>
            <div className="space-y-3">
              {candidates.map((item) => (
                <article key={item.code} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-tint text-lg text-primary">≋</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h3 className="font-bold">{tx(item.title)}</h3>
                        <span className="text-xs font-semibold text-ink-muted">{item.distance} {t.away}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">{tx(item.detail)} · {item.code}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-progress-tint px-2.5 py-1 text-[11px] font-semibold text-progress-ink"><span aria-hidden="true">◷</span>{tx(item.status)}</span>
                        <span className="text-xs text-ink-muted">👍 {item.supporters} {t.supporters}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" className="rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">♡　{t.supportReport}</button>
                    <button type="button" className="rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary-tint">◉　{t.viewReport}</button>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">ⓘ　{t.duplicateTip}</p>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <h2 className="font-bold">{t.yourDraft}</h2>
              <div className="mt-3 rounded-xl bg-sand p-3">
                <div className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary">≋</span>
                  <div><p className="text-sm font-semibold">Drainage &amp; Flooding · 3 photos</p><p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">⌖　St 271, Tuol Tompoung</p></div>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <Link href="/report/submitted" className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary px-3 py-3 text-center text-sm font-semibold text-primary hover:bg-primary-tint">➤　{t.differentProblem}</Link>
              <Link href="/report/new" className="mt-2 block rounded-xl px-3 py-2 text-center text-sm font-semibold text-ink-muted hover:bg-sand">{t.backAndEdit}</Link>
            </section>
          </aside>
        </div>
      </main>
      <ReportMobileNav />
    </>
  );
}
