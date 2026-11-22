"use client";

import Link from "next/link";
import { ReportHeader } from "@/features/gov-reporting/ReportHeader";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function ReportLocationPage() {
  const { t } = useLocale();
  return (
    <>
      <ReportHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-5 sm:px-6 sm:pt-7">
        <div className="mb-4 hidden text-xs text-ink-muted sm:block">
          <Link href="/">{t.homeNav}</Link><span className="mx-2">›</span><Link href="/report/new">{t.reportBreadcrumb}</Link><span className="mx-2">›</span><span className="font-semibold text-ink">{t.chooseLocationTitle}</span>
        </div>
        <div className="mb-5">
          <Link href="/report/new" className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary sm:hidden">← {t.back}</Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.chooseLocationTitle}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.dragMapHint}</p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
          <section className="relative h-[48vh] min-h-80 overflow-hidden rounded-2xl border border-line bg-[#e9e5d9] shadow-sm sm:h-[58vh] lg:h-[62vh]" aria-label="Map location preview">
            <div className="absolute inset-0" aria-hidden="true">
              <div className="absolute inset-x-0 top-[22%] h-2.5 -rotate-2 bg-white" />
              <div className="absolute inset-x-0 top-[54%] h-3 bg-white" />
              <div className="absolute inset-x-0 bottom-[18%] h-2.5 rotate-2 bg-white" />
              <div className="absolute inset-y-0 left-[16%] w-2.5 bg-white" />
              <div className="absolute inset-y-0 left-[38%] w-2.5 bg-white" />
              <div className="absolute inset-y-0 left-[69%] w-2.5 bg-white" />
              <div className="absolute inset-y-0 right-[12%] w-2.5 bg-white" />
              <div className="absolute -bottom-5 -left-6 h-24 w-[115%] rotate-[-11deg] bg-blue-200/80" />
              <div className="absolute left-[4%] top-[7%] h-20 w-[23%] border border-[#d7d0c1] bg-[#f5f1e6]" />
              <div className="absolute left-[43%] top-[7%] h-16 w-[19%] border border-[#d7d0c1] bg-[#f5f1e6]" />
              <div className="absolute right-[4%] top-[29%] h-24 w-[20%] border border-[#d7d0c1] bg-[#f5f1e6]" />
              <div className="absolute bottom-[25%] left-[43%] h-20 w-[21%] border border-[#d7d0c1] bg-[#f5f1e6]" />
            </div>

            <label className="absolute left-3 right-3 top-3 z-10 flex h-12 items-center gap-3 rounded-xl border border-line bg-white px-4 text-sm text-ink-muted shadow-md sm:left-4 sm:right-4 sm:top-4">
              <svg aria-hidden="true" className="size-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input aria-label={t.searchStreet} placeholder={`${t.searchStreet} · Search street or place`} className="w-full bg-transparent outline-none placeholder:text-ink-muted" />
            </label>

            <div className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2">
              <span className="grid size-16 place-items-center rounded-full border border-primary bg-primary/15">
                <span className="grid size-10 -translate-y-1 place-items-center rounded-full rounded-bl-none bg-primary text-xl text-white shadow-lg [transform:rotate(-45deg)]"><span className="[transform:rotate(45deg)]">●</span></span>
              </span>
            </div>
            <div className="absolute bottom-3 left-3 rounded-md bg-ink/85 px-2.5 py-1 text-[11px] font-medium text-white">✣　{t.dragMapHint}</div>
            <span className="absolute bottom-3 right-3 rounded bg-white/85 px-1.5 py-0.5 text-[10px] text-ink-muted">{t.mapPlaceholder}</span>
            <button type="button" className="absolute bottom-12 right-3 grid size-10 place-items-center rounded-xl border border-line bg-white text-lg text-primary shadow-md" aria-label={t.useGps}>⌖</button>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary">⌖</span>
                <div><h2 className="font-bold">{t.sampleAddress}</h2><p className="text-xs text-ink-muted">St 271, Tuol Tompoung, Chamkar Mon</p></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-sand p-2.5"><p className="text-[10px] text-ink-muted">{t.latitude}</p><p className="mt-1 text-xs font-semibold">11.546912</p></div>
                <div className="rounded-xl bg-sand p-2.5"><p className="text-[10px] text-ink-muted">{t.longitude}</p><p className="mt-1 text-xs font-semibold">104.912508</p></div>
                <div className="rounded-xl bg-sand p-2.5"><p className="text-[10px] text-ink-muted">{t.accuracy}</p><p className="mt-1 text-xs font-semibold">±8 m</p></div>
              </div>
              <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary-tint">
                <span aria-hidden="true">⌖</span>{t.useGps}
              </button>
            </section>

            <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <Link href="/report/new" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover">
                <span aria-hidden="true">✓</span>{t.confirmLocation}
              </Link>
              <Link href="/report/new" className="mt-2 block rounded-xl px-4 py-2 text-center text-sm font-semibold text-ink-muted hover:bg-sand">{t.back}</Link>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
