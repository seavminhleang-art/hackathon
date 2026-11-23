"use client";

import Link from "next/link";
import { CheckCircle, ChevronRight, Clock3, KeyRound, Landmark, MapPin, Phone, Search, TriangleAlert, type LucideIcon } from "lucide-react";
import { PageContainer, useUserCity } from "@/components/layout/AppShell";
import { Card, EmptyState, IconTile, ListRow, SkeletonRows, StatusChip, type Accent, type ChipStatus, Thumb } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { shortDate } from "@/lib/i18n/format";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CATEGORY_ICON, coverPhoto } from "@/features/gov-reporting/meta";
import { useHomeData } from "@/features/home/useHomeData";

export function UserDashboard() {
  const { user, ready } = useAuth();
  const { data } = useHomeData(user, ready);
  const { t, tx, locale } = useLocale();
  const city = useUserCity();

  return <PageContainer className="flex flex-col gap-6 pb-10 lg:gap-8">
    <div className="grid items-stretch gap-4 xl:grid-cols-3">
      <FeaturePanel title={t.lostFoundRecent} hint={t.lostFoundRecentHint} icon={Search} accent="primary" href="/lost-found" listLabel={t.dashboardRecentPosts} stats={[[data ? String(data.stats.lostFoundPosts) : "–", t.lfItemsListed], [data ? String(data.stats.matchedPosts) : "–", t.lfPossibleMatches], [data ? String(data.stats.returned) : "–", t.statReturned]]}>
        {!data ? <SkeletonRows rows={3} /> : data.lostFound.length ? data.lostFound.slice(0, 3).map((post) => <ListRow key={post.id} icon={post.kind === "FOUND" ? KeyRound : Search} accent={post.kind === "FOUND" ? "gold" : "reported"} media={<Thumb src={post.photoUrls?.[0]} icon={post.kind === "FOUND" ? KeyRound : Search} accent={post.kind === "FOUND" ? "gold" : "reported"} size="sm" />} href="/lost-found" title={post.title} subtitle={<span className="flex items-center gap-1"><MapPin aria-hidden size={13} />{post.place} · {shortDate(post.createdAt, locale)}</span>} meta={<StatusChip status={post.kind} />} />) : <EmptyState icon={Search} title={t.emptyNearTitle} body={t.emptyNearBody} />}
      </FeaturePanel>

      <FeaturePanel title={t.dashboardEmergencyResponse} hint={t.dashboardEmergencyHint} icon={TriangleAlert} accent="danger" href="/announcements" listLabel={t.dashboardActivePublicAlerts} stats={[[data ? String(data.alerts.length) : "–", t.dashboardActiveAlerts], [data ? String(data.stats.myEmergencyReports) : "–", t.navMyReports], [data ? String(data.stats.myEmergencyInProgress) : "–", t.statWorking]]}>
        {!data ? <SkeletonRows rows={3} /> : data.alerts.length ? data.alerts.slice(0, 3).map((alert) => <ListRow key={alert.id} icon={TriangleAlert} accent="danger" href={`/announcements/${alert.id}`} title={tx(alert.title)} subtitle={<span className="line-clamp-1">{tx(alert.body)}</span>} meta={<span className="text-caption text-ink-muted">{shortDate(alert.validFrom, locale)}</span>} />) : <EmptyState icon={TriangleAlert} title={t.dashboardNoAlerts} body={t.dashboardNoAlertsHint} />}
      </FeaturePanel>

      <FeaturePanel id="government-reporting" title={t.governmentReporting} hint={t.latestReportsHint} icon={Landmark} accent="gold" href="/me/reports" listLabel={t.dashboardRecentReports} stats={[[data ? String(data.stats.myGovReports) : "–", t.navMyReports], [data ? String(data.stats.myGovInProgress) : "–", t.statWorking], [data ? String(data.stats.myGovResolved) : "–", t.statFixed]]}>
        {!data ? <SkeletonRows rows={3} /> : data.latestReports.length ? data.latestReports.slice(0, 3).map((report) => <ListRow key={report.id} icon={CATEGORY_ICON[report.category]} accent="primary" media={<Thumb src={coverPhoto(report)} icon={CATEGORY_ICON[report.category]} accent="primary" size="sm" />} href="/me/reports" title={report.title} subtitle={<span className="flex items-center gap-1"><MapPin aria-hidden size={13} />{report.addressHint}</span>} meta={<><span className="text-caption text-ink-muted">{shortDate(report.updatedAt, locale)}</span><StatusChip status={report.status as ChipStatus} /></>} />) : <EmptyState icon={Landmark} title={t.emptyNearTitle} body={t.emptyNearBody} />}
      </FeaturePanel>
    </div>

    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.2fr_1.15fr]">
      <ReportsByStatus data={data} />
      <ReportsMap city={city ? tx(city.name) : t.chooseArea} reports={data?.latestReports} />
      <ActivityPanel data={data} locale={locale} />
    </div>
  </PageContainer>;
}

