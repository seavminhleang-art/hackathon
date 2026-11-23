"use client";

import Link from "next/link";
import { ReportHeader } from "@/features/gov-reporting/ReportHeader";
import { ReportMobileNav } from "@/features/gov-reporting/ReportMobileNav";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function ReportSubmittedPage() {
  const { t } = useLocale();
  return (
    <>
      <ReportHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 pb-28 pt-9 text-center sm:px-6 sm:pb-12 sm:pt-14">
        <span className="grid size-16 place-items-center rounded-full bg-fixed-tint text-fixed">
          <svg aria-hidden="true" className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>
        </span>
        <h1 className="mt-4 text-xl font-bold sm:text-2xl">{t.submittedTitle}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t.queuedForReview}</p>

        <section className="mt-5 w-full rounded-2xl border border-line bg-white p-4 text-left shadow-sm sm:p-5">
          <p className="text-xs text-ink-muted">{t.reportCode}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xl font-bold tracking-wide">RPT-2026-00031</p><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-reported-tint px-2.5 py-1 text-[11px] font-semibold text-reported-ink">◷　{t.submittedTitle}</span></div>
            <button type="button" className="rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-tint">▢　{t.copy}</button>
          </div>
        </section>

        <section className="mt-4 w-full overflow-hidden rounded-2xl border border-line bg-white text-left shadow-sm">
          <div className="border-b border-line px-4 py-3"><h2 className="font-bold">{t.nextSteps}</h2></div>
          <ol className="divide-y divide-line">
            {[t.adminChecks, t.departmentAssign, t.updatesNotify].map((step, index) => (
              <li key={step} className="flex items-start gap-3 px-4 py-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-bold text-primary">{index + 1}</span>
                <p className="pt-0.5 text-sm text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
          <Link href="/me/reports" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover">↗　{t.trackReport}</Link>
          <Link href="/" className="flex items-center justify-center gap-2 rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-tint">⌂　{t.backHome}</Link>
        </div>
      </main>
      <ReportMobileNav />
    </>
  );
}
