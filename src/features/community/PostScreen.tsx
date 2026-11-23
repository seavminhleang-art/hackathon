"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ChartColumn, CircleCheck, MapPin, Navigation, Share2, ShieldAlert, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, IconTile, LinkButton, SkeletonRows, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import { shortDate } from "@/lib/i18n/format";
import type { CsPostView, CsReaction } from "@/types/community";
import { CommentThread, ReactionButtons } from "./Comments";
import { useCs } from "./i18n";
import { POST_ICON, RsvpButtons, eventWhen, typeLabel } from "./PostCard";
import { OfficialBadge, ReportButton, mapsUrl, scopeLabel, timeAgo, useAreas, useCommunityHref, useLoginGate } from "./shared";

/** /community/posts/[id] · Event, Poll, Question or Discussion (wireframes 4a–4i). */
export function PostScreen() {
  const { id } = useParams<{ id: string }>();
  const { c, tx, locale } = useCs();
  const href = useCommunityHref();
  const { user, ready } = useAuth();
  const areas = useAreas();
  const { gate, sheet } = useLoginGate();
  const [post, setPost] = useState<CsPostView | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.cs
      .getPost(id)
      .then((p) => alive && setPost(p))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id, ready, user]);

  if (error) {
    return (
      <PageContainer>
        <BackLink />
        <EmptyState
          icon={ShieldAlert}
          title={c.notFound}
          body={c.notFoundBody}
          action={<LinkButton href={href("/community")} variant="secondary" size="sm">{c.board}</LinkButton>}
        />
      </PageContainer>
    );
  }

  if (!post) {
    return (
      <PageContainer>
        <BackLink />
        <div className="flex flex-col gap-4">
          <div className="h-9 w-2/3 animate-pulse rounded-lg bg-sand-deep" />
          <SkeletonRows rows={3} />
        </div>
      </PageContainer>
    );
  }

  const Icon = POST_ICON[post.type];
  const ev = post.event;

  const react = (r: CsReaction) =>
    gate(c.actReact, async () => {
      const res = await api.cs.toggleReaction("POST", post.id, r);
      setPost({ ...post, reactionCounts: res.counts, myReactions: res.mine });
    });

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: post!.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
      }
    } catch {
      /* cancelled */
    }
  }

  const eventCard = ev && (
    <Card className="flex flex-col gap-4 lg:sticky lg:top-24">
      <div className="flex flex-col gap-2.5 text-body">
        <span className="flex items-start gap-3">
          <CalendarDays aria-hidden size={20} className="mt-0.5 flex-none text-reported-ink" />
          <span className="font-semibold">{eventWhen(ev.start, ev.end, locale)}</span>
        </span>
        <span className="flex items-start gap-3">
          <MapPin aria-hidden size={20} className="mt-0.5 flex-none text-reported-ink" />
          <span>{ev.place}</span>
        </span>
        <span className="flex items-start gap-3">
          <Users aria-hidden size={20} className="mt-0.5 flex-none text-reported-ink" />
          <span>
            {fmt(c.goingCount, { n: ev.goingCount })}
            {ev.capacity ? ` · ${fmt(c.placesLeft, { n: Math.max(0, ev.capacity - ev.goingCount) })}` : ""}
          </span>
        </span>
      </div>
      {ev.capacity ? (
        <div className="h-2 overflow-hidden rounded-full bg-sand-deep" aria-hidden>
          <div className="h-full rounded-full bg-reported" style={{ width: `${Math.min(100, (ev.goingCount / ev.capacity) * 100)}%` }} />
        </div>
      ) : null}
      {ev.location && (
        <a href={mapsUrl(ev.location.lat, ev.location.lng)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "self-start")}>
          <Navigation aria-hidden size={16} />
          {c.directions}
        </a>
      )}
      <div className="border-t border-line pt-4">
        <RsvpButtons post={post} onChange={setPost} size="lg" />
        <p className="mt-2.5 text-meta text-ink-muted">{c.rsvpPrivacy}</p>
      </div>
    </Card>
  );

  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-2">
        <BackLink />
        <Button variant="ghost" size="sm" icon={Share2} onClick={share}>
          {copied ? c.linkCopied : c.share}
        </Button>
      </div>

      <div className={`grid gap-8 ${ev ? "lg:grid-cols-3 lg:gap-10" : ""}`}>
        <div className={`flex min-w-0 flex-col gap-6 ${ev ? "lg:col-span-2" : "max-w-3xl"}`}>
          {/* Context + title */}
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <IconTile icon={Icon} accent="reported" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 text-meta">
                  <span className="font-semibold">{post.author.name}</span>
                  {post.author.official && <OfficialBadge />}
                </p>
                <p className="text-meta text-ink-muted">
                  {typeLabel(post.type, c)}
                  {post.groupName ? ` · ${tx(post.groupName)}` : ""} · {scopeLabel(post.scope, areas, locale, c)} · {timeAgo(post.createdAt, c)}
                </p>
              </div>
            </div>
            <h1 className="text-page leading-tight font-bold">{post.title}</h1>
            <p className="text-body whitespace-pre-line">{post.body}</p>
          </header>

          {ev && <div className="lg:hidden">{eventCard}</div>}
          {post.poll && <PollBlock post={post} onChange={setPost} />}

          <div className="-mx-2 flex flex-wrap items-center justify-between border-y border-line py-1.5">
            <div className="flex flex-wrap">
              <ReactionButtons counts={post.reactionCounts} mine={post.myReactions} onToggle={react} />
            </div>
            <ReportButton targetType="POST" targetId={post.id} />
          </div>

          <div id={post.type === "QUESTION" ? "answer" : "comments"} className="scroll-mt-24">
            <CommentThread
              target="POST"
              targetId={post.id}
              placeholder={post.type === "QUESTION" ? c.writeAnswer : c.writeComment}
              title={post.type === "QUESTION" ? c.answerThis : undefined}
              question={post.type === "QUESTION" ? { postId: post.id, canAccept: !!user && post.author.id === user.id } : undefined}
            />
          </div>
        </div>

        {ev && <aside className="hidden lg:block">{eventCard}</aside>}
      </div>
      {sheet}
    </PageContainer>
  );
}

