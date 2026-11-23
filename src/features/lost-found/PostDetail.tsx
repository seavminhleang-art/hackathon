"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, Check, Flag, KeyRound, MapPin, MessageCircle, Phone, Search, ShieldAlert, ShieldCheck, X } from "lucide-react";
import check from "react-useanimations/lib/check";
import send from "react-useanimations/lib/send";
import { toast } from "react-toastify";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, IconTile, LinkButton, Photo, SkeletonRows, StatusChip, TextArea, TextField, type ChipStatus } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { shortDate } from "@/lib/i18n/format";
import type { LfCategoryMeta, LfClaimForClaimant, LfClaimForFinder, LfContact, LfPublicComment, LfPublicPost } from "@/types";

/** Post status → chip (POSTED shows nothing extra: the LOST/FOUND chip says enough). */
const POST_CHIP: Partial<Record<LfPublicPost["status"], ChipStatus>> = {
  CLAIM_PENDING: "PENDING",
  APPROVED: "APPROVED",
  RETURNED: "COMPLETED",
  EXPIRED: "EXPIRED",
};

/**
 * /lost-found/[id] · photo, details, and the one action that fits the viewer:
 * claim (FOUND, not mine) · review claims + mark returned (mine) · comments / sightings (everyone).
 * Contact details appear only after a claim is approved (the API decides).
 */
export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, tx, locale } = useLocale();
  const { user, ready } = useAuth();
  const [post, setPost] = useState<LfPublicPost | null>(null);
  const [missing, setMissing] = useState(false);
  const [categories, setCategories] = useState<LfCategoryMeta[]>([]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.lf
      .getPost(decodeURIComponent(id))
      .then((p) => alive && setPost(p))
      .catch(() => alive && setMissing(true));
    api.lf.getCategories().then((c) => alive && setCategories(c));
    return () => {
      alive = false;
    };
  }, [id, ready, user]);

  const back = (
    <Link href="/lost-found" className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
      <ArrowLeft aria-hidden size={20} />
      {t.lfBackToList}
    </Link>
  );

  if (missing)
    return (
      <PageContainer>
        {back}
        <EmptyState icon={Search} title={t.lfNotFound} action={<LinkButton href="/lost-found" variant="secondary" size="sm">{t.lfBackToList}</LinkButton>} />
      </PageContainer>
    );
  if (!post)
    return (
      <PageContainer>
        {back}
        <SkeletonRows rows={4} />
      </PageContainer>
    );

  const meta = categories.find((c) => c.id === post.category);
  const sensitive = meta?.sensitive ?? false;
  const kindIcon = post.kind === "FOUND" ? KeyRound : Search;
  const accent = post.kind === "FOUND" ? "gold" : "reported";
  const statusChip = POST_CHIP[post.status];

  return (
    <PageContainer>
      {back}
      <div className="grid items-start gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={post.kind} />
              {statusChip && <StatusChip status={statusChip} />}
              {meta && <span className="text-meta text-ink-muted">{tx(meta.label)}</span>}
            </div>
            <h1 className="text-page leading-tight font-bold lg:text-display">{post.title}</h1>
          </header>

          {sensitive && post.photoUrls.length === 0 ? (
            <p className="flex items-center gap-3 rounded-2xl bg-sand-deep px-4 py-3 text-meta text-ink">
              <ShieldCheck aria-hidden size={20} className="flex-none text-fixed" />
              {t.lfPhotoPrivate}
            </p>
          ) : (
            <Photo src={post.photoUrls[0]} alt={post.title} icon={kindIcon} accent={accent} className="max-w-2xl" />
          )}

          <Card>
            <p className="text-body whitespace-pre-line">{post.description}</p>
          </Card>

          <Comments post={post} />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Card padded={false} as="ul">
            <Fact icon={MapPin} label={t.lfPlaceLabel} value={post.place} />
            <Fact icon={CalendarDays} label={t.lfEventDate} value={shortDate(`${post.eventDate}T12:00:00+07:00`, locale)} />
            <Fact icon={MessageCircle} label={t.lfComments} value={String(post.commentCount)} />
          </Card>
          {post.isMine ? (
            post.kind === "FOUND" && <OwnerClaims post={post} onChange={setPost} />
          ) : post.kind === "FOUND" ? (
            <ClaimBox post={post} />
          ) : (
            <p className="rounded-2xl bg-reported-tint px-4 py-3 text-meta text-reported-ink">{t.lfLostHelp}</p>
          )}
          <p className="text-meta text-ink-muted">{fmt(t.lfPostedOn, { date: shortDate(post.createdAt, locale) })}</p>
          {!post.isMine && user && <ReportPostButton postId={post.id} />}
        </aside>
      </div>
    </PageContainer>
  );
}

