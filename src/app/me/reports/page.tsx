"use client";

import Link from "next/link";
import { ReportHeader } from "@/features/gov-reporting/ReportHeader";
import { ReportMobileNav } from "@/features/gov-reporting/ReportMobileNav";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type ReportStatus = "submitted" | "needs-info" | "assigned" | "in-progress" | "resolved" | "rejected";

const reports: {
  code: string;
  title: { km: string; en: string };
  location: { km: string; en: string };
  status: ReportStatus;
  date: string;
  department?: { km: string; en: string };
  adminQuestion?: { km: string; en: string };
  detail?: { km: string; en: string };
}[] = [
  { code: "RPT-2026-00031", title: { km: "លូស្ទះដោយសារសំរាម", en: "Drain blocked by rubbish" }, location: { km: "ផ្ទះលេខ ១២៣ · ទួលគោក", en: "House 123 · Tuol Kouk" }, status: "submitted", date: "22 Nov · 09:12" },
  { code: "RPT-2026-00024", title: { km: "ភ្លើងបំភ្លឺផ្លូវខូច", en: "Streetlight out" }, location: { km: "ផ្លូវ ៣១០ · បឹងកេងកង", en: "St 310 · Boeung Keng Kang" }, status: "needs-info", date: "20 Nov", adminQuestion: { km: "សូមបញ្ជាក់លេខបង្គោលភ្លើង។", en: "Please confirm the pole number." } },
  { code: "RPT-2026-00018", title: { km: "សំរាមហៀរនៅជិតផ្សារ", en: "Overflowing rubbish near market" }, location: { km: "ផ្សារថ្មី · ដូនពេញ", en: "Central Market · Doun Penh" }, status: "assigned", date: "18 Nov", department: { km: "ផ្នែកគ្រប់គ្រងសំរាម", en: "Waste Management" } },
  { code: "RPT-2026-00012", title: { km: "រណ្តៅនៅលើផ្លូវ", en: "Pothole on the road" }, location: { km: "ផ្លូវ ២៧១ · ចំការមន", en: "St 271 · Chamkar Mon" }, status: "in-progress", date: "12 Nov", department: { km: "ផ្នែកថែទាំផ្លូវ", en: "Road Maintenance" } },
  { code: "RPT-2026-00009", title: { km: "គម្របលូបាក់នៅលើចិញ្ចើមផ្លូវ", en: "Drain cover broken on sidewalk" }, location: { km: "ផ្លូវ ២៧១ · ទួលទំពូង", en: "St 271 · Toul Tompoung" }, status: "resolved", date: "6 Nov", detail: { km: "រង់ចាំការផ្ទៀងផ្ទាត់ពីអ្នកគ្រប់គ្រង។", en: "Waiting for admin verification." } },
  { code: "RPT-2026-00002", title: { km: "សំឡេងរំខាន", en: "Noise complaint" }, location: { km: "ទួលគោក", en: "Tuol Kouk" }, status: "rejected", date: "28 Oct", detail: { km: "មិនមែនជាបញ្ហាសេវាក្រុងទេ។", en: "Not a city service issue." } },
];

const statusStyles: Record<ReportStatus, string> = {
  submitted: "bg-reported-tint text-reported-ink",
  "needs-info": "bg-reported-tint text-reported-ink",
  assigned: "bg-progress-tint text-progress-ink",
  "in-progress": "bg-progress-tint text-progress-ink",
  resolved: "bg-fixed-tint text-fixed",
  rejected: "bg-rejected/10 text-rejected",
};
const statusSymbols: Record<ReportStatus, string> = { submitted: "◷", "needs-info": "!", assigned: "↗", "in-progress": "↗", resolved: "✓", rejected: "⊘" };

