"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ClipboardList, FileText, Heart, MessageSquare, PackageCheck, Search, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { Card, IconTile } from "@/components/ui";
import { api } from "@/lib/api";
import type { MyActivityData, MyActivityEvent, MyActivityKind } from "@/lib/api/activity-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { shortDate } from "@/lib/i18n/format";

type Filter = "ALL" | MyActivityKind;
const ICONS: Record<MyActivityKind, LucideIcon> = { POST: PackageCheck, COMMENT: MessageSquare, CLAIM: ClipboardList, MATCH: Sparkles, REPORT: FileText, EMERGENCY: ShieldAlert };
const ACCENTS: Record<MyActivityKind, string> = { POST: "gold", COMMENT: "fixed", CLAIM: "reported", MATCH: "primary", REPORT: "danger", EMERGENCY: "danger" };

export function ActivityScreen() {
  const { user, ready } = useAuth();
  const { t, locale } = useLocale();
  const [data, setData] = useState<MyActivityData | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [limit, setLimit] = useState(8);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => { setNow(new Date()); }, []);
  useEffect(() => {
    let live = true;
    if (!ready || !user) { setData(null); return () => { live = false; }; }
    api.activity.getMyActivity().then((result) => { if (live) setData(result); }).catch(() => { if (live) setData({ events: [], postsCreated: 0, itemsFound: 0, itemsLost: 0, comments: 0, claimsSubmitted: 0, matchesFound: 0, reportsMade: 0 }); });
    return () => { live = false; };
  }, [ready, user]);

  const filtered = useMemo(() => (data?.events ?? []).filter((item) => filter === "ALL" || item.kind === filter), [data, filter]);
  const counts = [
    { label: t.activityPostsCreated, value: data?.postsCreated ?? 0, icon: PackageCheck, accent: "fixed" },
    { label: t.activityItemsFound, value: data?.itemsFound ?? 0, icon: Check, accent: "gold" },
    { label: t.activityItemsLost, value: data?.itemsLost ?? 0, icon: Search, accent: "reported" },
    { label: t.activityComments, value: data?.comments ?? 0, icon: MessageSquare, accent: "primary" },
    { label: t.activityClaimsSubmitted, value: data?.claimsSubmitted ?? 0, icon: Heart, accent: "danger" },
  ];

  const monthly = useMemo(() => {
    if (!now || !data) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const amount = data.events.filter((event) => { const at = new Date(event.at); return at.getFullYear() === date.getFullYear() && at.getMonth() === date.getMonth(); }).length;
      return { date, amount };
    });
  }, [data, now]);

  const activeDay = useMemo(() => {
    const days = new Map<string, number>();
    for (const event of data?.events ?? []) {
      const key = new Date(event.at).toISOString().slice(0, 10);
      days.set(key, (days.get(key) ?? 0) + 1);
    }
    const best = [...days].sort((a, b) => b[1] - a[1])[0];
    return best ? shortDate(`${best[0]}T12:00:00Z`, locale) : "—";
  }, [data, locale]);

  const rows = [
    { label: t.activityPostsCreated, value: data?.postsCreated ?? 0, color: "bg-primary" },
    { label: t.activityItemsLost, value: data?.itemsLost ?? 0, color: "bg-gold" },
    { label: t.activityItemsFound, value: data?.itemsFound ?? 0, color: "bg-fixed" },
    { label: t.activityComments, value: data?.comments ?? 0, color: "bg-reported" },
    { label: t.activityClaimsSubmitted, value: data?.claimsSubmitted ?? 0, color: "bg-danger" },
    { label: t.activityMatches, value: data?.matchesFound ?? 0, color: "bg-progress" },
    { label: t.activityReports, value: data?.reportsMade ?? 0, color: "bg-danger-ink" },
  ];
  const peak = Math.max(1, ...monthly.map((month) => month.amount));
  const points = monthly.map((month, index) => `${8 + index * 24},${86 - (month.amount / peak) * 62}`).join(" ");

  return <PageContainer className="pb-10">
    <header className="mb-5"><h1 className="text-page font-bold text-ink">{t.navMyActivity}</h1><p className="text-meta text-ink-muted">{t.dashActivityHint}</p></header>

    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {counts.map((item) => <Card key={item.label} className="min-w-0 p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-caption text-ink-muted">{item.label}</span><IconTile icon={item.icon} accent={item.accent as "fixed" | "gold" | "reported" | "primary" | "danger"} size="sm" /></div><b className="mt-1 block text-title tabular-nums">{data ? item.value : "—"}</b><span className="text-caption text-ink-muted">{t.activityThisMonth}</span></Card>)}
    </div>

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
      <Card className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-row font-bold">{t.navMyActivity}</h2><p className="text-caption text-ink-muted">{t.dashActivityHint}</p></div><span className="text-caption text-ink-muted">{data?.events.length ?? 0}</span></div>
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label={t.navMyActivity}>
          {(["ALL", "POST", "COMMENT", "CLAIM", "MATCH", "REPORT"] as const).map((key) => <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => { setFilter(key); setLimit(8); }} className={`min-h-11 flex-none border-b-2 px-3 text-caption font-semibold ${filter === key ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"}`}>{key === "ALL" ? t.activityAll : key === "POST" ? t.activityPosts : key === "COMMENT" ? t.activityComments : key === "CLAIM" ? t.dashClaims : key === "MATCH" ? t.activityMatches : t.activityReports}</button>)}
        </div>
        {!data ? <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-sand" />)}</div> : filtered.length ? <>
          <ul className="space-y-2.5">{filtered.slice(0, limit).map((event) => <ActivityRow key={event.id} event={event} locale={locale} t={t} />)}</ul>
          {filtered.length > limit && <button type="button" onClick={() => setLimit((n) => n + 8)} className="mx-auto mt-4 flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 text-caption font-semibold text-ink-muted hover:bg-sand">{t.activityLoadMore}<ChevronDown aria-hidden size={15} /></button>}
        </> : <p className="rounded-xl bg-sand px-4 py-10 text-center text-meta text-ink-muted">{t.activityNoEvents}</p>}
      </Card>

      <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <Card><div className="mb-3 flex items-center justify-between"><h2 className="text-row font-bold">{t.activityOverview}</h2><span className="rounded-lg bg-sand px-2 py-1 text-caption text-ink-muted">{t.activityThisMonth}</span></div><ul className="space-y-2.5">{rows.map((row) => <li key={row.label} className="flex items-center gap-2 text-caption"><i className={`size-2 rounded-full ${row.color}`} /><span className="flex-1 text-ink-muted">{row.label}</span><b className="tabular-nums">{row.value}</b></li>)}</ul></Card>
        <Card><h2 className="mb-3 text-row font-bold">{t.activityMonthlyProgress}</h2><div className="relative h-32 overflow-hidden rounded-xl bg-surface"><div className="absolute inset-0 flex flex-col justify-between py-2"><i className="border-t border-line" /><i className="border-t border-line" /><i className="border-t border-line" /></div><svg viewBox="0 0 280 100" className="relative h-full w-full" role="img" aria-label={t.activityMonthlyProgress}><polyline fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />{monthly.map((month, index) => <circle key={month.date.toISOString()} cx={8 + index * 24} cy={86 - (month.amount / peak) * 62} r="3" fill="var(--color-primary)" />)}</svg></div><div className="mt-2 flex justify-between text-caption text-ink-muted">{monthly.filter((_, i) => i % 3 === 0).map((month) => <span key={month.date.toISOString()}>{month.date.toLocaleDateString(locale === "km" ? "km-KH" : "en-US", { month: "short" })}</span>)}</div></Card>
        <Card><h2 className="mb-3 text-row font-bold">{t.activityTopContributions}</h2><ul className="space-y-2"><Contribution icon={CalendarDays} title={t.activityMostActiveDay} value={activeDay} /><Contribution icon={PackageCheck} title={t.activityItemsFound} value={String(data?.itemsFound ?? 0)} /><Contribution icon={Sparkles} title={t.activityMatches} value={String(data?.matchesFound ?? 0)} /><Contribution icon={MessageSquare} title={t.activityComments} value={String(data?.comments ?? 0)} /></ul></Card>
      </aside>
    </div>
  </PageContainer>;
}

