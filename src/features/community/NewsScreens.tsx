"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Megaphone,
  Phone,
  ShieldAlert,
  TriangleAlert,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageContainer, useSos } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, FilterChips, IconTile, LinkButton, ListRow, SkeletonRows, type Accent } from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import { formatDateParts, shortDate } from "@/lib/i18n/format";
import type { CsAnnouncementLevel, CsAnnouncementView, CsGroupView } from "@/types/community";
import { CommentThread } from "./Comments";
import { useCs, type CsDict } from "./i18n";
import { CommunityTabs, OfficialBadge, scopeLabel, useAreas, useCommunityHref } from "./shared";

const LEVEL: Record<CsAnnouncementLevel, { icon: LucideIcon; accent: Accent; chip: string }> = {
  ALERT: { icon: TriangleAlert, accent: "danger", chip: "bg-danger text-white" },
  WARNING: { icon: TriangleAlert, accent: "gold", chip: "bg-progress-tint text-progress-ink ring-1 ring-progress/40 ring-inset" },
  INFO: { icon: Info, accent: "primary", chip: "bg-primary-tint text-primary" },
};

export function LevelChip({ level }: { level: CsAnnouncementLevel }) {
  const { c } = useCs();
  const m = LEVEL[level];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta font-semibold whitespace-nowrap ${m.chip}`}>
      <Icon aria-hidden size={15} />
      {c[`level${level}` as keyof CsDict]}
    </span>
  );
}

function validity(a: CsAnnouncementView, c: CsDict, locale: "km" | "en") {
  return a.validTo ? fmt(c.validUntil, { date: shortDate(a.validTo, locale) }) : c.noEnd;
}

// ---------- /announcements ----------

type LevelFilter = "ALL" | CsAnnouncementLevel;

/** Official notices for my area. Alerts first, then newest; expired collapsed (wireframe 6a). */
export function NewsScreen() {
  const { c, tx, locale } = useCs();
  const href = useCommunityHref();
  const { ready, user } = useAuth();
  const [items, setItems] = useState<CsAnnouncementView[] | null>(null);
  const [filter, setFilter] = useState<LevelFilter>("ALL");
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.cs
      .listAnnouncements({ includeExpired: true })
      .then((a) => alive && setItems(a))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [ready, user]);

  const rank: Record<CsAnnouncementLevel, number> = { ALERT: 0, WARNING: 1, INFO: 2 };
  const shown = (items ?? []).filter((a) => filter === "ALL" || a.level === filter);
  const active = shown.filter((a) => a.active).sort((a, b) => rank[a.level] - rank[b.level] || b.validFrom.localeCompare(a.validFrom));
  const expired = shown.filter((a) => !a.active);

  return (
    <PageContainer>
      <div className="pb-4">
        <h1 className="text-page leading-tight font-bold lg:text-display">{c.community}</h1>
      </div>
      <CommunityTabs active="/announcements" />

      <div className="mt-6 flex max-w-4xl flex-col gap-4">
        <div>
          <h2 className="text-title font-bold">{c.newsTitle}</h2>
          <p className="text-meta text-ink-muted">{c.newsHint}</p>
        </div>
        <FilterChips
          label={c.newsTitle}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: c.all, icon: Megaphone },
            { value: "ALERT", label: c.levelALERT, icon: TriangleAlert },
            { value: "WARNING", label: c.levelWARNING, icon: TriangleAlert },
            { value: "INFO", label: c.levelINFO, icon: Info },
          ]}
        />

        {!items ? (
          <SkeletonRows rows={3} />
        ) : active.length === 0 && expired.length === 0 ? (
          <EmptyState icon={Megaphone} title={c.emptyNews} body={c.emptyNewsBody} />
        ) : (
          <>
            {active.map((a) => (
              <NewsCard key={a.id} a={a} />
            ))}
            {active.length === 0 && <EmptyState icon={Megaphone} title={c.emptyNews} body={c.emptyNewsBody} />}
            {expired.length > 0 && (
              <>
                <Button variant="ghost" trailingIcon={ChevronDown} onClick={() => setShowExpired((s) => !s)} className="self-start">
                  {showExpired ? c.hideExpired : fmt(c.showExpired, { n: expired.length })}
                </Button>
                {showExpired && (
                  <Card padded={false} as="ul">
                    {expired.map((a) => (
                      <ListRow
                        key={a.id}
                        icon={LEVEL[a.level].icon}
                        accent="neutral"
                        href={href(`/announcements/${a.id}`)}
                        title={tx(a.title)}
                        subtitle={`${c.expired} · ${shortDate(a.validTo ?? a.validFrom, locale)}`}
                      />
                    ))}
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}

function NewsCard({ a }: { a: CsAnnouncementView }) {
  const { c, tx, locale } = useCs();
  const href = useCommunityHref();
  const areas = useAreas();
  const alert = a.level === "ALERT";
  const when = formatDateParts(a.validFrom, locale);
  return (
    <Link
      href={href(`/announcements/${a.id}`)}
      className={`flex flex-col gap-3 rounded-2xl p-4 shadow-card transition-shadow hover:shadow-raised lg:p-5 ${
        alert ? "bg-danger text-white" : "bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {alert ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-meta font-semibold">
            <TriangleAlert aria-hidden size={15} />
            {c.levelALERT}
          </span>
        ) : (
          <LevelChip level={a.level} />
        )}
        <span className={`text-meta ${alert ? "text-white/80" : "text-ink-muted"}`}>
          {when.day} {when.month} · {when.time}
        </span>
      </div>
      <div>
        <h3 className="text-row leading-snug font-bold">{tx(a.title)}</h3>
        <p className={`mt-1 line-clamp-2 text-body ${alert ? "text-white/90" : "text-ink-muted"}`}>{tx(a.body)}</p>
      </div>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-meta ${alert ? "text-white/85" : "text-ink-muted"}`}>
        <span className="flex items-center gap-1.5">
          <span className={alert ? "font-semibold text-white" : "font-semibold text-ink"}>{a.author.name}</span>
          {!alert && a.author.official && <OfficialBadge />}
        </span>
        <span>· {scopeLabel(a.scope, areas, locale, c)}</span>
        <span>· {validity(a, c, locale)}</span>
        <ChevronRight aria-hidden size={18} className="ml-auto" />
      </div>
    </Link>
  );
}

// ---------- /announcements/[id] ----------

/** Notice detail: level + title, source/posted/valid/area rows, actions, optional comments (6b). */
export function AnnouncementScreen() {
  const { id } = useParams<{ id: string }>();
  const { c, tx, locale } = useCs();
  const href = useCommunityHref();
  const { ready } = useAuth();
  const areas = useAreas();
  const { openSos } = useSos();
  const router = useRouter();
  const [a, setA] = useState<CsAnnouncementView | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.cs
      .getAnnouncement(id)
      .then((x) => alive && setA(x))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id, ready]);

  const back = (
    <Link href={href("/announcements")} className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
      <ArrowLeft aria-hidden size={20} />
      {c.news}
    </Link>
  );

  if (error)
    return (
      <PageContainer>
        {back}
        <EmptyState icon={ShieldAlert} title={c.notFound} body={c.notFoundBody} />
      </PageContainer>
    );
  if (!a)
    return (
      <PageContainer>
        {back}
        <SkeletonRows rows={3} />
      </PageContainer>
    );

  const alert = a.level === "ALERT";
  const posted = formatDateParts(a.validFrom, locale);
  const rows: { icon: LucideIcon; label: string; value: React.ReactNode }[] = [
    { icon: Users, label: c.source, value: <span className="flex flex-wrap items-center gap-2">{a.author.name} {a.author.official && <OfficialBadge />}</span> },
    { icon: Clock, label: c.posted, value: `${posted.weekday} ${posted.day} ${posted.month} · ${posted.time}` },
    { icon: CalendarClock, label: c.validLabel, value: a.validTo ? shortDate(a.validTo, locale) : c.noEnd },
    { icon: Megaphone, label: c.areaRow, value: scopeLabel(a.scope, areas, locale, c) },
  ];

  return (
    <PageContainer className="max-w-4xl">
      {back}
      <header className={`flex flex-col gap-3 rounded-3xl p-5 shadow-card lg:p-8 ${alert ? "bg-danger text-white" : "bg-surface"}`}>
        {alert ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1 text-meta font-semibold">
            <TriangleAlert aria-hidden size={15} />
            {c.levelALERT}
          </span>
        ) : (
          <span className="self-start">
            <LevelChip level={a.level} />
          </span>
        )}
        <h1 className="text-page leading-tight font-bold">{tx(a.title)}</h1>
        <p className={`text-body ${alert ? "text-white/90" : ""}`}>{tx(a.body)}</p>
      </header>

      <Card padded={false} as="ul" className="mt-5">
        {rows.map((r) => (
          <li key={r.label} className="flex list-none items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0 lg:px-5">
            <IconTile icon={r.icon} accent="neutral" size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block text-meta text-ink-muted">{r.label}</span>
              <span className="block text-body font-semibold">{r.value}</span>
            </span>
          </li>
        ))}
      </Card>

      {(alert || a.level === "WARNING") && (
        <section className="mt-6">
          <h2 className="mb-3 text-title font-bold">{c.whatToDo}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" icon={Waves} onClick={() => router.push("/report/new")}>
              {c.reportDrain}
            </Button>
            {alert && (
              <Button size="lg" variant="secondary" icon={Phone} onClick={openSos} className="text-danger ring-danger/40">
                {c.emergencyNumbers}
              </Button>
            )}
          </div>
        </section>
      )}

      <div className="mt-8">
        <CommentThread target="ANNOUNCEMENT" targetId={a.id} enabled={a.commentsEnabled && !alert} />
      </div>
    </PageContainer>
  );
}

// ---------- /community/groups (P1: read-only list for now) ----------

export function GroupsScreen() {
  const { c, tx } = useCs();
  const { ready, user } = useAuth();
  const [mine, setMine] = useState<CsGroupView[] | null>(null);
  const [all, setAll] = useState<CsGroupView[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    if (user) api.cs.listGroups({ mine: true }).then((g) => alive && setMine(g));
    api.cs.listGroups({ kind: "INTEREST" }).then((g) => alive && setAll(g));
    return () => {
      alive = false;
    };
  }, [ready, user]);

  const list = (rows: CsGroupView[] | null) =>
    !rows ? (
      <SkeletonRows rows={3} />
    ) : (
      <Card padded={false} as="ul">
        {rows.map((g) => (
          <ListRow
            key={g.id}
            icon={Users}
            accent="reported"
            title={tx(g.name)}
            subtitle={tx(g.description)}
            meta={
              <span className="text-meta text-ink-muted">
                {fmt(c.members, { n: g.memberCount })} · {fmt(c.postsN, { n: g.postCount })}
                {g.myRole ? ` · ${c.member}` : ""}
              </span>
            }
          />
        ))}
      </Card>
    );

  return (
    <PageContainer>
      <div className="pb-4">
        <h1 className="text-page leading-tight font-bold lg:text-display">{c.community}</h1>
      </div>
      <CommunityTabs active="/community/groups" />
      <div className="mt-6 grid max-w-5xl gap-8 lg:grid-cols-2">
        {user && (
          <section className="flex flex-col gap-3">
            <h2 className="text-title font-bold">{c.myGroups}</h2>
            {list(mine)}
          </section>
        )}
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-bold">{c.groupsTitle}</h2>
          <p className="-mt-2 text-meta text-ink-muted">{c.groupsHint}</p>
          {list(all)}
        </section>
      </div>
      <p className="mt-6 text-meta text-ink-muted">{c.groupsSoon}</p>
      <LinkButton href="/community" variant="ghost" size="sm" className="mt-2">
        {c.board}
      </LinkButton>
    </PageContainer>
  );
}
