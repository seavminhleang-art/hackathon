"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Clock,
  Info,
  MessageCircle,
  MessageCircleQuestion,
  PackageCheck,
  Recycle,
  Search,
  Wrench,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Droplet,
  IdCard,
  KeyRound,
  Landmark,
  Lightbulb,
  Lock,
  MapPin,
  Megaphone,
  Navigation,
  Phone,
  Pin,
  Shield,
  Sun,
  ThumbsUp,
  TrafficCone,
  Trash2,
  Trees,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { coverPhoto } from "@/features/gov-reporting/meta";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt, type Dictionary } from "@/lib/i18n/dictionary";
import { formatDateParts, shortDate, weekdayLabel } from "@/lib/i18n/format";
import { PageContainer, useSos, useUserCity } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, IconTile, LinkButton, ListRow, Section, SkeletonRows, StatusChip, buttonClass, type Accent, type ChipStatus, Thumb } from "@/components/ui";
import type { EmergencyHotline } from "@/types";
import type { GrCategory, GrReportView } from "@/types/gov-reporting";
import type { LfClaimForClaimant, LfPublicPost } from "@/types/lost-found";
import type { CsAnnouncementView, CsGuideView, CsPlaceView, CsPostView, CsWasteSchedule } from "@/types/community";
import { HomeHero, NewsTicker } from "./HomeHero";
import { useHomeData, type ActivityItem, type HomeData } from "./useHomeData";

export const CATEGORY_ICON: Record<GrCategory, LucideIcon> = {
  ROAD_TRANSPORT: TrafficCone,
  WASTE: Trash2,
  DRAINAGE_FLOODING: Waves,
  PUBLIC_LIGHTING: Lightbulb,
  WATER: Droplet,
  PUBLIC_INFRASTRUCTURE: Trees,
  OTHER: Pin,
};

/**
 * Home dashboard. Tools first, no marketing hero.
 * Phone: one column in priority order. Desktop: actions row, then 2/3 + 1/3 columns.
 */
export function HomeScreen() {
  const { user, ready } = useAuth();
  const { data, setData } = useHomeData(user, ready);
  const visitor = ready && !user;

  return (
    <>
      <NewsTicker news={data?.news} />
      <PageContainer>
        <div className="flex flex-col gap-6 lg:gap-10">
          <Greeting />
          <HomeHero news={data?.news} events={data?.events} />
        <QuickActions visitor={visitor} />
        <StatsStrip stats={data?.stats} />

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-10">
          <div className="flex flex-col gap-6 lg:col-span-2 lg:gap-10">
            {user && (
              <MyActivity
                items={data?.activity}
                onChange={(r) =>
                  setData(
                    (d) =>
                      d && {
                        ...d,
                        activity: d.activity.map((a) => (a.kind === "report" && a.report.id === r.id ? { ...a, report: r } : a)),
                      },
                  )
                }
              />
            )}
            <LatestReports reports={data?.latestReports} />
            <LostFoundGrid posts={data?.lostFound} labels={data?.lfCategoryLabel} />
            <div className="grid gap-6 lg:gap-10 xl:grid-cols-2">
              <EventsList events={data?.events} />
              <CommunityBoard posts={data?.board} />
            </div>
          </div>
          <div className="flex flex-col gap-6 lg:gap-10">
            <Announcements items={data?.announcements} />
            {data?.waste && <WastePickup schedule={data.waste} />}
            <ServicesNear place={data?.place ?? null} loading={!data} />
            <Hotlines />
            <Guides guides={data?.guides} />
            <StaffLink />
          </div>
        </div>
      </div>
    </PageContainer>
    </>
  );
}

// ---------- Top ----------

function Greeting() {
  const { t, tx } = useLocale();
  const { user } = useAuth();
  const city = useUserCity();

  // Visitors: the navbar already has Log in, so no second prompt here.
  if (!user) return null;

  return (
    <div>
      <h1 className="text-page leading-snug font-bold lg:text-display">{fmt(t.hello, { name: user.fullName })}</h1>
      <Link
        href="/dashboard/profile"
        className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-meta font-medium text-ink-muted shadow-card hover:text-ink"
      >
        <MapPin aria-hidden size={14} className="text-primary" />
        {city ? [user.sangkat, tx(city.name)].filter(Boolean).join(", ") : t.chooseArea}
      </Link>
    </div>
  );
}