function FeaturePanel({ id, title, hint, icon, accent, href, listLabel, stats, children }: { id?: string; title: string; hint: string; icon: LucideIcon; accent: Accent; href: string; listLabel: string; stats: [string, string][]; children: React.ReactNode }) {
  const { t } = useLocale();
  return <section id={id} className="min-w-0 scroll-mt-20"><Card className="h-full min-w-0"><div className="flex items-start gap-3"><IconTile icon={icon} accent={accent} /><div className="min-w-0 flex-1"><Link href={href} className="text-row font-bold text-ink hover:text-primary-ink">{title}</Link><p className="mt-0.5 text-meta leading-snug text-ink-muted">{hint}</p></div><Link href={href} aria-label={`${t.seeAll}: ${title}`} className="flex size-10 flex-none items-center justify-center rounded-xl text-primary-ink hover:bg-primary-tint"><ChevronRight aria-hidden size={19} /></Link></div><div className="my-3 grid grid-cols-3 gap-2">{stats.map(([value, label]) => <div key={label} className="rounded-xl bg-sand px-2 py-2 text-center"><b className="block text-title leading-tight tabular-nums text-ink">{value}</b><span className="text-caption text-ink-muted">{label}</span></div>)}</div><p className="mb-1 text-caption font-semibold text-ink-muted">{listLabel}</p><Card padded={false} as="ul" className="overflow-hidden">{children}</Card><Link href={href} className="mt-3 flex min-h-10 items-center justify-center gap-1 rounded-xl bg-primary-tint px-3 text-meta font-semibold text-primary-ink hover:bg-primary hover:text-white">{t.seeAll}<ChevronRight aria-hidden size={16} /></Link></Card></section>;
}

