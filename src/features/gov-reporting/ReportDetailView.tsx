"use client";

import Link from "next/link";
import { GR_CATEGORIES } from "@/lib/mock/gov-reporting";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Status = "SUBMITTED" | "NEED_MORE_INFO" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";

const samples: Record<string, {
  title: { km: string; en: string };
  description: { km: string; en: string };
  category: (typeof GR_CATEGORIES)[number]["id"];
  status: Status;
  location: { km: string; en: string };
  department?: { km: string; en: string };
  date: string;
  photos: number;
}> = {
  "RPT-2026-00031": { title: { km: "លូស្ទះដោយសារសំរាម", en: "Drain blocked by rubbish" }, description: { km: "សំណាញ់លូត្រូវបានសំរាមបិទជិតទាំងស្រុង។ ទឹកឡើងលឿនពេលមានភ្លៀង។", en: "The drain grate is fully covered with rubbish. Water rises quickly when it rains." }, category: "DRAINAGE_FLOODING", status: "SUBMITTED", location: { km: "ផ្លូវ ២៧១ · ទួលទំពូង", en: "St 271 · Toul Tompoung" }, date: "22 Nov 2026 · 09:12", photos: 3 },
  "RPT-2026-00024": { title: { km: "ភ្លើងបំភ្លឺផ្លូវខូច", en: "Streetlight out" }, description: { km: "ភ្លើងបំភ្លឺមិនដំណើរការនៅប្លុកនេះអស់រយៈពេលមួយសប្តាហ៍។", en: "Streetlights on this block have been out for a week." }, category: "PUBLIC_LIGHTING", status: "NEED_MORE_INFO", location: { km: "ផ្លូវ ៣១០ · បឹងកេងកង", en: "St 310 · Boeung Keng Kang" }, date: "20 Nov 2026 · 14:30", photos: 1 },
  "RPT-2026-00018": { title: { km: "សំរាមហៀរនៅជិតផ្សារ", en: "Overflowing rubbish near market" }, description: { km: "សំរាមកកកុញ និងរាលដាលលើចិញ្ចើមផ្លូវ។", en: "Rubbish is piling up and spreading across the sidewalk." }, category: "WASTE", status: "ASSIGNED", location: { km: "ផ្សារថ្មី · ដូនពេញ", en: "Central Market · Doun Penh" }, department: { km: "ផ្នែកគ្រប់គ្រងសំរាម", en: "Waste Management" }, date: "18 Nov 2026 · 08:45", photos: 2 },
  "RPT-2026-00012": { title: { km: "រណ្តៅនៅលើផ្លូវ", en: "Pothole on the road" }, description: { km: "រណ្តៅជ្រៅនៅគន្លងខាងស្តាំ។ ម៉ូតូពីរគ្រឿងស្ទើរតែដួលនៅព្រឹកនេះ។", en: "A deep hole is in the right lane. Two motorbikes nearly fell this morning." }, category: "ROAD_TRANSPORT", status: "IN_PROGRESS", location: { km: "ផ្លូវ ២៧១ · ចំការមន", en: "St 271 · Chamkar Mon" }, department: { km: "ផ្នែកថែទាំផ្លូវ", en: "Road Maintenance" }, date: "12 Nov 2026 · 07:45", photos: 2 },
  "RPT-2026-00009": { title: { km: "គម្របលូបាក់នៅលើចិញ្ចើមផ្លូវ", en: "Drain cover broken on sidewalk" }, description: { km: "គម្របលូបាក់ និងមានរន្ធចំហនៅលើចិញ្ចើមផ្លូវ។", en: "The drain cover is broken, leaving an open hole on the sidewalk." }, category: "DRAINAGE_FLOODING", status: "RESOLVED", location: { km: "ផ្លូវ ២៧១ · ទួលទំពូង", en: "St 271 · Toul Tompoung" }, department: { km: "ផ្នែកលូ និងបង្ហូរទឹក", en: "Drainage Department" }, date: "6 Nov 2026 · 10:20", photos: 2 },
  "RPT-2026-00002": { title: { km: "សំឡេងរំខាន", en: "Noise complaint" }, description: { km: "សំឡេងរំខាននៅតំបន់លំនៅដ្ឋាន។", en: "Noise in a residential area." }, category: "OTHER", status: "REJECTED", location: { km: "ទួលគោក", en: "Tuol Kouk" }, date: "28 Oct 2026 · 11:10", photos: 0 },
  "RPT-2026-00001": { title: { km: "លូស្ទះដោយសារសំរាម ទឹកឡើងដល់កជើង", en: "Drain blocked by rubbish, water up to the ankles" }, description: { km: "សំណាញ់លូត្រូវបានថង់ប្លាស្ទិកបិទជិត។ ទឹកឡើងលឿនពេលភ្លៀង។", en: "The drain grate is covered with plastic bags. Water rises quickly when it rains." }, category: "DRAINAGE_FLOODING", status: "CLOSED", location: { km: "ផ្លូវ ២៨៩ ជិតផ្សារទួលគោក", en: "St 289 near Toul Kork market" }, department: { km: "ផ្នែកលូ និងបង្ហូរទឹក", en: "Drainage Department" }, date: "10 Nov 2026 · 07:12", photos: 2 },
};