function Fact({ icon, label, value }: { icon: typeof MapPin; label: string; value: ReactNode }) {
  return (
    <li className="flex list-none items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
      <IconTile icon={icon} accent="neutral" size="sm" />
      <span className="min-w-0">
        <span className="block text-meta text-ink-muted">{label}</span>
        <span className="block text-body font-semibold">{value}</span>
      </span>
    </li>
  );
}

function ContactCard({ title, contact }: { title: string; contact: LfContact }) {
  return (
    <div className="rounded-xl bg-fixed-tint px-4 py-3">
      <p className="text-meta font-semibold text-fixed-ink">{title}</p>
      <p className="text-body font-semibold text-ink">{contact.fullName}</p>
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className="mt-1 inline-flex min-h-11 items-center gap-2 text-body font-semibold text-primary-ink">
          <Phone aria-hidden size={18} />
          {contact.phone}
        </a>
      )}
      {contact.email && <p className="text-meta text-ink-muted">{contact.email}</p>}
    </div>
  );
}

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Someone else's FOUND post: claim it (or see the claim already sent). */
function ClaimBox({ post }: { post: LfPublicPost }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [mine, setMine] = useState<LfClaimForClaimant | null | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.lf
      .myClaims()
      .then((rows) => alive && setMine(rows.filter((c) => c.postId === post.id).at(-1) ?? null))
      .catch(() => alive && setMine(null));
    return () => {
      alive = false;
    };
  }, [user, post.id]);

  if (!user)
    return (
      <Button size="lg" icon={check} onClick={() => requireAuth()} block>
        {t.lfClaimTitle}
      </Button>
    );
  if (mine === undefined) return <SkeletonRows rows={1} />;

  if (mine && mine.status !== "REJECTED")
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-row font-bold">{t.lfYourClaim}</h2>
          <StatusChip status={mine.status} />
        </div>
        <p className="text-meta text-ink-muted">{mine.description}</p>
        {mine.finderContact && <ContactCard title={t.lfFinderContact} contact={mine.finderContact} />}
      </Card>
    );

  if (post.status !== "POSTED" && post.status !== "CLAIM_PENDING") return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!description.trim() || (post.hasSecret && !answer.trim())) return setError(t.lfDescriptionRequired);
    setBusy(true);
    setError(null);
    try {
      setMine(await api.lf.claimPost(post.id, { description: description.trim(), answer: answer.trim() || undefined }));
      toast.success(t.lfClaimSent);
    } catch (e) {
      setError(errText(e, t.errGeneric));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
          <h2 className="text-title font-bold">{t.lfClaimTitle}</h2>
          <p className="mt-1 text-meta text-ink-muted">{t.lfClaimHint}</p>
        </div>
        {mine?.status === "REJECTED" && <p className="text-meta font-medium text-reported-ink">{fmt(t.lfAttemptsLeft, { n: mine.attemptsLeft })}</p>}
        <TextArea label={t.lfClaimDescription} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        {post.hasSecret && <TextField label={post.secretQuestion ?? t.lfClaimAnswer} value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" />}
        {error && (
          <p role="alert" className="text-meta font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" icon={send} loading={busy} block>
          {busy ? t.submitting : t.lfSendClaim}
        </Button>
      </form>
    </Card>
  );
}

/** The finder's own FOUND post: claims next to the secret, approve / reject, then mark returned. */
function OwnerClaims({ post, onChange }: { post: LfPublicPost; onChange: (p: LfPublicPost) => void }) {
  const { t } = useLocale();
  const [claims, setClaims] = useState<LfClaimForFinder[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.lf
      .listClaimsForPost(post.id)
      .then((rows) => alive && setClaims(rows))
      .catch(() => alive && setClaims([]));
    return () => {
      alive = false;
    };
  }, [post.id, post.status]);

  async function run(f: () => Promise<unknown>) {
    setBusy(true);
    try {
      await f();
      onChange(await api.lf.getPost(post.id));
      setClaims(await api.lf.listClaimsForPost(post.id));
    } catch (e) {
      toast.error(errText(e, t.errGeneric));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-title font-bold">{t.lfClaimsTitle}</h2>
      {!claims ? (
        <SkeletonRows rows={1} />
      ) : claims.length === 0 ? (
        <p className="text-meta text-ink-muted">{t.lfNoClaims}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {claims.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 border-b border-line pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-semibold">{c.claimantName}</span>
                <StatusChip status={c.status} />
              </div>
              <p className="text-meta">{c.description}</p>
              {c.secret && (
                <dl className="grid grid-cols-2 gap-2 rounded-xl bg-sand px-3 py-2 text-meta">
                  <div>
                    <dt className="text-ink-muted">{t.lfTheirAnswer}</dt>
                    <dd className="font-semibold">{c.answer || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t.lfYourSecret}</dt>
                    <dd className="font-semibold">{c.secret.answer}</dd>
                  </div>
                </dl>
              )}
              {c.claimantContact && <ContactCard title={t.lfClaimantContact} contact={c.claimantContact} />}
              {c.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button size="sm" icon={Check} disabled={busy} onClick={() => run(() => api.lf.approveClaim(c.id))}>
                    {t.lfApprove}
                  </Button>
                  <Button size="sm" variant="secondary" icon={X} disabled={busy} onClick={() => run(() => api.lf.rejectClaim(c.id))}>
                    {t.lfReject}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {post.status === "APPROVED" && (
        <Button icon={Check} disabled={busy} onClick={() => run(() => api.lf.markReturned(post.id))} block>
          {t.lfMarkReturned}
        </Button>
      )}
    </Card>
  );
}

/** Comments and "I saw it" sightings. */
function Comments({ post }: { post: LfPublicPost }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [comments, setComments] = useState<LfPublicComment[] | null>(null);
  const [body, setBody] = useState("");
  const [sighting, setSighting] = useState(false);
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.lf
      .listComments(post.id)
      .then((rows) => alive && setComments(rows))
      .catch(() => alive && setComments([]));
    return () => {
      alive = false;
    };
  }, [post.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.lf.addComment(post.id, { type: sighting ? "SIGHTING" : "COMMENT", body: body.trim(), sightingPlace: sighting ? place.trim() || undefined : undefined });
      setComments(await api.lf.listComments(post.id));
      setBody("");
      setPlace("");
      setSighting(false);
    } catch (e) {
      setError(errText(e, t.errGeneric));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-title font-bold">
        <MessageCircle aria-hidden size={22} className="text-ink-muted" />
        {t.lfComments}
      </h2>
      <Card className="flex flex-col gap-4">
        {!comments ? (
          <SkeletonRows rows={1} />
        ) : comments.length === 0 ? (
          <p className="text-meta text-ink-muted">{t.lfNoComments}</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-2 text-meta">
                <b>{c.authorName}</b>
                <span className="text-ink-muted">· {shortDate(c.createdAt, locale)}</span>
                {c.type === "SIGHTING" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-tint px-2 py-0.5 text-caption font-semibold text-gold-ink">
                    <MapPin aria-hidden size={13} />
                    {c.sightingPlace || t.lfSighting}
                  </span>
                )}
              </p>
              <p className="mt-1 text-body">{c.body}</p>
            </div>
          ))
        )}
        {user ? (
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <TextArea label={t.lfWriteComment} rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
            <label className="flex min-h-11 items-center gap-2 text-body">
              <input type="checkbox" className="size-5 accent-primary" checked={sighting} onChange={(e) => setSighting(e.target.checked)} />
              {t.lfSighting}
            </label>
            {sighting && <TextField label={t.lfSightingPlace} value={place} onChange={(e) => setPlace(e.target.value)} />}
            {error && (
              <p role="alert" className="text-meta font-medium text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="secondary" loading={busy} disabled={busy || !body.trim()} className="self-start">
              {t.send}
            </Button>
          </form>
        ) : (
          <Button variant="secondary" icon={MessageCircle} onClick={() => requireAuth()} className="self-start">
            {t.lfWriteComment}
          </Button>
        )}
      </Card>
    </section>
  );
}

function ReportPostButton({ postId }: { postId: string }) {
  const { t } = useLocale();
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      icon={done ? ShieldAlert : Flag}
      disabled={done}
      onClick={async () => {
        try {
          await api.lf.reportContent({ targetType: "POST", targetId: postId, reason: "OTHER" });
        } catch {
          /* already reported */
        }
        setDone(true);
        toast.info(t.lfReportedThanks);
      }}
      block
    >
      {done ? t.lfReportedThanks : t.lfReportPost}
    </Button>
  );
}
