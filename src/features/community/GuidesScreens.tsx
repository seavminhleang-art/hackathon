"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  FileText,
  IdCard,
  Car,
  Users,
  Banknote,
  Landmark,
  MessageCircleQuestion,
  Search,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, FilterChips, IconTile, LinkButton, ListRow, SkeletonRows } from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import type { CsGuideCategory, CsGuideView, CsPlaceView } from "@/types/community";
import { CommentThread } from "./Comments";
import { useCs, type CsDict } from "./i18n";
import { openStatus } from "./ServicesScreens";
import { useCommunityHref } from "./shared";

const CAT_ICON: Partial<Record<CsGuideCategory, LucideIcon>> = {
  IDENTITY: IdCard,
  CIVIL_REGISTRATION: Users,
  VEHICLE: Car,
};

// ---------- /guides ----------

/** Find the paperwork guide I need. Search + categories (wireframe 8a). */
export function GuidesScreen() {
  const { c, tx } = useCs();
  const href = useCommunityHref();
  const { ready } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"ALL" | CsGuideCategory>("ALL");
  const [all, setAll] = useState<CsGuideView[] | null>(null);
  const [rows, setRows] = useState<CsGuideView[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    api.cs.listGuides().then(setAll);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const t = setTimeout(() => {
      api.cs.listGuides({ q: q || undefined, category: cat === "ALL" ? undefined : cat }).then((g) => alive && setRows(g));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [ready, q, cat]);

  const cats = [...new Set((all ?? []).map((g) => g.category))];

  return (
    <PageContainer className="max-w-4xl">
      <Link href={href("/services")} className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
        <ArrowLeft aria-hidden size={20} />
        {c.servicesTitle}
      </Link>
      <header className="pb-5">
        <h1 className="text-page leading-tight font-bold lg:text-display">{c.guidesTitle}</h1>
        <p className="mt-1 text-body text-ink-muted">{c.guidesHint}</p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search aria-hidden size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={c.searchGuides}
            aria-label={c.searchGuides}
            className="min-h-13 w-full rounded-xl bg-surface pr-4 pl-12 text-body shadow-card ring-1 ring-line ring-inset focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <FilterChips
          label={c.guidesTitle}
          value={cat}
          onChange={setCat}
          options={[{ value: "ALL" as const, label: c.all, icon: BookOpen }, ...cats.map((x) => ({ value: x, label: c[`c${x}` as keyof CsDict], icon: CAT_ICON[x] }))]}
        />

        {!rows ? (
          <SkeletonRows rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={MessageCircleQuestion}
            title={c.noGuides}
            body={c.noGuidesBody}
            action={
              <LinkButton href={href("/community/new")} variant="secondary" size="sm" icon={MessageCircleQuestion}>
                {c.askOnBoard}
              </LinkButton>
            }
          />
        ) : (
          <Card padded={false} as="ul">
            {rows.map((g) => (
              <ListRow
                key={g.id}
                icon={CAT_ICON[g.category] ?? FileText}
                accent="fixed"
                href={href(`/guides/${g.id}`)}
                title={tx(g.title)}
                subtitle={tx(g.summary)}
                meta={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
                    <span>{fmt(c.stepsDocs, { s: g.steps.length, d: g.requiredDocuments.length })}</span>
                    <span className="flex items-center gap-1">
                      <Clock aria-hidden size={14} />
                      {tx(g.processingTime)}
                    </span>
                  </span>
                }
              />
            ))}
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

// ---------- /guides/[id] ----------

const TICKS_KEY = (id: string) => `cityvoice.guide-ticks.${id}`;

/** Know what to bring and where to go before leaving home (wireframe 8b). */
export function GuideScreen() {
  const { id } = useParams<{ id: string }>();
  const { c, tx } = useCs();
  const href = useCommunityHref();
  const { ready } = useAuth();
  const requireAuth = useRequireAuth();
  const [g, setG] = useState<CsGuideView | null>(null);
  const [places, setPlaces] = useState<CsPlaceView[]>([]);
  const [error, setError] = useState(false);
  const [ticks, setTicks] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.cs
      .getGuide(id)
      .then((r) => {
        if (!alive) return;
        setG(r.guide);
        setPlaces(r.places.slice(0, 3));
      })
      .catch(() => alive && setError(true));
    Promise.resolve().then(() => {
      try {
        if (alive) setTicks(JSON.parse(localStorage.getItem(TICKS_KEY(id)) ?? "[]"));
      } catch {
        /* storage blocked: ticks just won't persist */
      }
    });
    return () => {
      alive = false;
    };
  }, [id, ready]);

  const toggleTick = (i: number) =>
    setTicks((t) => {
      const next = t.includes(i) ? t.filter((x) => x !== i) : [...t, i];
      try {
        localStorage.setItem(TICKS_KEY(id), JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });

  const back = (
    <Link href={href("/guides")} className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
      <ArrowLeft aria-hidden size={20} />
      {c.guidesTitle}
    </Link>
  );
  if (error)
    return (
      <PageContainer>
        {back}
        <EmptyState icon={ShieldAlert} title={c.notFound} body={c.notFoundBody} />
      </PageContainer>
    );
  if (!g)
    return (
      <PageContainer>
        {back}
        <SkeletonRows rows={4} />
      </PageContainer>
    );

  const helpful = (yes: boolean) =>
    requireAuth(async () => {
      setFeedback(yes ? "yes" : "no");
      if (yes !== g.markedHelpful) setG(await api.cs.toggleGuideHelpful(g.id));
    });

  return (
    <PageContainer className="max-w-4xl">
      {back}
      <header className="flex flex-col gap-4">
        <h1 className="text-page leading-tight font-bold lg:text-display">{tx(g.title)}</h1>
        <p className="text-body text-ink-muted">{tx(g.summary)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex items-start gap-3">
            <IconTile icon={Clock} accent="fixed" />
            <span>
              <span className="block text-meta text-ink-muted">{c.processing}</span>
              <span className="block text-row font-semibold">{tx(g.processingTime)}</span>
            </span>
          </Card>
          <Card className="flex items-start gap-3">
            <IconTile icon={Banknote} accent="gold" />
            <span>
              <span className="block text-meta text-ink-muted">{c.fee}</span>
              <span className="block text-row font-semibold">{g.feeRiel ? fmt(c.riel, { n: g.feeRiel.toLocaleString() }) : c.feeVaries}</span>
              <span className="block text-meta font-semibold text-reported-ink">{g.feeNote ? tx(g.feeNote) : c.feeCheck}</span>
            </span>
          </Card>
        </div>
      </header>

      {/* Steps down a vertical line; documents checklist inside step 1, where it's needed. */}
      <section className="mt-8">
        <h2 className="mb-4 text-title font-bold">{c.steps}</h2>
        <ol className="flex flex-col">
          {g.steps.map((s, i) => (
            <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {i < g.steps.length - 1 && <span className="absolute top-11 bottom-0 left-[21px] w-0.5 bg-line-strong" aria-hidden />}
              <span className="z-10 flex size-11 flex-none items-center justify-center rounded-full bg-primary text-row font-bold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1 pt-2">
                <p className="text-row font-semibold">{tx(s.title)}</p>
                {s.detail && <p className="mt-1 text-body text-ink-muted">{tx(s.detail)}</p>}
                {i === 0 && g.requiredDocuments.length > 0 && (
                  <Card className="mt-3">
                    <p className="text-body font-bold">{c.documents}</p>
                    <ul className="mt-2 flex flex-col">
                      {g.requiredDocuments.map((d, j) => {
                        const on = ticks.includes(j);
                        return (
                          <li key={j} className="list-none">
                            <label className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-line text-body last:border-b-0">
                              <input type="checkbox" checked={on} onChange={() => toggleTick(j)} className="peer sr-only" />
                              <span
                                className={`flex size-6 flex-none items-center justify-center rounded-md ring-2 peer-focus-visible:outline-3 peer-focus-visible:outline-gold ${
                                  on ? "bg-fixed text-white ring-fixed" : "ring-line-strong"
                                }`}
                              >
                                {on && <Check aria-hidden size={16} strokeWidth={3} />}
                              </span>
                              <span className={on ? "text-ink-muted line-through" : ""}>{tx(d)}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-caption text-ink-muted">{c.docsSaved}</p>
                  </Card>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {places.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-title font-bold">{c.whereToGo}</h2>
          <Card padded={false} as="ul">
            {places.map((p) => {
              const st = openStatus(p.hours, c);
              return (
                <ListRow
                  key={p.id}
                  icon={Landmark}
                  accent="fixed"
                  href={href(`/services/${p.id}`)}
                  title={tx(p.name)}
                  subtitle={p.address}
                  meta={<span className={`text-meta font-semibold ${st.open ? "text-fixed-ink" : "text-ink-muted"}`}>{st.text}</span>}
                />
              );
            })}
          </Card>
        </section>
      )}

      <section className="mt-8">
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-row font-semibold">{feedback ? c.thanksFeedback : c.wasHelpful}</p>
            <p className="text-meta text-ink-muted">{fmt(c.helpfulCount, { n: g.helpfulCount })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant={feedback === "yes" || g.markedHelpful ? "primary" : "secondary"} icon={ThumbsUp} onClick={() => helpful(true)}>
              {c.yes}
            </Button>
            <Button variant={feedback === "no" ? "primary" : "secondary"} icon={ThumbsDown} onClick={() => helpful(false)}>
              {c.notReally}
            </Button>
          </div>
        </Card>
        <p className="mt-3 text-meta text-ink-muted">{fmt(c.sourceLine, { name: g.sourceName, date: g.lastVerified })}</p>
      </section>

      <div className="mt-8">
        <CommentThread target="GUIDE" targetId={g.id} title={c.qa} placeholder={c.askQuestion} limit={1} />
      </div>
    </PageContainer>
  );
}
