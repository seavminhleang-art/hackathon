"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarPlus,
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
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt, type Dictionary } from "@/lib/i18n/dictionary";
import { formatDateParts } from "@/lib/i18n/format";
import { PageContainer, useSos, useUserCity } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  EmptyState,
  IconTile,
  LinkButton,
  ListRow,
  Section,
  SkeletonRows,
  StatusChip,
  buttonClass,
  type Accent,
  type ChipStatus,
} from "@/components/ui";
import type { EmergencyHotline } from "@/types";
import type { GrCategory, GrReportView } from "@/types/gov-reporting";
import type { LfClaimForClaimant } from "@/types/lost-found";
import type { CsAnnouncementView, CsGuideView, CsPlaceView } from "@/types/community";
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
    <PageContainer>
      <div className="flex flex-col gap-6 lg:gap-8">
        <Greeting visitor={visitor} />
        {data?.alert && <AlertBanner alert={data.alert} />}
        <QuickActions visitor={visitor} />

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="flex flex-col gap-6 lg:col-span-2 lg:gap-8">
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
            <NearYou data={data} visitor={visitor} setData={setData} />
          </div>
          <div className="flex flex-col gap-6 lg:gap-8">
            <ServicesNear place={data?.place ?? null} loading={!data} />
            <Hotlines />
            <Guides guides={data?.guides} />
            <StaffLink />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

// ---------- Top ----------

function Greeting({ visitor }: { visitor: boolean }) {
  const { t, tx } = useLocale();
  const { user } = useAuth();
  const city = useUserCity();

  if (visitor) {
    return (
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconTile icon={Lock} accent="primary" />
          <p className="text-[15px] font-semibold">{t.visitorStrip}</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/login" variant="secondary" size="sm" className="flex-1 sm:flex-none">
            {t.login}
          </LinkButton>
          <LinkButton href="/register" size="sm" className="flex-1 sm:flex-none">
            {t.register}
          </LinkButton>
        </div>
      </Card>
    );
  }
  if (!user) return <div className="h-14" aria-hidden />;

  return (
    <div>
      <h1 className="text-2xl leading-snug font-bold lg:text-[28px]">{fmt(t.hello, { name: user.fullName })}</h1>
      <Link
        href="/me"
        className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium text-ink-muted shadow-card hover:text-ink"
      >
        <MapPin aria-hidden size={14} className="text-primary" />
        {city ? [user.sangkat, tx(city.name)].filter(Boolean).join(", ") : t.chooseArea}
      </Link>
    </div>
  );
}

