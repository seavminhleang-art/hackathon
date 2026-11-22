"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChartColumn,
  Check,
  CircleCheck,
  MapPin,
  MessageCircle,
  MessageCircleQuestion,
  Pin,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button, IconTile, LinkButton } from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import { formatDateParts, shortDate } from "@/lib/i18n/format";
import type { CsPostType, CsPostView, CsRsvp } from "@/types/community";
import { useCs, type CsDict } from "./i18n";
import { OfficialBadge, ReportButton, timeAgo, useLoginGate } from "./shared";

export const POST_ICON: Record<CsPostType, LucideIcon> = {
  EVENT: CalendarDays,
  QUESTION: MessageCircleQuestion,
  POLL: ChartColumn,
  DISCUSSION: MessageCircle,
};

export const typeLabel = (t: CsPostType, c: CsDict) => c[`type${t}` as keyof CsDict];

/** "Wed 26 Nov · 15:00–16:30" */
export function eventWhen(start: string, end: string, locale: "km" | "en") {
  const s = formatDateParts(start, locale);
  const e = formatDateParts(end, locale);
  return `${s.weekday} ${s.day} ${s.month} · ${s.time}–${e.time}`;
}

/** RSVP buttons, shared by the card and the detail page. */
export function RsvpButtons({
  post,
  onChange,
  size = "md",
}: {
  post: CsPostView;
  onChange: (p: CsPostView) => void;
  size?: "md" | "lg";
}) {
  const { c } = useCs();
  const { gate, sheet } = useLoginGate();
  const [busy, setBusy] = useState(false);
  const ev = post.event;
  if (!ev) return null;
  const mine = ev.myRsvp;

  const set = (answer: CsRsvp | null) =>
    gate(c.actRsvp, async () => {
      setBusy(true);
      try {
        onChange(await api.cs.rsvp(post.id, answer));
      } finally {
        setBusy(false);
      }
    });

  if (mine) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-body font-semibold text-fixed-ink">
          <CircleCheck aria-hidden size={20} />
          {mine === "GOING" ? c.youreGoing : c.youreInterested}
        </span>
        <Button variant="ghost" size="sm" onClick={() => set(null)} disabled={busy}>
          {c.change}
        </Button>
        {sheet}
      </div>
    );
  }
  if (ev.full) {
    return <p className="text-body font-semibold text-ink-muted">{c.eventFull}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Button size={size} icon={Check} onClick={() => set("GOING")} disabled={busy}>
        {c.going}
      </Button>
      <Button size={size} variant="secondary" icon={Star} onClick={() => set("INTERESTED")} disabled={busy}>
        {c.interested}
      </Button>
      {sheet}
    </div>
  );
}

/**
 * One post in the Board feed. Whole title links to the detail page; type-specific
 * action sits under it (RSVP for events, Vote for polls, Answer for questions).
 */
export function PostCard({ post, onChange }: { post: CsPostView; onChange: (p: CsPostView) => void }) {
  const { c, tx, locale } = useCs();
  const Icon = POST_ICON[post.type];
  const href = `/community/posts/${post.id}`;
  const ev = post.event;
  const poll = post.poll;
  const hasBest = post.type === "QUESTION" && !!post.acceptedCommentId;

  return (
    <article
      className={`flex flex-col gap-3.5 rounded-2xl bg-surface p-4 shadow-card lg:p-5 ${post.pinned ? "ring-2 ring-primary/25" : ""}`}
    >
      {post.pinned && (
        <p className="-mt-1 flex items-center gap-1.5 text-meta font-semibold text-primary">
          <Pin aria-hidden size={15} />
          {fmt(c.pinnedBy, { name: post.author.name })}
        </p>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3">
        <IconTile icon={Icon} accent="reported" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta">
            <span className="font-semibold text-ink">{post.author.name}</span>
            {post.author.official && <OfficialBadge />}
          </p>
          <p className="text-meta text-ink-muted">
            {typeLabel(post.type, c)}
            {post.groupName && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <Users aria-hidden size={13} />
                  {tx(post.groupName)}
                </span>
              </>
            )}
            {" · "}
            {timeAgo(post.createdAt, c)}
          </p>
        </div>
      </div>

      <Link href={href} className="flex flex-col gap-1.5 hover:underline-offset-4 [&:hover_.t]:underline">
        <h3 className="t text-row leading-snug font-bold">{post.title}</h3>
        {post.type !== "EVENT" && post.type !== "POLL" && <p className="line-clamp-2 text-body text-ink-muted">{post.body}</p>}
      </Link>

      {ev && (
        <div className="flex flex-col gap-1 rounded-xl bg-sand p-3 text-meta">
          <span className="flex items-center gap-2 font-semibold">
            <CalendarDays aria-hidden size={16} className="text-reported-ink" />
            {eventWhen(ev.start, ev.end, locale)}
          </span>
          <span className="flex items-center gap-2">
            <MapPin aria-hidden size={16} className="text-reported-ink" />
            {ev.place}
          </span>
          <span className="flex items-center gap-2 text-ink-muted">
            <Users aria-hidden size={16} />
            {fmt(c.goingCount, { n: ev.goingCount })}
            {ev.capacity ? ` · ${fmt(c.placesLeft, { n: Math.max(0, ev.capacity - ev.goingCount) })}` : ""}
          </span>
        </div>
      )}

      {poll && (
        <div className="flex flex-col gap-1.5">
          <p className="text-meta text-ink-muted">
            {poll.options.length} {c.options.toLowerCase()} · {poll.closed ? c.pollClosed : fmt(c.closesOn, { date: shortDate(poll.closesAt, locale) })}
          </p>
          {!poll.myVote && !poll.closed && <p className="text-meta font-medium">{c.resultsAfterVote}</p>}
        </div>
      )}

      {hasBest && (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-fixed-tint px-3 py-1 text-meta font-semibold text-fixed-ink">
          <CircleCheck aria-hidden size={15} />
          {c.hasBestAnswer}
        </span>
      )}

      {/* Primary action per type */}
      {ev && <RsvpButtons post={post} onChange={onChange} />}
      {poll && (
        <div>
          <LinkButton href={href} variant={poll.myVote || poll.closed ? "secondary" : "primary"} size="md" icon={ChartColumn}>
            {poll.myVote || poll.closed ? fmt(c.votes, { n: poll.totalVotes ?? 0 }) : c.vote}
          </LinkButton>
        </div>
      )}
      {post.type === "QUESTION" && (
        <div>
          <LinkButton href={`${href}#answer`} variant="secondary" icon={MessageCircleQuestion}>
            {c.answer}
          </LinkButton>
        </div>
      )}

      {/* Footer */}
      <div className="-mx-2 -mb-1 flex items-center justify-between border-t border-line pt-1.5">
        <Link href={`${href}#comments`} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-meta font-semibold text-ink-muted hover:bg-sand-deep">
          <MessageCircle aria-hidden size={16} />
          {fmt(c.comments, { n: post.commentCount })}
        </Link>
        <ReportButton targetType="POST" targetId={post.id} />
      </div>
    </article>
  );
}