function ReportsByStatus({ data }: { data: ReturnType<typeof useHomeData>["data"] }) {
  const { t } = useLocale();
  const rows = [
    { key: "SUBMITTED" as const, label: t.stSUBMITTED, color: "var(--color-primary)" },
    { key: "IN_PROGRESS" as const, label: t.stIN_PROGRESS, color: "var(--color-reported)" },
    { key: "RESOLVED" as const, label: t.stRESOLVED, color: "var(--color-fixed)" },
    { key: "CLOSED" as const, label: t.stCLOSED, color: "var(--color-progress)" },
    { key: "REJECTED" as const, label: t.stREJECTED, color: "var(--color-gold)" },
  ];
  const counts = rows.map((row) => data?.stats.reportStatuses[row.key] ?? 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  let cursor = 0;
  const gradient = rows.map((row, index) => { const start = total ? cursor / total * 100 : 0; cursor += counts[index]; const end = total ? cursor / total * 100 : 0; return counts[index] ? `${row.color} ${start}% ${end}%` : null; }).filter(Boolean).join(", ");
  return <Card className="min-w-0"><h2 className="text-title font-bold text-primary-ink">{t.dashboardReportsByStatus}</h2><div className="mt-4 flex items-center gap-3"><div role="img" aria-label={`${total} ${t.dashboardPublicReports}`} className="flex size-28 flex-none items-center justify-center rounded-full p-3" style={{ background: total ? `conic-gradient(${gradient})` : "var(--color-sand-deep)" }}><div className="flex size-full flex-col items-center justify-center rounded-full bg-surface"><b className="text-title leading-none tabular-nums">{total}</b><span className="text-caption text-ink-muted">{t.dashTotal}</span></div></div><ul className="min-w-0 flex-1 space-y-1.5">{rows.map((row, index) => <li key={row.key} className="flex items-center gap-1.5 text-caption"><i className="size-2 flex-none rounded-full" style={{ backgroundColor: row.color }} /><span className="min-w-0 flex-1 truncate text-ink-muted">{row.label}</span><b className="tabular-nums">{counts[index]}</b></li>)}</ul></div></Card>;
}

function ReportsMap({ city, reports }: { city: string; reports: NonNullable<ReturnType<typeof useHomeData>["data"]>["latestReports"] | undefined }) {
  const { t } = useLocale();
  const visible = reports ?? [];
  const latitudes = visible.map((report) => report.location.lat);
  const longitudes = visible.map((report) => report.location.lng);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes), minLng = Math.min(...longitudes), maxLng = Math.max(...longitudes);
  return <Card className="min-w-0 overflow-hidden"><h2 className="text-title font-bold text-primary-ink">{t.dashboardReportsOnMap}</h2><div className="relative mt-3 flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-fixed-tint sm:min-h-44"><span className="absolute inset-0 opacity-70 dark:opacity-15" aria-hidden style={{ backgroundImage: "linear-gradient(36deg, transparent 46%, white 47%, white 49%, transparent 50%), linear-gradient(126deg, transparent 43%, #fff 44%, #fff 47%, transparent 48%), linear-gradient(90deg, transparent 48%, #d5e5ec 49%, #d5e5ec 51%, transparent 52%)", backgroundSize: "84px 65px, 110px 80px, 70px 100%" }} />{visible.map((report, index) => { const x = 12 + ((report.location.lng - minLng) / (maxLng - minLng || 0.01)) * 76; const y = 10 + ((maxLat - report.location.lat) / (maxLat - minLat || 0.01)) * 78; return <span key={report.id} className={`absolute z-10 flex size-7 items-center justify-center rounded-full text-caption font-bold text-white shadow-raised ring-2 ring-surface ${index % 3 === 0 ? "bg-danger" : index % 3 === 1 ? "bg-primary" : "bg-reported"}`} style={{ left: `${x}%`, top: `${y}%` }}>{index + 1}</span>; })}<span className="relative z-10 flex items-center gap-1.5 rounded-xl bg-surface/90 px-3 py-2 text-caption font-semibold text-ink shadow-card"><MapPin aria-hidden size={15} className="text-primary-ink" />{city}</span><Link href="/me/reports" className="absolute right-2 bottom-2 z-20 rounded-lg bg-surface px-2.5 py-1.5 text-caption font-semibold text-primary-ink shadow-card">{t.dashboardReportsOnMap}<ChevronRight aria-hidden size={14} className="inline" /></Link></div></Card>;
}

function ActivityPanel({ data, locale }: { data: ReturnType<typeof useHomeData>["data"]; locale: "km" | "en" }) {
  const { t } = useLocale();
  const rows = data ? [
    ...data.activity.map((item) => item.kind === "report" ? { key: item.report.id, at: item.at, title: item.report.title, sub: item.report.code, href: "/report/new", icon: Landmark, accent: "primary" as Accent } : { key: item.claim.id, at: item.at, title: fmt(t.claimOn, { title: item.claim.postTitle }), sub: item.claim.status, href: "/lost-found", icon: KeyRound, accent: "gold" as Accent }),
    ...data.emergencyReports.map((incident) => ({ key: incident.id, at: incident.updatedAt, title: t.dashboardEmergency, sub: incident.addressHint ?? "", href: "/announcements", icon: Phone, accent: "danger" as Accent })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3) : [];
  return <Card className="min-w-0"><div className="mb-2 flex items-center gap-2"><IconTile icon={Clock3} accent="primary" size="sm" /><h2 className="text-title font-bold text-primary-ink">{t.myActivity}</h2></div>{!data ? <SkeletonRows rows={3} /> : rows.length ? <ul>{rows.map((row) => <ListRow key={row.key} icon={row.icon} accent={row.accent} href={row.href} title={row.title} subtitle={row.sub} meta={<span className="text-caption text-ink-muted">{shortDate(row.at, locale)}</span>} />)}</ul> : <EmptyState icon={CheckCircle} title={t.emptyActivityTitle} body={t.emptyActivityBody} />}<Link href="/dashboard/activity" className="mt-2 flex min-h-9 items-center justify-center gap-1 rounded-lg border border-line text-caption font-semibold text-primary-ink">{t.dashViewAll}<ChevronRight aria-hidden size={14} /></Link></Card>;
}
