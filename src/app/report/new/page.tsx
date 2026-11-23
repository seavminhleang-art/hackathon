"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { GR_CATEGORIES } from "@/lib/mock/gov-reporting";
import { ReportHeader } from "@/features/gov-reporting/ReportHeader";
import { ReportMobileNav } from "@/features/gov-reporting/ReportMobileNav";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { GrCategory } from "@/types";

const categoryIcons: Record<GrCategory, string> = {
  ROAD_TRANSPORT: "🚧",
  WASTE: "▤",
  DRAINAGE_FLOODING: "≋",
  PUBLIC_LIGHTING: "♧",
  WATER: "◉",
  PUBLIC_INFRASTRUCTURE: "▦",
  OTHER: "···",
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;
}

export default function NewReportPage() {
  const { t, tx } = useLocale();
  const [category, setCategory] = useState<GrCategory>("DRAINAGE_FLOODING");
  const [photoCount, setPhotoCount] = useState(0);
  const [descriptionLength, setDescriptionLength] = useState(0);

  function updatePhotoCount(event: ChangeEvent<HTMLInputElement>) {
    setPhotoCount(Math.min(event.target.files?.length ?? 0, 5));
  }

  return (
    <>
      <ReportHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-8">
        <div className="mb-5 hidden text-xs text-ink-muted sm:block">
          <Link href="/">{t.homeNav}</Link><span className="mx-2">›</span><span>{t.reportBreadcrumb}</span><span className="mx-2">›</span><span className="text-ink">{t.newReport}</span>
        </div>
        <div className="mb-6 max-w-3xl">
          <p className="mb-1 text-xs text-ink-muted sm:hidden">{t.reportBreadcrumb}　›　{t.newReport}</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.newReport}</h1>
          <p className="mt-1 text-sm text-ink-muted sm:text-base">{t.reportIntro}</p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Panel>
              <div className="mb-3">
                <h2 className="font-bold">{t.stepCategory}</h2>
                <p className="text-xs text-ink-muted">{t.chooseOne}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {GR_CATEGORIES.map((item) => {
                  const selected = category === item.id;
                  return <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={selected}
                    className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary-tint text-primary ring-1 ring-primary" : "border-line hover:border-primary/50 hover:bg-sand"}`}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-tint text-lg text-primary">{categoryIcons[item.id]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{tx(item.label)}</span>
                      <span className="block text-xs text-ink-muted">{tx(item.examples)}</span>
                    </span>
                    {selected && <span className="text-sm font-bold text-primary">✓</span>}
                  </button>;
                })}
              </div>
            </Panel>

            <Panel>
              <div className="mb-4">
                <h2 className="font-bold">{t.stepDetails}</h2>
              </div>
              <label className="mb-4 block">
                <span className="mb-1.5 block text-sm font-semibold">{t.reportTitle}<span className="text-danger"> *</span></span>
                <input maxLength={120} placeholder={t.titlePlaceholder} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm placeholder:text-ink-muted/70 focus:border-primary focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t.reportDescription}<span className="text-danger"> *</span></span>
                <textarea maxLength={2000} rows={4} placeholder={t.descriptionPlaceholder} onChange={(event) => setDescriptionLength(event.target.value.length)} className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-sm placeholder:text-ink-muted/70 focus:border-primary focus:outline-none" />
                <span className="mt-1 block text-right text-xs text-ink-muted">{descriptionLength} / 2000</span>
              </label>
            </Panel>

            <Panel>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div><h2 className="font-bold">{t.stepPhotos}</h2><p className="text-xs text-ink-muted">{t.upToFivePhotos}</p></div>
                <span className="text-sm font-semibold text-ink-muted">{photoCount} / 5</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {Array.from({ length: photoCount }).map((_, i) => <div key={i} className="relative aspect-square rounded-xl bg-sand" aria-label={`Photo ${i + 1}`}><span className="absolute inset-0 grid place-items-center text-2xl text-ink-muted">▧</span></div>)}
                {photoCount < 5 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-primary/50 bg-primary-tint/40 text-center text-xs font-semibold text-primary hover:bg-primary-tint">
                  <span className="text-2xl">＋</span><span>{t.fromGallery}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={updatePhotoCount} />
                </label>}
                {photoCount < 5 && <button type="button" className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-primary/50 text-center text-xs font-semibold text-primary hover:bg-primary-tint/40"><span className="text-2xl">⌖</span><span>{t.takePhoto}</span></button>}
              </div>
              <p className="mt-2 text-xs text-ink-muted">{t.photoHint}</p>
            </Panel>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <div><h2 className="font-bold">{t.stepLocation}</h2><p className="text-xs text-ink-muted">{t.location}</p></div>
                <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-semibold text-primary">●　{t.adjustPin}</span>
              </div>
              <div className="relative h-52 overflow-hidden rounded-xl border border-line bg-[#e9e5d9] sm:h-56">
                <div className="absolute inset-0 opacity-80" aria-hidden="true">
                  <div className="absolute inset-x-0 top-[18%] h-2 bg-white" />
                  <div className="absolute inset-x-0 top-[49%] h-3 -rotate-3 bg-white" />
                  <div className="absolute inset-x-0 bottom-[17%] h-2 bg-white" />
                  <div className="absolute inset-y-0 left-[25%] w-2 bg-white" />
                  <div className="absolute inset-y-0 left-[58%] w-2 bg-white" />
                  <div className="absolute inset-y-0 right-[17%] w-2 bg-white" />
                  <div className="absolute -bottom-7 -left-8 h-16 w-[120%] rotate-[-12deg] bg-blue-200/80" />
                  <div className="absolute left-3 top-3 h-10 w-14 border border-[#d7d0c1] bg-[#f5f1e6]" />
                  <div className="absolute right-4 top-8 h-12 w-16 border border-[#d7d0c1] bg-[#f5f1e6]" />
                  <div className="absolute bottom-8 left-[37%] h-11 w-20 border border-[#d7d0c1] bg-[#f5f1e6]" />
                </div>
                <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary bg-white/70 text-2xl text-primary shadow">📍</span>
                <span className="absolute bottom-2 right-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] text-ink-muted">{t.mapPlaceholder}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary">⌖</span>
                <div><p className="text-sm font-semibold">{t.sampleAddress}</p><p className="text-xs text-ink-muted">Tuol Tompoung · Phnom Penh</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="rounded-xl border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-tint">⌖　{t.useGps}</button>
                <Link href="/report/location" className="rounded-xl border border-primary px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-primary-tint">◎　{t.adjustPin}</Link>
              </div>
            </Panel>

            <div className="rounded-2xl border border-primary/15 bg-primary-tint/60 p-4 text-sm text-ink-muted">
              <span className="mr-2 text-primary">◉</span>{t.privacyHint}
            </div>
            <div className="hidden rounded-2xl border border-line bg-white p-3 lg:block">
              <Link href="/report/duplicates" className="block w-full rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white shadow-sm hover:bg-primary-hover">➤　{t.submitReport}</Link>
              <button type="button" className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-tint">{t.saveDraft}</button>
            </div>
          </aside>
        </div>

        <div className="mt-5 grid gap-2 lg:hidden">
          <Link href="/report/duplicates" className="rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white shadow-sm">➤　{t.submitReport}</Link>
          <button type="button" className="rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-semibold text-primary">{t.saveDraft}</button>
        </div>
      </main>

      <ReportMobileNav />
    </>
  );
}
