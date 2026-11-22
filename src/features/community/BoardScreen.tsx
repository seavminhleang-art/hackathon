"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  Info,
  LogIn,
  MapPin,
  MessageCircle,
  MessageCircleQuestion,
  Plus,
  Sun,
  TriangleAlert,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageContainer } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  EmptyState,
  FilterChips,
  LinkButton,
  ListRow,
  Section,
  Sheet,
  SkeletonRows,
  buttonClass,
} from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import { formatDateParts } from "@/lib/i18n/format";
import type { CsAnnouncementView, CsGroupView, CsPostType, CsPostView } from "@/types/community";
import { useCs } from "./i18n";
import { PostCard } from "./PostCard";
import { CommunityTabs, InfoStrip, useAreas, useLoginGate } from "./shared";

type Filter = "ALL" | CsPostType;
type AreaMode = "khan" | "city";

/** /community · Board: filter chips + one chronological feed scoped to the user's area (wireframe 2a / 3a). */
export function BoardScreen() {
  const { c, tx } = useCs();
  const { user, ready } = useAuth();
  const areas = useAreas();
  const { gate, sheet } = useLoginGate();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [mode, setMode] = useState<AreaMode>("khan");
  const [areaOpen, setAreaOpen] = useState(false);
  // Posts are stored with the query they belong to, so a new filter shows skeletons right away.
  const [feed, setFeed] = useState<{ key: string; posts: CsPostView[] } | null>(null);
  const [alert, setAlert] = useState<CsAnnouncementView | null>(null);
  const [events, setEvents] = useState<CsPostView[] | null>(null);
  const [groups, setGroups] = useState<CsGroupView[] | null>(null);

  const city = areas?.cities.find((x) => x.id === user?.cityId);
  const province = areas?.provinces.find((x) => x.id === user?.provinceId);
  const scopeFilter = !user ? {} : mode === "khan" ? { cityId: user.cityId } : { provinceId: user.provinceId };
  const areaName = !user ? c.nationwide : mode === "khan" ? (city ? tx(city.name) : "…") : province ? tx(province.name) : "…";

  const feedKey = `${user?.id ?? "guest"}|${mode}|${filter}`;
  const posts = feed?.key === feedKey ? feed.posts : null;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.cs
      .listPosts({ ...scopeFilter, type: filter === "ALL" ? undefined : [filter] })
      .then((p) => alive && setFeed({ key: feedKey, posts: p }))
      .catch(() => alive && setFeed({ key: feedKey, posts: [] }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeFilter derives from feedKey
  }, [ready, feedKey]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.cs.activeAlerts().then((a) => alive && setAlert(a[0] ?? null));
    api.cs
      .listPosts({ type: ["EVENT"], upcomingEvents: true, provinceId: user?.provinceId })
      .then((e) => alive && setEvents(e.slice(0, 3)));
    (user ? api.cs.listGroups({ mine: true }) : api.cs.listGroups({ kind: "INTEREST" }))
      .then((g) => alive && setGroups(g.slice(0, 4)))
      .catch(() => alive && setGroups([]));
    return () => {
      alive = false;
    };
  }, [ready, user]);

  const replace = (p: CsPostView) => setFeed((f) => f && { ...f, posts: f.posts.map((x) => (x.id === p.id ? p : x)) });

  const chips: { value: Filter; label: string; icon: typeof CalendarDays }[] = [
    { value: "ALL", label: c.all, icon: MessageCircle },
    { value: "EVENT", label: c.events, icon: CalendarDays },
    { value: "QUESTION", label: c.questions, icon: MessageCircleQuestion },
    { value: "POLL", label: c.polls, icon: ChartColumn },
    { value: "DISCUSSION", label: c.discussions, icon: MessageCircle },
  ];

  const newPost = () => gate(c.actPost, () => router.push("/community/new"));

  return (
    <PageContainer>
      {/* Header: title + area + New post (desktop) */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="text-page leading-tight font-bold lg:text-display">{c.community}</h1>
          <button
            type="button"
            onClick={() => (user ? setAreaOpen(true) : undefined)}
            className="mt-1.5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-meta font-semibold shadow-card"
            aria-label={`${c.area}: ${areaName}`}
          >
            <MapPin aria-hidden size={16} className="text-primary" />
            {areaName}
            {user && <ChevronDown aria-hidden size={16} className="text-ink-muted" />}
          </button>
        </div>
        <div className="hidden lg:block">
          <Button icon={user ? Plus : LogIn} onClick={newPost}>
            {user ? c.newPost : c.loginToPost}
          </Button>
        </div>
      </div>

      <CommunityTabs active="/community" />

      <div className="mt-6 grid gap-8 lg:grid-cols-3 lg:gap-10">
        {/* Feed */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {alert && (
            <Link
              href={`/announcements/${alert.id}`}
              className="flex min-h-13 items-center gap-3 rounded-2xl bg-danger px-4 py-2.5 text-white shadow-card hover:bg-danger-ink"
            >
              <TriangleAlert aria-hidden size={20} className="flex-none" />
              <span className="min-w-0 flex-1 truncate text-body font-semibold">{tx(alert.title)}</span>
              <ChevronRight aria-hidden size={20} className="flex-none" />
            </Link>
          )}

          {ready && !user && (
            <InfoStrip
              icon={<Info aria-hidden size={20} />}
              action={
                <LinkButton href="/login?next=/community" size="sm" icon={LogIn}>
                  {c.login}
                </LinkButton>
              }
            >
              {c.visitorBanner}
            </InfoStrip>
          )}

          <FilterChips label={c.community} options={chips} value={filter} onChange={setFilter} />

          {!posts ? (
            <div className="flex flex-col gap-4">
              <SkeletonRows rows={2} />
              <SkeletonRows rows={2} />
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Sun}
              title={c.emptyFilter}
              body={c.emptyFilterBody}
              action={
                user && mode === "khan" ? (
                  <Button variant="secondary" size="sm" onClick={() => setMode("city")}>
                    {c.widenArea}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onChange={replace} />
              ))}
              {/* No infinite scroll: the feed ends and offers to widen. */}
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-row font-semibold">{c.upToDate}</p>
                <p className="text-meta text-ink-muted">{c.upToDateBody}</p>
                {user && mode === "khan" && (
                  <Button variant="secondary" size="sm" onClick={() => setMode("city")}>
                    {c.widenArea}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right column (desktop) / end of page (phone) */}
        <aside className="flex flex-col gap-8">
          <Section title={c.events} href="/community">
            {!events ? (
              <SkeletonRows rows={2} />
            ) : (
              <Card padded={false} as="ul">
                {events.map((e) => (
                  <EventRow key={e.id} post={e} />
                ))}
              </Card>
            )}
          </Section>
          <Section title={user ? c.myGroups : c.groups} href="/community/groups">
            {!groups ? (
              <SkeletonRows rows={2} />
            ) : (
              <Card padded={false} as="ul">
                {groups.map((g) => (
                  <ListRow
                    key={g.id}
                    icon={Users}
                    accent="reported"
                    href="/community/groups"
                    title={tx(g.name)}
                    subtitle={`${fmt(c.members, { n: g.memberCount })} · ${fmt(c.postsN, { n: g.postCount })}`}
                  />
                ))}
              </Card>
            )}
          </Section>
          <Card padded={false} as="ul">
            <ListRow icon={Building2} accent="fixed" href="/services" title={c.servicesTitle} subtitle={c.servicesHint} />
            <ListRow icon={BookOpen} accent="fixed" href="/guides" title={c.guidesTitle} subtitle={c.guidesHint} />
          </Card>
        </aside>
      </div>

      {/* Phone: New post sits above the SOS button, in the thumb zone. */}
      <button
        type="button"
        onClick={newPost}
        className={buttonClass("primary", "lg", "fixed right-4 bottom-[156px] z-20 rounded-2xl shadow-raised lg:hidden")}
      >
        {user ? <Plus aria-hidden size={22} /> : <LogIn aria-hidden size={22} />}
        {user ? c.newPost : c.loginToPost}
      </button>

      {areaOpen && (
        <Sheet title={c.chooseArea} icon={<MapPin aria-hidden size={22} />} onClose={() => setAreaOpen(false)}>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={c.chooseArea}>
            {(
              [
                ["khan", city ? tx(city.name) : c.areaKhan, c.areaKhan],
                ["city", province ? tx(province.name) : c.areaCity, c.areaCity],
              ] as const
            ).map(([m, name, hint]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setMode(m);
                  setAreaOpen(false);
                }}
                className={`flex min-h-14 flex-col items-start justify-center rounded-xl px-4 text-left ring-inset ${
                  mode === m ? "bg-primary-tint ring-2 ring-primary" : "bg-surface ring-1 ring-line-strong"
                }`}
              >
                <span className="text-body font-semibold">{name}</span>
                <span className="text-meta text-ink-muted">{hint}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet}
    </PageContainer>
  );
}

function EventRow({ post }: { post: CsPostView }) {
  const { c, locale } = useCs();
  const when = post.event ? formatDateParts(post.event.start, locale) : null;
  return (
    <li className="list-none border-b border-line last:border-b-0">
      <Link href={`/community/posts/${post.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-sand">
        {when && (
          <span className="flex w-13 flex-none flex-col items-center rounded-xl bg-reported-tint py-1 text-reported-ink">
            <span className="text-caption font-semibold">{when.weekday}</span>
            <span className="text-title leading-tight font-extrabold">{when.day}</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-body leading-snug font-semibold">{post.title}</span>
          <span className="mt-0.5 block text-meta text-ink-muted">
            {when?.time} · {fmt(c.goingCount, { n: post.event?.goingCount ?? 0 })}
          </span>
        </span>
      </Link>
    </li>
  );
}