function QuickActions({ visitor }: { visitor: boolean }) {
  const { t } = useLocale();
  const { openSos } = useSos();

  const tiles: { key: string; icon: LucideIcon; accent: Accent; title: keyof Dictionary; hint: string; href?: string; onClick?: () => void }[] = [
    { key: "lf", icon: KeyRound, accent: "gold", title: "tileLostFound", hint: t.tileLostFoundHint, href: "/lost-found" },
    { key: "sv", icon: Building2, accent: "fixed", title: "tileServices", hint: t.tileServicesHint, href: "/services" },
    { key: "em", icon: Phone, accent: "danger", title: "tileEmergency", hint: "117 · 118 · 119", onClick: openSos },
  ];
  const tileCls =
    "flex min-h-24 flex-col items-start gap-3 rounded-2xl bg-surface p-4 text-left sm:min-h-32 shadow-card transition-shadow hover:shadow-raised";

  return (
    <section aria-label={t.whatToDo} className="grid grid-cols-3 gap-3 lg:grid-cols-5">
      <Link
        href={visitor ? "/login?next=/report/new" : "/report/new"}
        className="col-span-3 flex min-h-28 items-center gap-4 rounded-2xl bg-primary p-5 text-white shadow-raised transition-colors hover:bg-primary-hover lg:col-span-2 lg:min-h-28"
      >
        <span className="flex size-14 flex-none items-center justify-center rounded-2xl bg-white/15">
          <Megaphone aria-hidden size={28} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-title leading-snug font-bold">{t.reportProblem}</span>
          <span className="block text-meta leading-snug text-white/85">{t.reportProblemHint}</span>
          {visitor && (
            <span className="mt-1 flex items-center gap-1 text-meta text-white/85">
              <Lock aria-hidden size={12} />
              {t.accountNeeded}
            </span>
          )}
        </span>
        <ChevronRight aria-hidden size={22} className="flex-none" />
      </Link>
      {tiles.map((x) => {
        const body = (
          <>
            <IconTile icon={x.icon} accent={x.accent} />
            <span>
              <span className="block text-row leading-snug font-bold">{t[x.title]}</span>
              <span className="mt-1 hidden text-meta leading-snug text-ink-muted sm:block">{x.hint}</span>
            </span>
          </>
        );
        return x.href ? (
          <Link key={x.key} href={x.href} className={tileCls}>
            {body}
          </Link>
        ) : (
          <button key={x.key} type="button" onClick={x.onClick} className={tileCls}>
            {body}
          </button>
        );
      })}
    </section>
  );
}

// ---------- My activity ----------

function reportLine(r: GrReportView, t: Dictionary, dept: string): string {
  switch (r.status) {
    case "IN_PROGRESS":
      return fmt(t.activityInProgress, { dept });
    case "ASSIGNED":
    case "REOPENED":
      return fmt(t.activityAssigned, { dept });
    case "SUBMITTED":
      return t.activitySubmitted;
    case "UNDER_REVIEW":
      return t.activityUnderReview;
    case "NEED_MORE_INFO":
      return t.activityNeedInfo;
    case "RESOLVED":
      return t.activityResolved;
    case "CLOSED":
      return t.activityClosed;
    default:
      return t.activityRejected;
  }
}

function claimLine(c: LfClaimForClaimant, t: Dictionary): string {
  if (c.status === "APPROVED") return t.claimApprovedLine;
  if (c.status === "REJECTED") return t.claimRejectedLine;
  if (c.status === "COMPLETED") return t.claimCompletedLine;
  return t.claimPendingLine;
}

