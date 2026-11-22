"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, Lightbulb, MessageCircle, Reply, Send, ThumbsUp } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Card, SkeletonRows } from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import type { CsCommentTarget, CsCommentView, CsReaction } from "@/types/community";
import { useCs } from "./i18n";
import { Avatar, OfficialBadge, ReportButton, timeAgo, useLoginGate } from "./shared";

/** Like / Helpful with text labels. Counts sit beside the label, never as a headline. */
export function ReactionButtons({
  counts,
  mine,
  onToggle,
}: {
  counts: Record<CsReaction, number>;
  mine: CsReaction[];
  onToggle: (r: CsReaction) => void;
}) {
  const { c } = useCs();
  const items: { r: CsReaction; label: string; Icon: typeof ThumbsUp }[] = [
    { r: "LIKE", label: c.like, Icon: ThumbsUp },
    { r: "HELPFUL", label: c.helpful, Icon: Lightbulb },
  ];
  return (
    <>
      {items.map(({ r, label, Icon }) => {
        const on = mine.includes(r);
        return (
          <button
            key={r}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(r)}
            className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-meta font-semibold ${
              on ? "bg-primary-tint text-primary" : "text-ink-muted hover:bg-sand-deep hover:text-ink"
            }`}
          >
            <Icon aria-hidden size={16} />
            {label}
            {counts[r] > 0 && <span className="tabular-nums">· {counts[r]}</span>}
          </button>
        );
      })}
    </>
  );
}

function Composer({
  placeholder,
  onSend,
  autoFocus,
}: {
  placeholder: string;
  onSend: (body: string) => Promise<void>;
  autoFocus?: boolean;
}) {
  const { c } = useCs();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(body.trim());
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={2}
          autoFocus={autoFocus}
          className="min-h-12 flex-1 resize-y rounded-xl bg-surface px-3.5 py-3 text-body ring-1 ring-line-strong ring-inset placeholder:text-ink-muted/70 focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <Button type="submit" icon={Send} disabled={busy || !body.trim()}>
          {c.send}
        </Button>
      </div>
      {error && <p className="text-meta font-medium text-danger">{error}</p>}
    </form>
  );
}

function CommentItem({
  comment,
  onReply,
  onReact,
  accept,
  isReply,
}: {
  comment: CsCommentView;
  onReply?: () => void;
  onReact: (id: string, r: CsReaction) => void;
  accept?: { canAccept: boolean; onAccept: (id: string | null) => void };
  isReply?: boolean;
}) {
  const { c } = useCs();
  return (
    <div
      className={`flex gap-3 ${comment.accepted ? "rounded-2xl bg-fixed-tint/60 p-3 ring-2 ring-fixed" : ""} ${isReply ? "pl-0" : ""}`}
    >
      <Avatar name={comment.author.name} official={comment.author.official} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body font-semibold">{comment.author.name}</span>
          {comment.author.official && <OfficialBadge />}
          <span className="text-meta text-ink-muted">{timeAgo(comment.createdAt, c)}</span>
        </div>
        {comment.accepted && (
          <p className="mt-1 flex items-center gap-1.5 text-meta font-semibold text-fixed-ink">
            <CircleCheck aria-hidden size={16} />
            {c.bestAnswer} · {c.chosenByAsker}
          </p>
        )}
        <p className="mt-1 text-body whitespace-pre-line">{comment.body}</p>
        <div className="mt-1 -ml-2 flex flex-wrap items-center">
          <ReactionButtons counts={comment.reactionCounts} mine={comment.myReactions} onToggle={(r) => onReact(comment.id, r)} />
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-meta font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink"
            >
              <Reply aria-hidden size={16} />
              {c.reply}
            </button>
          )}
          {accept?.canAccept && (
            <button
              type="button"
              onClick={() => accept.onAccept(comment.accepted ? null : comment.id)}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-meta font-semibold text-fixed-ink hover:bg-fixed-tint"
            >
              <CircleCheck aria-hidden size={16} />
              {comment.accepted ? c.unmarkBest : c.markBest}
            </button>
          )}
          <ReportButton targetType="COMMENT" targetId={comment.id} />
        </div>
      </div>
    </div>
  );
}

/**
 * Threaded comments (one reply level) for posts, guides and announcements.
 * Shows `limit` top-level comments, the rest behind "See all".
 * For QUESTION posts pass `question` so answers can be marked best.
 */
export function CommentThread({
  target,
  targetId,
  enabled = true,
  limit = 3,
  placeholder,
  question,
  title,
  onCount,
}: {
  target: CsCommentTarget;
  targetId: string;
  enabled?: boolean;
  limit?: number;
  placeholder?: string;
  question?: { canAccept: boolean; postId: string };
  title?: string;
  onCount?: (n: number) => void;
}) {
  const { c } = useCs();
  const { gate, sheet } = useLoginGate();
  const [items, setItems] = useState<CsCommentView[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await api.cs.listComments(target, targetId).catch(() => []);
    setItems(rows);
    onCount?.(rows.reduce((n, r) => n + 1 + r.replies.length, 0));
  }, [target, targetId, onCount]);

  useEffect(() => {
    let alive = true;
    api.cs
      .listComments(target, targetId)
      .catch(() => [])
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        onCount?.(rows.reduce((n, r) => n + 1 + r.replies.length, 0));
      });
    return () => {
      alive = false;
    };
  }, [target, targetId, onCount]);

  const react = (id: string, r: CsReaction) =>
    gate(c.actReact, async () => {
      await api.cs.toggleReaction("COMMENT", id, r);
      await load();
    });

  const accept = question
    ? {
        canAccept: question.canAccept,
        onAccept: async (id: string | null) => {
          await api.cs.acceptAnswer(question.postId, id);
          await load();
        },
      }
    : undefined;

  const total = items?.length ?? 0;
  const visible = items ? (showAll ? items : items.slice(0, limit)) : [];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-title font-bold">
        <MessageCircle aria-hidden size={22} className="text-ink-muted" />
        {title ?? fmt(c.comments, { n: items ? items.reduce((n, r) => n + 1 + r.replies.length, 0) : "…" })}
      </h2>

      {enabled ? (
        <GatedComposer
            placeholder={placeholder ?? c.writeComment}
            onSend={async (body) => {
              await api.cs.addComment(target, targetId, { body });
              await load();
              setShowAll(true);
            }}
          />
      ) : (
        <p className="rounded-xl bg-sand-deep px-4 py-3 text-meta text-ink-muted">{c.commentsOff}</p>
      )}

      {!items ? (
        <SkeletonRows rows={2} />
      ) : total === 0 ? (
        enabled && <p className="text-meta text-ink-muted">{c.noComments}</p>
      ) : (
        <Card className="flex flex-col gap-5">
          {visible.map((cm) => (
            <div key={cm.id} className="flex flex-col gap-4 border-b border-line pb-5 last:border-b-0 last:pb-0">
              <CommentItem
                comment={cm}
                onReact={react}
                accept={accept}
                onReply={enabled ? () => gate(c.actComment, () => setReplyTo(replyTo === cm.id ? null : cm.id)) : undefined}
              />
              {(cm.replies.length > 0 || replyTo === cm.id) && (
                <div className="ml-6 flex flex-col gap-4 border-l-2 border-line pl-4 sm:ml-12">
                  {cm.replies.map((r) => (
                    <CommentItem key={r.id} comment={r} onReact={react} isReply />
                  ))}
                  {replyTo === cm.id && (
                    <Composer
                      autoFocus
                      placeholder={c.writeComment}
                      onSend={async (body) => {
                        await api.cs.addComment(target, targetId, { body, parentId: cm.id });
                        setReplyTo(null);
                        await load();
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
          {!showAll && total > limit && (
            <Button variant="secondary" onClick={() => setShowAll(true)} block>
              {fmt(c.seeAllComments, { n: total })}
            </Button>
          )}
        </Card>
      )}
      {sheet}
    </section>
  );
}

/** Composer that asks visitors to log in instead of letting them type. */
function GatedComposer({ placeholder, onSend }: { placeholder: string; onSend: (body: string) => Promise<void> }) {
  const { c } = useCs();
  const { gate, sheet, loggedIn } = useLoginGate();
  if (!loggedIn) {
    return (
      <>
        <button
          type="button"
          onClick={() => gate(c.actComment, () => undefined)}
          className="flex min-h-12 w-full items-center rounded-xl bg-surface px-3.5 text-left text-body text-ink-muted ring-1 ring-line-strong ring-inset"
        >
          {placeholder}
        </button>
        {sheet}
      </>
    );
  }
  return <Composer placeholder={placeholder} onSend={onSend} />;
}
