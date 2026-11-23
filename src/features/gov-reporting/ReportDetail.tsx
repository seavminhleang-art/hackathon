"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  CircleHelp,
  MapPin,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldAlert,
  ThumbsUp,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import thumbUp from "react-useanimations/lib/thumbUp";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt, type Dictionary } from "@/lib/i18n/dictionary";
import { formatDateParts, shortDate } from "@/lib/i18n/format";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, IconTile, LinkButton, Photo, SkeletonRows, StatusChip, TextArea, type ChipStatus } from "@/components/ui";
import type { GrActorRole, GrCommentView, GrReportView } from "@/types/gov-reporting";
import { CATEGORY_ICON, statusLine } from "./meta";

const ROLE_LABEL = (role: GrActorRole, t: Dictionary) =>
  role === "ADMIN" ? t.timelineAdmin : role === "DEPARTMENT_STAFF" ? t.timelineStaff : role === "CITIZEN" ? t.timelineYou : t.timelineSystem;

/** "PRIORITY_CHANGED" → "Priority changed" (fallback for history entries without a status change). */
const actionLabel = (a: string) => a.charAt(0) + a.slice(1).toLowerCase().replaceAll("_", " ");

/** /reports/[code] · status, plain-words line, timeline, actions from `report.can`, comments. */
export function ReportDetail() {
  const { code } = useParams<{ code: string }>();
  const { t, tx, locale } = useLocale();
  const { user, ready } = useAuth();
  const [r, setR] = useState<GrReportView | null>(null);
  const [error, setError] = useState(false);
  const [comments, setComments] = useState<GrCommentView[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.gr
      .getReport(decodeURIComponent(code))
      .then(async (rep) => {
        if (!alive) return;
        setR(rep);
        const cs = await api.gr.listComments(rep.id).catch(() => []);
        if (alive) setComments(cs);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [code, ready, user]);

  const back = (
    <Link href={user ? "/me/reports" : "/reports"} className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
      <ArrowLeft aria-hidden size={20} />
      {user ? t.myReportsTitle : t.publicReports}
    </Link>
  );

  if (error)
    return (
      <PageContainer>
        {back}
        <EmptyState icon={ShieldAlert} title={t.noResults} action={<LinkButton href="/reports" variant="secondary" size="sm">{t.publicReports}</LinkButton>} />
      </PageContainer>
    );
  if (!r)
    return (
      <PageContainer>
        {back}
        <SkeletonRows rows={4} />
      </PageContainer>
    );

  const dept = r.departmentName ? tx(r.departmentName) : "—";
  const history = [...r.history].reverse();

  return (
    <PageContainer>
      {back}
      <div className="grid items-start gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <IconTile icon={CATEGORY_ICON[r.category]} accent="primary" size="lg" />
              <span className="text-meta text-ink-muted tabular-nums">{r.code}</span>
            </div>
            <h1 className="text-page leading-tight font-bold">{r.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={r.status as ChipStatus} />
              <span className="text-body">{statusLine(r, t, dept)}</span>
              {r.overdue && (
                <span className="inline-flex items-center gap-1 text-meta font-semibold text-reported-ink">
                  <TriangleAlert aria-hidden size={15} />
                  {t.overdue}
                </span>
              )}
            </div>
          </header>

          {r.status === "NEED_MORE_INFO" && r.infoRequest && (
            <Card className="ring-2 ring-reported/40">
              <p className="flex items-center gap-2 text-meta font-semibold text-reported-ink">
                <CircleHelp aria-hidden size={18} />
                {t.requestedByAdmin}
              </p>
              <p className="mt-1 text-body">{r.infoRequest}</p>
              {r.can.respondToInfo && <ReplyBox label={t.respond} onSend={async (m) => setR(await api.gr.respondToInfoRequest(r.id, { message: m }))} />}
            </Card>
          )}

          <Card>
            <h2 className="mb-2 text-title font-bold">{t.reportDescriptionLabel}</h2>
            <p className="text-body whitespace-pre-line">{r.description}</p>
          </Card>

          {r.photos.length > 0 && <PhotoGallery r={r} />}

          <section>
            <h2 className="mb-3 text-title font-bold">{t.reportTimeline}</h2>
            <Card>
              <ol className="flex flex-col">
                {history.map((h, i) => {
                  const when = formatDateParts(h.at, locale);
                  return (
                    <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < history.length - 1 && <span className="absolute top-8 bottom-0 left-[13px] w-0.5 bg-line-strong" aria-hidden />}
                      <span className={`z-10 mt-1 size-7 flex-none rounded-full ring-4 ring-surface ${i === 0 ? "bg-primary" : "bg-line-strong"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {h.to ? <StatusChip status={h.to as ChipStatus} /> : <span className="text-body font-semibold">{actionLabel(h.action)}</span>}
                          <span className="text-meta text-ink-muted">
                            {ROLE_LABEL(h.byRole, t)} · {when.day} {when.month} {when.time}
                          </span>
                        </div>
                        {h.note && <p className="mt-1 text-body text-ink-muted">{h.note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-title font-bold">
              <MessageCircle aria-hidden size={22} className="text-ink-muted" />
              {t.reportComments}
            </h2>
            <Card className="flex flex-col gap-4">
              {!comments ? (
                <SkeletonRows rows={1} />
              ) : comments.length === 0 ? (
                <p className="text-meta text-ink-muted">{t.noCommentsYet}</p>
              ) : (
                comments.map((cm) => (
                  <div key={cm.id} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
                    <p className="text-meta">
                      <b>{cm.authorLabel}</b> <span className="text-ink-muted">· {shortDate(cm.createdAt, locale)}</span>
                    </p>
                    <p className="mt-1 text-body">{cm.body}</p>
                  </div>
                ))
              )}
              {r.can.comment && (
                <ReplyBox
                  label={t.addComment}
                  onSend={async (body) => {
                    await api.gr.addComment(r.id, { body });
                    setComments(await api.gr.listComments(r.id));
                  }}
                />
              )}
            </Card>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Card padded={false} as="ul">
            <Fact icon={Building2} label={t.department} value={dept} />
            <Fact icon={MapPin} label={t.location} value={r.addressHint ?? t.locationApproximate} />
            <Fact icon={CalendarClock} label={t.reportUpdatedAt} value={shortDate(r.updatedAt, locale)} />
            <Fact icon={ThumbsUp} label={t.reportSupporters} value={fmt(t.supports, { n: r.supportCount })} />
          </Card>
          <Actions r={r} onChange={setR} />
          <p className="text-meta text-ink-muted">{t.locationPrivate}</p>
        </aside>
      </div>
    </PageContainer>
  );
}

/** Citizen photos, then repair photos from the department ("before / after"). */
function PhotoGallery({ r }: { r: GrReportView }) {
  const { t } = useLocale();
  const groups: [string, typeof r.photos][] = [
    [t.reportPhotos, r.photos.filter((p) => p.kind === "EVIDENCE")],
    [t.reportRepairPhotos, r.photos.filter((p) => p.kind === "REPAIR")],
  ];
  return (
    <section className="flex flex-col gap-4">
      {groups
        .filter(([, photos]) => photos.length > 0)
        .map(([label, photos]) => (
          <div key={label}>
            <h2 className="mb-3 text-title font-bold">{label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {photos.map((p) => (
                <Photo key={p.id} src={p.url} alt={`${label}: ${r.title}`} icon={CATEGORY_ICON[r.category]} accent="primary" />
              ))}
            </div>
          </div>
        ))}
    </section>
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

/** Buttons come straight from `report.can` — no permission logic here. */
function Actions({ r, onChange }: { r: GrReportView; onChange: (r: GrReportView) => void }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reopen, setReopen] = useState(false);
  const run = async (f: () => Promise<GrReportView>) => {
    setBusy(true);
    try {
      onChange(await f());
    } finally {
      setBusy(false);
    }
  };

  if (!user)
    return (
      <Button size="lg" icon={thumbUp} onClick={() => requireAuth()} block>
        {t.supportThisReport}
      </Button>
    );

  return (
    <div className="flex flex-col gap-2">
      {r.can.support && (
        <Button size="lg" icon={thumbUp} iconActive={r.mySupport} disabled={busy || r.mySupport} onClick={() => run(() => api.gr.supportReport(r.id))} block>
          {r.mySupport ? t.supported : t.supportThisReport}
        </Button>
      )}
      {r.status === "RESOLVED" && r.isMine && (
        <Button
          size="lg"
          icon={Check}
          disabled={busy || confirmed}
          onClick={() =>
            run(async () => {
              const next = await api.gr.confirmIssue(r.id, false);
              setConfirmed(true);
              return next;
            })
          }
          block
        >
          {confirmed ? t.confirmedThanks : t.confirmFixed}
        </Button>
      )}
      {r.can.requestReopen &&
        (reopen ? (
          <Card>
            <ReplyBox label={t.requestReopen} onSend={(reason) => run(() => api.gr.requestReopen(r.id, reason))} />
          </Card>
        ) : (
          <Button variant="secondary" icon={RotateCcw} onClick={() => setReopen(true)} block>
            {t.requestReopen}
          </Button>
        ))}
      {r.can.cancel && (
        <Button variant="ghost" icon={XCircle} disabled={busy} onClick={() => run(() => api.gr.cancelReport(r.id))} block>
          {t.cancelReport}
        </Button>
      )}
    </div>
  );
}

function ReplyBox({ label, onSend }: { label: string; onSend: (body: string) => Promise<unknown> }) {
  const { t } = useLocale();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-3 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        setError(null);
        try {
          await onSend(body.trim());
          setBody("");
        } catch (err) {
          setError(err instanceof Error ? err.message : t.errGeneric);
        } finally {
          setBusy(false);
        }
      }}
    >
      <TextArea label={label} value={body} onChange={(e) => setBody(e.target.value)} rows={3} error={error ?? undefined} />
      <Button type="submit" icon={Send} loading={busy} disabled={busy || !body.trim()} className="self-start">
        {t.send}
      </Button>
    </form>
  );
}