export default function MyReportsPage() {
  const { t, tx, locale } = useLocale();
  const labels: Record<ReportStatus, string> = {
    submitted: t.reportSubmittedStatus,
    "needs-info": t.reportNeedsInfoStatus,
    assigned: t.reportAssignedStatus,
    "in-progress": t.reportInProgressStatus,
    resolved: t.reportResolvedStatus,
    rejected: t.reportRejectedStatus,
  };

  return (
    <>
      <ReportHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-7">
        <div className="mb-4 hidden text-xs text-ink-muted sm:block">
          <Link href="/">{t.homeNav}</Link><span className="mx-2">›</span><span className="font-semibold text-ink">{t.myReportsTitle}</span>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.myReportsTitle}</h1><p className="mt-1 text-sm text-ink-muted">{t.myReportsSubtitle}</p></div>
          <div className="flex items-center gap-2">
            <Link href="/reports" className="hidden items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-tint sm:flex">{t.browsePublicReports}</Link>
            <Link href="/report/new" className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:flex"><span className="text-lg leading-none">+</span>{t.addNewReport}</Link>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">{t.allReports} · 6</button>
              <button type="button" className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-muted">{t.activeReports} · 4</button>
              <button type="button" className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-muted">{t.completedReports} · 2</button>
            </div>
            <div className="space-y-3">
              {reports.map((report) => (
                <article key={report.code} className={report.status === "needs-info" ? "rounded-2xl border border-reported/40 bg-white p-4 shadow-sm" : "rounded-2xl border border-line bg-white p-4 shadow-sm"}>
                  <div className="flex items-start gap-3">
                    <span className={report.status === "needs-info" ? "grid size-10 shrink-0 place-items-center rounded-xl bg-reported-tint text-lg text-reported-ink" : "grid size-10 shrink-0 place-items-center rounded-xl bg-primary-tint text-lg text-primary"} aria-hidden="true">▤</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-1">
                        <div><h2 className="font-bold"><Link href={"/reports/" + report.code} className="hover:text-primary">{tx(report.title)}</Link></h2><p className="mt-0.5 text-xs text-ink-muted">{tx(report.location)} · <Link href={"/reports/" + report.code} className="hover:text-primary">{report.code}</Link> · {report.date}</p></div>
                        <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold " + statusStyles[report.status]}><span aria-hidden="true">{statusSymbols[report.status]}</span>{labels[report.status]}</span>
                      </div>
                      {report.department && <p className="mt-2 text-xs text-ink-muted">{t.department}: {tx(report.department)}</p>}
                      {report.detail && <p className="mt-2 text-xs text-ink-muted">{tx(report.detail)}</p>}
                      {report.status === "needs-info" && report.adminQuestion && <div className="mt-3 rounded-xl bg-sand px-3 py-2.5 text-xs leading-relaxed"><strong>{t.requestedByAdmin}</strong> {tx(report.adminQuestion)}</div>}
                      {report.status === "resolved" && <p className="mt-2 text-xs text-ink-muted">{t.awaitingVerification}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {report.status === "submitted" && <><button type="button" className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary">✎　{t.editReport}</button><button type="button" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted">⊘　{t.cancelReport}</button></>}
                        {report.status === "needs-info" && <button type="button" className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white sm:w-auto">▤　{t.respond}</button>}
                        {report.status === "resolved" && <button type="button" className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary">↻　{t.requestReopen}</button>}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <h2 className="font-bold">{t.reportStatus}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-sand p-3"><p className="text-2xl font-bold">6</p><p className="text-xs text-ink-muted">{t.total}</p></div>
                <div className="rounded-xl bg-progress-tint p-3 text-progress-ink"><p className="text-2xl font-bold">4</p><p className="text-xs">{t.activeReports}</p></div>
                <div className="rounded-xl bg-reported-tint p-3 text-reported-ink"><p className="text-2xl font-bold">1</p><p className="text-xs">{t.needsReply}</p></div>
                <div className="rounded-xl bg-fixed-tint p-3 text-fixed"><p className="text-2xl font-bold">1</p><p className="text-xs">{t.toVerify}</p></div>
              </div>
            </section>
            <section className="rounded-2xl border border-reported/30 bg-reported-tint/60 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-reported-ink"><span className="mt-0.5">!</span><span>{t.needsReply}</span></p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{locale === "km" ? "មានរបាយការណ៍ ១ ត្រូវការការឆ្លើយតបរបស់អ្នក មុនពេលពិនិត្យបន្ត។" : "1 report needs your reply before review can continue."}</p>
            </section>
            <p className="rounded-2xl border border-line bg-white p-4 text-xs leading-relaxed text-ink-muted">ⓘ　{locale === "km" ? "អ្នកអាចកែសម្រួល ឬបោះបង់របាយការណ៍បាន លុះត្រាតែមិនទាន់បញ្ជូនទៅផ្នែក។" : "You can edit or cancel a report only before it is assigned."}</p>
          </aside>
        </div>
        <Link href="/report/new" className="fixed bottom-20 right-4 z-10 grid size-12 place-items-center rounded-full bg-primary text-2xl font-light text-white shadow-lg sm:hidden" aria-label={t.addNewReport}>+</Link>
      </main>
      <ReportMobileNav />
    </>
  );
}