function AlertBanner({ alert }: { alert: CsAnnouncementView }) {
  const { t, tx, locale } = useLocale();
  const { time } = formatDateParts(alert.validFrom, locale);
  return (
    <Link
      href={`/announcements/${alert.id}`}
      className="flex items-start gap-3 rounded-2xl bg-danger p-4 text-white shadow-card hover:bg-danger-ink"
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-white/15">
        <TriangleAlert aria-hidden size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-bold">{tx(alert.title)}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-white/90">{tx(alert.body)}</p>
        <p className="mt-1.5 text-xs text-white/80">
          {t.alertSource} · {time}
        </p>
      </div>
      <ChevronRight aria-hidden size={20} className="mt-2.5 flex-none" />
    </Link>
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
    "flex min-h-28 flex-col items-start gap-2.5 rounded-2xl bg-surface p-3.5 text-left shadow-card transition-shadow hover:shadow-raised";

  return (
    <section aria-label={t.whatToDo} className="grid grid-cols-3 gap-3 lg:grid-cols-5">
      <Link
        href={visitor ? "/login?next=/report/new" : "/report/new"}
        className="col-span-3 flex min-h-24 items-center gap-4 rounded-2xl bg-primary p-4 text-white shadow-raised transition-colors hover:bg-primary-hover lg:col-span-2 lg:min-h-28"
      >
        <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-white/15">
          <Megaphone aria-hidden size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg leading-snug font-bold">{t.reportProblem}</span>
          <span className="block text-[13px] leading-snug text-white/85">{t.reportProblemHint}</span>
          {visitor && (
            <span className="mt-1 flex items-center gap-1 text-xs text-white/85">
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
              <span className="block text-[15px] leading-snug font-bold">{t[x.title]}</span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{x.hint}</span>
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
                href={`/reports/${a.report.code}`}
                title={a.report.title}
                subtitle={a.report.code}
                meta={
                  <>
                    <StatusChip status={a.report.status as ChipStatus} />
                    <span className="text-xs text-ink-muted">
                      {reportLine(a.report, t, a.report.departmentName ? tx(a.report.departmentName) : "—")}
                    </span>
                  </>
                }
              >
                {a.report.status === "RESOLVED" &&
                  (confirmed.includes(a.report.id) ? (
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-fixed-ink">
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
                    <span className="text-xs text-ink-muted">{claimLine(a.claim, t)}</span>
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

// ---------- Near you ----------

type SetData = ReturnType<typeof useHomeData>["setData"];

function NearYou({ data, visitor, setData }: { data: HomeData | null; visitor: boolean; setData: SetData }) {
  const { t, locale } = useLocale();
  const [busy, setBusy] = useState(false);

  if (!data) {
    return (
      <Section title={t.nearYou} hint={t.nearYouHint}>
        <SkeletonRows rows={3} />
      </Section>
    );
  }

  const { nearReport: r, nearFound: f, nearEvent: e } = data;

  async function support() {
    if (!r) return;
    setBusy(true);
    try {
      const next = await api.gr.supportReport(r.id);
      setData((d) => d && { ...d, nearReport: next });
    } finally {
      setBusy(false);
    }
  }

  async function going() {
    if (!e) return;
    setBusy(true);
    try {
      const next = await api.cs.rsvp(e.id, e.event?.myRsvp === "GOING" ? null : "GOING");
      setData((d) => d && { ...d, nearEvent: next });
    } finally {
      setBusy(false);
    }
  }

  const when = e?.event ? formatDateParts(e.event.start, locale) : null;

  return (
    <Section title={t.nearYou} hint={t.nearYouHint} href="/community">
      {!r && !f && !e ? (
        <EmptyState
          icon={Sun}
          title={t.emptyNearTitle}
          body={t.emptyNearBody}
          action={
            <LinkButton href="/community" variant="ghost" size="sm" trailingIcon={ChevronRight}>
              {t.browseEvents}
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {r && (
            <Card className="flex flex-col gap-3">
              <Link href={`/reports/${r.code}`} className="flex items-start gap-3">
                <IconTile icon={CATEGORY_ICON[r.category]} accent="primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-snug font-semibold">{r.title}</span>
                  {r.addressHint && <span className="mt-0.5 block text-[13px] text-ink-muted">{r.addressHint}</span>}
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={r.status as ChipStatus} />
                <span className="text-xs text-ink-muted">{fmt(t.supports, { n: r.supportCount })}</span>
              </div>
              <div className="mt-auto">
                {visitor ? (
                  <LinkButton href="/login" variant="secondary" size="sm" icon={ThumbsUp}>
                    {t.support}
                  </LinkButton>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={r.mySupport ? Check : ThumbsUp}
                    onClick={support}
                    disabled={busy || r.mySupport || !r.can.support}
                  >
                    {r.mySupport ? t.supported : t.support}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {f && (
            <Card className="flex flex-col gap-3">
              <Link href={`/lost-found/${f.id}`} className="flex items-start gap-3">
                <IconTile icon={KeyRound} accent="gold" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-snug font-semibold">{f.title}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-muted">{fmt(t.foundAt, { place: f.place })}</span>
                </span>
              </Link>
              <div>
                <StatusChip status="FOUND" />
              </div>
              <div className="mt-auto">
                <LinkButton href={visitor ? "/login" : `/lost-found/${f.id}/claim`} variant="secondary" size="sm">
                  {t.isItYours}
                </LinkButton>
              </div>
            </Card>
          )}

          {e?.event && when && (
            <Card className="flex gap-3 sm:col-span-2">
              <div className="flex w-14 flex-none flex-col items-center self-start rounded-xl bg-reported-tint py-1.5 text-reported-ink">
                <span className="text-[11px] leading-normal font-semibold">{when.weekday}</span>
                <span className="text-2xl leading-tight font-extrabold">{when.day}</span>
                <span className="max-w-full truncate px-1 text-[11px] leading-normal">{when.month}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Link href={`/community/posts/${e.id}`} className="text-[15px] leading-snug font-semibold">
                  {e.title}
                </Link>
                <p className="text-[13px] text-ink-muted">
                  {when.time} · {e.event.place} · {fmt(t.going, { n: e.event.goingCount })}
                </p>
                <div className="mt-1">
                  {visitor ? (
                    <LinkButton href="/login" variant="secondary" size="sm" icon={CalendarPlus}>
                      {t.imGoing}
                    </LinkButton>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={e.event.myRsvp === "GOING" ? Check : CalendarPlus}
                      onClick={going}
                      disabled={busy || (e.event.full && e.event.myRsvp !== "GOING")}
                    >
                      {e.event.myRsvp === "GOING" ? t.youreGoing : t.imGoing}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
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
              <span className="block text-[15px] leading-snug font-semibold">{tx(place.name)}</span>
              <span className="mt-0.5 block text-[13px] text-ink-muted">{[place.address, distance].filter(Boolean).join(" · ")}</span>
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
            className="group flex min-h-18 flex-col justify-center rounded-2xl bg-danger-tint px-3 py-2 ring-1 ring-danger/20 ring-inset hover:bg-danger hover:text-white"
          >
            <span className="text-xl leading-tight font-extrabold text-danger tabular-nums group-hover:text-white">{h.number}</span>
            <span className="truncate text-xs font-semibold">{tx(h.name)}</span>
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
    <Link href="/login?staff=1" className="flex min-h-11 items-center gap-1.5 self-start text-[13px] font-semibold text-ink-muted hover:text-ink">
      <Shield aria-hidden size={16} />
      {t.staffSignIn}
    </Link>
  );
}