function MyActivity({ items, onChange }: { items?: ActivityItem[]; onChange: (r: GrReportView) => void }) {
  const { t, tx } = useLocale();
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function confirmFixed(r: GrReportView) {
    setBusy(r.id);
    try {
      onChange(await api.gr.confirmIssue(r.id, false));
      setConfirmed((c) => [...c, r.id]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section title={t.myActivity} href="/me/reports">
      {!items ? (
        <SkeletonRows rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t.emptyActivityTitle}
          body={t.emptyActivityBody}
          action={
            <LinkButton href="/report/new" variant="secondary" size="sm">
              {t.emptyActivityCta}
            </LinkButton>
          }
        />
      ) : (
        <Card padded={false} as="ul">
          {items.map((a) =>
            a.kind === "report" ? (
              <ListRow
                key={a.report.id}
                icon={CATEGORY_ICON[a.report.category]}
                accent="primary"
                media={<Thumb src={coverPhoto(a.report)} icon={CATEGORY_ICON[a.report.category]} accent="primary" size="sm" />}
                href={`/reports/${a.report.code}`}
                title={a.report.title}
                subtitle={a.report.code}
                meta={
                  <>
                    <StatusChip status={a.report.status as ChipStatus} />
                    <span className="text-meta text-ink-muted">
                      {reportLine(a.report, t, a.report.departmentName ? tx(a.report.departmentName) : "—")}
                    </span>
                  </>
                }
              >
                {a.report.status === "RESOLVED" &&
                  (confirmed.includes(a.report.id) ? (
                    <p className="flex items-center gap-1.5 text-meta font-semibold text-fixed-ink">
                      <Check aria-hidden size={16} />
                      {t.confirmedThanks}
                    </p>
                  ) : (
                    <div>
                      <Button size="sm" icon={Check} disabled={busy === a.report.id} onClick={() => confirmFixed(a.report)}>
                        {t.confirmFixed}
                      </Button>
                    </div>
                  ))}
              </ListRow>
            ) : (
              <ListRow
                key={a.claim.id}
                icon={IdCard}
                accent="gold"
                href={`/lost-found/${a.claim.postId}`}
                title={fmt(t.claimOn, { title: a.claim.postTitle })}
                meta={
                  <>
                    <StatusChip status={a.claim.status} />
                    <span className="text-meta text-ink-muted">{claimLine(a.claim, t)}</span>
                  </>
                }
              />
            ),
          )}
        </Card>
      )}
    </Section>
  );
}

// ---------- City at a glance ----------

function StatsStrip({ stats }: { stats?: HomeData["stats"] }) {
  const { t } = useLocale();
  const items: { icon: LucideIcon; accent: Accent; value?: number; label: string; href: string }[] = [
    { icon: CircleCheck, accent: "fixed", value: stats?.fixed, label: t.statFixed, href: "/reports" },
    { icon: Wrench, accent: "primary", value: stats?.working, label: t.statWorking, href: "/reports" },
    { icon: PackageCheck, accent: "gold", value: stats?.returned, label: t.statReturned, href: "/lost-found" },
    { icon: CalendarDays, accent: "reported", value: stats?.events, label: t.statEvents, href: "/community" },
  ];
  return (
    <Section title={t.glanceTitle} hint={t.glanceHint}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {items.map((x) => (
          <Link
            key={x.label}
            href={x.href}
            className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4 shadow-card transition-shadow hover:shadow-raised sm:flex-row sm:items-center lg:gap-4 lg:p-5"
          >
            <IconTile icon={x.icon} accent={x.accent} />
            <span className="min-w-0">
              <span className="block text-page leading-none font-extrabold tabular-nums">{x.value ?? "–"}</span>
              <span className="mt-1.5 block text-meta leading-snug text-ink-muted">{x.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

// ---------- Latest public reports ----------

function LatestReports({ reports }: { reports?: GrReportView[] }) {
  const { t, locale } = useLocale();
  return (
    <Section title={t.latestReports} hint={t.latestReportsHint} href="/reports">
      {!reports ? (
        <SkeletonRows rows={4} />
      ) : reports.length === 0 ? (
        <EmptyState icon={Sun} title={t.emptyNearTitle} body={t.emptyNearBody} />
      ) : (
        <Card padded={false} as="ul">
          {reports.map((r) => (
            <ListRow
              key={r.id}
              icon={CATEGORY_ICON[r.category]}
              accent="primary"
              media={<Thumb src={coverPhoto(r)} icon={CATEGORY_ICON[r.category]} accent="primary" size="sm" />}
              href={`/reports/${r.code}`}
              title={r.title}
              subtitle={[r.addressHint, shortDate(r.updatedAt, locale)].filter(Boolean).join(" · ")}
              meta={
                <>
                  <StatusChip status={r.status as ChipStatus} />
                  <span className="flex items-center gap-1 text-meta text-ink-muted">
                    <ThumbsUp aria-hidden size={15} />
                    {fmt(t.supports, { n: r.supportCount })}
                  </span>
                </>
              }
            />
          ))}
        </Card>
      )}
    </Section>
  );
}

// ---------- Lost & Found ----------

function LostFoundGrid({ posts, labels }: { posts?: LfPublicPost[]; labels?: HomeData["lfCategoryLabel"] }) {
  const { t, tx, locale } = useLocale();
  return (
    <Section title={t.lostFoundRecent} hint={t.lostFoundRecentHint} href="/lost-found">
      {!posts ? (
        <SkeletonRows rows={2} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((p) => {
            const label = labels?.[p.category];
            return (
              <Link
                key={p.id}
                href={`/lost-found/${p.id}`}
                className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card transition-shadow hover:shadow-raised lg:p-5"
              >
                <span className="flex items-start gap-3">
                  <Thumb src={p.photoUrls[0]} icon={p.kind === "FOUND" ? KeyRound : Search} accent={p.kind === "FOUND" ? "gold" : "reported"} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-row leading-snug font-semibold">{p.title}</span>
                    <span className="mt-1 block text-meta text-ink-muted">
                      {[label && tx(label), p.place].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="mt-auto flex items-center justify-between gap-2">
                  <StatusChip status={p.kind} />
                  <span className="text-meta text-ink-muted">{shortDate(p.createdAt, locale)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ---------- Community ----------

function EventsList({ events }: { events?: CsPostView[] }) {
  const { t, locale } = useLocale();
  return (
    <Section title={t.upcomingEvents} href="/community">
      {!events ? (
        <SkeletonRows rows={3} />
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t.emptyNearTitle} />
      ) : (
        <Card padded={false} as="ul">
          {events.map((e) => {
            const when = e.event ? formatDateParts(e.event.start, locale) : null;
            return (
              <li key={e.id} className="list-none border-b border-line last:border-b-0">
                <Link href={`/community/posts/${e.id}`} className="flex items-start gap-3 px-4 py-4 hover:bg-sand lg:px-5">
                  {when && (
                    <span className="flex w-14 flex-none flex-col items-center rounded-xl bg-reported-tint py-1.5 text-reported-ink">
                      <span className="text-caption font-semibold">{when.weekday}</span>
                      <span className="text-title leading-tight font-extrabold">{when.day}</span>
                      <span className="max-w-full truncate px-1 text-caption">{when.month}</span>
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-row leading-snug font-semibold">{e.title}</span>
                    <span className="mt-1 block text-meta text-ink-muted">
                      {when?.time} · {e.event?.place}
                    </span>
                    <span className="mt-1 block text-meta text-ink-muted">{fmt(t.going, { n: e.event?.goingCount ?? 0 })}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </Card>
      )}
    </Section>
  );
}

const POST_ICON: Record<string, LucideIcon> = { QUESTION: MessageCircleQuestion, POLL: ChartColumn, DISCUSSION: MessageCircle, EVENT: CalendarDays };

function CommunityBoard({ posts }: { posts?: CsPostView[] }) {
  const { t } = useLocale();
  return (
    <Section title={t.communityBoard} href="/community">
      {!posts ? (
        <SkeletonRows rows={3} />
      ) : (
        <Card padded={false} as="ul">
          {posts.map((p) => (
            <ListRow
              key={p.id}
              icon={POST_ICON[p.type] ?? MessageCircle}
              accent="reported"
              href={`/community/posts/${p.id}`}
              title={p.title}
              subtitle={[t[`post${p.type}` as keyof Dictionary], p.author.name].join(" · ")}
              meta={<span className="text-meta text-ink-muted">{fmt(t.commentsN, { n: p.commentCount })}</span>}
            />
          ))}
        </Card>
      )}
    </Section>
  );
}

// ---------- Announcements + waste ----------

function Announcements({ items }: { items?: CsAnnouncementView[] }) {
  const { t, tx, locale } = useLocale();
  if (items && items.length === 0) return null;
  return (
    <Section title={t.announcementsTitle} href="/announcements">
      {!items ? (
        <SkeletonRows rows={3} />
      ) : (
        <Card padded={false} as="ul">
          {items.map((a) => (
            <ListRow
              key={a.id}
              icon={a.level === "INFO" ? Info : TriangleAlert}
              accent={a.level === "INFO" ? "primary" : a.level === "WARNING" ? "gold" : "danger"}
              href={`/announcements/${a.id}`}
              title={tx(a.title)}
              subtitle={<span className="line-clamp-2">{tx(a.body)}</span>}
              meta={
                <span className="text-meta text-ink-muted">
                  {t[`level${a.level}` as keyof Dictionary]} · {shortDate(a.validFrom, locale)}
                </span>
              }
            />
          ))}
        </Card>
      )}
    </Section>
  );
}

function WastePickup({ schedule }: { schedule: CsWasteSchedule }) {
  const { t, tx, locale } = useLocale();
  const days =
    schedule.days.length === 7 ? t.wasteEveryDay : schedule.days.map((d) => weekdayLabel(d, locale)).join(", ");
  return (
    <Section title={t.wasteTitle}>
      <Card className="flex items-start gap-3">
        <IconTile icon={Recycle} accent="fixed" />
        <span className="min-w-0">
          <span className="block text-row font-semibold">{days}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-body text-ink">
            <Clock aria-hidden size={16} className="text-ink-muted" />
            {schedule.timeWindow.from}–{schedule.timeWindow.to}
          </span>
          {schedule.note && <span className="mt-1 block text-meta text-ink-muted">{tx(schedule.note)}</span>}
        </span>
      </Card>
    </Section>
  );
}

// ---------- Side column ----------

function ServicesNear({ place, loading }: { place: CsPlaceView | null; loading: boolean }) {
  const { t, tx } = useLocale();
  const distance =
    place?.distanceKm === undefined
      ? null
      : place.distanceKm < 1
        ? fmt(t.mAway, { n: Math.round((place.distanceKm * 1000) / 50) * 50 })
        : fmt(t.kmAway, { n: place.distanceKm.toFixed(1) });

  return (
    <Section title={t.servicesNearYou} href="/services">
      {loading ? (
        <SkeletonRows rows={1} />
      ) : place ? (
        <Card className="flex flex-col gap-3">
          <Link href={`/services/${place.id}`} className="flex items-start gap-3">
            <IconTile icon={Landmark} accent="fixed" />
            <span className="min-w-0 flex-1">
              <span className="block text-row leading-snug font-semibold">{tx(place.name)}</span>
              <span className="mt-0.5 block text-meta text-ink-muted">{[place.address, distance].filter(Boolean).join(" · ")}</span>
            </span>
          </Link>
          <div>
            <StatusChip status={place.openNow ? "OPEN" : "SHUT"} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {place.phone ? (
              <a href={`tel:${place.phone}`} className={buttonClass("secondary", "sm")}>
                <Phone aria-hidden size={16} />
                {t.call}
              </a>
            ) : (
              <span />
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClass("secondary", "sm")}
            >
              <Navigation aria-hidden size={16} />
              {t.directions}
            </a>
          </div>
        </Card>
      ) : null}
    </Section>
  );
}

function Hotlines() {
  const { t, tx } = useLocale();
  const [hotlines, setHotlines] = useState<EmergencyHotline[]>([]);
  useEffect(() => {
    api.getEmergencyHotlines().then(setHotlines);
  }, []);
  return (
    <Section title={t.hotlines} hint={t.hotlinesHint}>
      <div className="grid grid-cols-3 gap-2">
        {hotlines.map((h) => (
          <a
            key={h.id}
            href={`tel:${h.number}`}
            className="group flex min-h-20 flex-col justify-center rounded-2xl bg-danger-tint px-3 py-2 ring-1 ring-danger/20 ring-inset hover:bg-danger hover:text-white"
          >
            <span className="text-page leading-tight font-extrabold text-danger tabular-nums group-hover:text-white">{h.number}</span>
            <span className="truncate text-meta font-semibold">{tx(h.name)}</span>
          </a>
        ))}
      </div>
    </Section>
  );
}

function Guides({ guides }: { guides?: CsGuideView[] }) {
  const { t, tx } = useLocale();
  return (
    <Section title={t.guides} href="/services">
      {!guides ? (
        <SkeletonRows rows={2} />
      ) : (
        <Card padded={false} as="ul">
          {guides.map((g) => (
            <ListRow key={g.id} icon={BookOpen} accent="neutral" href={`/guides/${g.id}`} title={tx(g.title)} />
          ))}
        </Card>
      )}
    </Section>
  );
}

function StaffLink() {
  const { t } = useLocale();
  return (
    <Link href="/login?staff=1" className="flex min-h-11 items-center gap-1.5 self-start text-meta font-semibold text-ink-muted hover:text-ink">
      <Shield aria-hidden size={16} />
      {t.staffSignIn}
    </Link>
  );
}