function BackLink() {
  const { c } = useCs();
  const href = useCommunityHref();
  return (
    <Link href={href("/community")} className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
      <ArrowLeft aria-hidden size={20} />
      {c.board}
    </Link>
  );
}

/** Poll: radio cards → Vote; after voting (or when closed) bars with % and counts. */
function PollBlock({ post, onChange }: { post: CsPostView; onChange: (p: CsPostView) => void }) {
  const { c, locale } = useCs();
  const { gate, sheet } = useLoginGate();
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const poll = post.poll!;
  const showResults = poll.closed || !!poll.myVote;
  const total = poll.totalVotes ?? 0;

  const vote = () =>
    gate(c.actVote, async () => {
      if (!pick) return;
      setBusy(true);
      try {
        onChange(await api.cs.votePoll(post.id, pick));
      } finally {
        setBusy(false);
      }
    });

  return (
    <Card className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-meta text-ink-muted">
        <ChartColumn aria-hidden size={16} />
        {poll.closed ? c.pollClosed : fmt(c.closesOn, { date: shortDate(poll.closesAt, locale) })}
        {showResults && ` · ${fmt(c.votes, { n: total })}`}
      </p>

      {showResults ? (
        <ul className="flex flex-col gap-3">
          {poll.options.map((o) => {
            const votes = o.votes ?? 0;
            const pct = total ? Math.round((votes / total) * 100) : 0;
            const mine = poll.myVote === o.id;
            return (
              <li key={o.id} className={`rounded-xl p-3 ${mine ? "ring-2 ring-primary" : "ring-1 ring-line-strong"} ring-inset`}>
                <div className="flex items-center justify-between gap-3 text-body">
                  <span className="font-semibold">
                    {o.label}
                    {mine && (
                      <span className="ml-2 inline-flex items-center gap-1 text-meta text-primary">
                        <CircleCheck aria-hidden size={15} />
                        {c.yourChoice}
                      </span>
                    )}
                  </span>
                  <span className="text-meta text-ink-muted tabular-nums">
                    {pct}% · {votes}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sand-deep" aria-hidden>
                  <div className={`h-full rounded-full ${mine ? "bg-primary" : "bg-ink-muted/50"}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={post.title}>
            {poll.options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={pick === o.id}
                onClick={() => setPick(o.id)}
                className={`flex min-h-14 items-center gap-3 rounded-xl px-4 text-left text-body font-semibold ring-inset ${
                  pick === o.id ? "bg-primary-tint text-primary ring-2 ring-primary" : "bg-surface ring-1 ring-line-strong"
                }`}
              >
                <span className={`flex size-5 flex-none items-center justify-center rounded-full ring-2 ${pick === o.id ? "ring-primary" : "ring-line-strong"}`}>
                  {pick === o.id && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-meta text-ink-muted">{c.resultsAfterVote}</p>
          <Button size="lg" onClick={vote} disabled={!pick || busy} block>
            {c.vote}
          </Button>
        </>
      )}
      {sheet}
    </Card>
  );
}