const statusClass: Record<Status, string> = {
  SUBMITTED: "bg-reported-tint text-reported-ink",
  NEED_MORE_INFO: "bg-reported-tint text-reported-ink",
  ASSIGNED: "bg-progress-tint text-progress-ink",
  IN_PROGRESS: "bg-progress-tint text-progress-ink",
  RESOLVED: "bg-fixed-tint text-fixed",
  CLOSED: "bg-fixed-tint text-fixed",
  REJECTED: "bg-rejected/10 text-rejected",
};

export function ReportDetailView({ code }: { code: string }) {
  const { t, tx, locale } = useLocale();
  const report = samples[code] ?? samples["RPT-2026-00031"];
  const category = GR_CATEGORIES.find((item) => item.id === report.category)!;
  const statusLabel: Record<Status, string> = {
    SUBMITTED: t.reportSubmittedStatus,
    NEED_MORE_INFO: t.reportNeedsInfoStatus,
    ASSIGNED: t.reportAssignedStatus,
    IN_PROGRESS: t.reportInProgressStatus,
    RESOLVED: t.reportResolvedStatus,
    CLOSED: t.reportClosedStatus,
    REJECTED: t.reportRejectedStatus,
  };
  const timeline = [
    { label: t.reportCreated, time: report.date, complete: true },
    ...(report.status !== "SUBMITTED" ? [{ label: t.adminReviewStarted, time: "Next day · 08:30", complete: true }] : []),
    ...(["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(report.status) ? [{ label: t.assignedToDepartment, time: "20 Nov · 09:00", complete: true }] : []),
    ...(["IN_PROGRESS", "RESOLVED", "CLOSED"].includes(report.status) ? [{ label: t.workStarted, time: "21 Nov · 08:00", complete: true }] : []),
    ...(["RESOLVED", "CLOSED"].includes(report.status) ? [{ label: t.workResolved, time: "22 Nov · 15:40", complete: true }] : []),
    ...(report.status === "CLOSED" ? [{ label: t.reportVerified, time: "23 Nov · 09:00", complete: true }] : []),
  ];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-7">
      <div className="mb-4 hidden text-xs text-ink-muted sm:block"><Link href="/">{t.homeNav}</Link><span className="mx-2">›</span><Link href="/me/reports">{t.myReportsTitle}</Link><span className="mx-2">›</span><span className="font-semibold text-ink">{code}</span></div>
      <Link href="/me/reports" className="mb-3 inline-flex text-xs font-semibold text-primary sm:hidden">←　{t.myReportsTitle}</Link>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-tint text-xl text-primary">{category.icon}</span>
                <div><h1 className="text-xl font-bold leading-snug sm:text-2xl">{tx(report.title)}</h1><p className="mt-1 text-xs text-ink-muted">{code} · {tx(category.label)} · {report.date}</p></div>
              </div>
              <span className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold " + statusClass[report.status]}><span aria-hidden="true">◷</span>{statusLabel[report.status]}</span>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <h2 className="text-sm font-bold">{t.reportDescriptionLabel}</h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{tx(report.description)}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-bold">{t.reportPhotos}</h2><p className="text-xs text-ink-muted">{report.photos} photos</p></div><span className="text-lg text-ink-muted">▧</span></div>
            {report.photos > 0 ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: report.photos }).map((_, index) => <div key={index} className="aspect-square rounded-xl border border-line bg-gradient-to-br from-[#e9e5d9] to-[#faf8f4]" aria-label={`Evidence photo ${index + 1}`}><span className="grid h-full place-items-center text-2xl text-ink-muted">▧</span></div>)}</div> : <p className="mt-3 text-sm text-ink-muted">—</p>}
          </section>

          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-bold">{t.reportTimeline}</h2>
            <ol className="mt-4">
              {timeline.map((item, index) => (
                <li key={item.label} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < timeline.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-line" aria-hidden="true" />}
                  <span className="relative z-[1] grid size-6 shrink-0 place-items-center rounded-full bg-fixed-tint text-xs font-bold text-fixed">✓</span>
                  <div><p className="text-sm font-semibold">{item.label}</p><p className="text-xs text-ink-muted">{item.time}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-bold">{t.reportComments}</h2>
            {report.status === "NEED_MORE_INFO" ? <div className="mt-3 rounded-xl bg-sand p-3"><p className="text-xs font-semibold text-ink-muted">Admin · 20 Nov</p><p className="mt-1 text-sm">{locale === "km" ? "សូមបញ្ជាក់លេខបង្គោលភ្លើង និងផ្ញើរូបថតបន្ថែម។" : "Please confirm the light pole number and add another photo."}</p></div> : <div className="mt-3 rounded-xl bg-sand p-3"><p className="text-xs font-semibold text-ink-muted">{t.reporterLabel} · {report.date}</p><p className="mt-1 text-sm">{locale === "km" ? "សូមជួយពិនិត្យបញ្ហានេះផង។" : "Please help check this issue."}</p></div>}
            <div className="mt-3 flex gap-2"><input disabled placeholder={t.addComment} className="min-w-0 flex-1 rounded-xl border border-line bg-sand px-3 py-2 text-sm" /><button disabled type="button" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white opacity-60">➤</button></div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <h2 className="font-bold">{t.location}</h2>
            <div className="relative mt-3 h-36 overflow-hidden rounded-xl bg-[#e9e5d9]" aria-hidden="true">
              <div className="absolute inset-x-0 top-1/3 h-2 rotate-3 bg-white" /><div className="absolute inset-x-0 top-2/3 h-2 bg-white" /><div className="absolute inset-y-0 left-1/3 w-2 bg-white" /><div className="absolute inset-y-0 right-1/3 w-2 bg-white" /><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-primary">📍</span>
            </div>
            <p className="mt-3 text-sm font-semibold">{tx(report.location)}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.locationPrivate}</p>
          </section>
          {report.department && <section className="rounded-2xl border border-line bg-white p-4 shadow-sm"><h2 className="text-xs text-ink-muted">{t.department}</h2><p className="mt-1 font-semibold">{tx(report.department)}</p></section>}
          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="grid gap-2">
              {report.status === "SUBMITTED" && <><button type="button" className="rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary">✎　{t.editReport}</button><button type="button" className="rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-ink-muted">⊘　{t.cancelReport}</button></>}
              {report.status === "NEED_MORE_INFO" && <button type="button" className="rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white">{t.respond}</button>}
              {["ASSIGNED", "IN_PROGRESS"].includes(report.status) && <><button type="button" className="rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white">♡　{t.supportThisReport}</button><button type="button" className="rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary">✓　{t.stillExists}</button></>}
              {["RESOLVED", "CLOSED"].includes(report.status) && <button type="button" className="rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary">↻　{t.requestReopen}</button>}
              {report.status === "REJECTED" && <p className="rounded-xl bg-rejected/10 p-3 text-xs text-rejected">{locale === "km" ? "បានបិទរបាយការណ៍នេះ។" : "This report has been closed."}</p>}
            </div>
            <Link href="/me/reports" className="mt-2 block rounded-xl px-3 py-2 text-center text-sm font-semibold text-ink-muted hover:bg-sand">{t.myReportsTitle}</Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