function ActivityRow({ event, locale, t }: { event: MyActivityEvent; locale: "km" | "en"; t: ReturnType<typeof useLocale>["t"] }) {
  const Icon = ICONS[event.kind];
  const label = event.kind === "POST" ? t.activityCreatedPost : event.kind === "COMMENT" ? t.activityAddedComment : event.kind === "CLAIM" ? t.activitySubmittedClaim : event.kind === "MATCH" ? t.activityFoundMatch : event.kind === "REPORT" ? t.activitySubmittedReport : t.activityEmergencyReport;
  return <li><Link href={event.href} className="flex min-h-16 items-start gap-3 rounded-xl border border-line/70 bg-surface p-3 transition hover:bg-sand/60"><IconTile icon={Icon} accent={ACCENTS[event.kind] as "gold" | "fixed" | "reported" | "primary" | "danger"} size="sm" /><span className="min-w-0 flex-1"><b className="block truncate text-meta">{label}: “{event.title}”</b><span className="block truncate text-caption text-ink-muted">{event.detail}</span><span className="mt-1 block text-caption text-ink-muted">{shortDate(event.at, locale)}</span></span>{event.status && <span className="rounded-full bg-sand px-2 py-1 text-caption text-ink-muted">{event.status}</span>}</Link></li>;
}

function Contribution({ icon: Icon, title, value }: { icon: LucideIcon; title: string; value: string }) {
  return <li className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2.5"><Icon aria-hidden size={15} className="text-primary" /><span className="flex-1 text-caption text-ink-muted">{title}</span><b className="text-caption">{value}</b></li>;
}
