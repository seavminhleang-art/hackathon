"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, LogIn, Megaphone, Plus, Search, ThumbsUp, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { shortDate } from "@/lib/i18n/format";
import { PageContainer } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  EmptyState,
  FilterChips,
  LinkButton,
  ListRow,
  PageHeader,
  SkeletonRows,
  StatusChip,
  type ChipStatus,
} from "@/components/ui";
import type { GrCategory, GrCategoryMeta, GrReportView, GrStatus } from "@/types/gov-reporting";
import { CATEGORY_ICON, statusLine } from "./meta";

const ACTIVE: GrStatus[] = ["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFO", "ASSIGNED", "IN_PROGRESS", "REOPENED"];
const NEEDS_ME: GrStatus[] = ["NEED_MORE_INFO", "RESOLVED"];

// ---------- /me/reports ----------

type MineFilter = "ALL" | "ACTIVE" | "DONE";

/** Citizen's own reports with a plain-words status line (wireframe: My activity, full list). */
export function MyReports() {
  const { t, tx, locale } = useLocale();
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<GrReportView[] | null>(null);
  const [filter, setFilter] = useState<MineFilter>("ALL");

  useEffect(() => {
    if (!ready || !user) return;
    let alive = true;
    api.gr
      .myReports()
      .then((r) => alive && setRows(r.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [ready, user]);

  const shown = (rows ?? []).filter((r) => (filter === "ALL" ? true : filter === "ACTIVE" ? ACTIVE.includes(r.status) : !ACTIVE.includes(r.status)));
  const count = (f: (r: GrReportView) => boolean) => (rows ?? []).filter(f).length;

  if (ready && !user) {
    return (
      <PageContainer className="max-w-4xl">
        <PageHeader title={t.myReportsTitle} subtitle={t.myReportsSubtitle} />
        <EmptyState icon={LogIn} title={t.accountNeeded} action={<LinkButton href="/login?next=/me/reports" icon={LogIn}>{t.login}</LinkButton>} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title={t.myReportsTitle}
        subtitle={t.myReportsSubtitle}
        actions={
          <LinkButton href="/report/new" icon={Plus}>
            {t.addNewReport}
          </LinkButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t.total, value: count(() => true) },
          { label: t.activeReports, value: count((r) => ACTIVE.includes(r.status)) },
          { label: t.needsReply, value: count((r) => r.status === "NEED_MORE_INFO") },
          { label: t.toVerify, value: count((r) => r.status === "RESOLVED") },
        ].map((s) => (
          <Card key={s.label}>
            <span className="block text-page leading-none font-extrabold tabular-nums">{rows ? s.value : "–"}</span>
            <span className="mt-1.5 block text-meta text-ink-muted">{s.label}</span>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <FilterChips
          label={t.myReportsTitle}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: t.allReports },
            { value: "ACTIVE", label: t.activeReports },
            { value: "DONE", label: t.completedReports },
          ]}
        />
      </div>

      {!rows ? (
        <SkeletonRows rows={4} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t.noReports}
          body={t.noReportsBody}
          action={
            <LinkButton href="/report/new" variant="secondary" size="sm" icon={Plus}>
              {t.addNewReport}
            </LinkButton>
          }
        />
      ) : (
        <Card padded={false} as="ul">
          {shown.map((r) => (
            <ListRow
              key={r.id}
              icon={CATEGORY_ICON[r.category]}
              accent={NEEDS_ME.includes(r.status) ? "reported" : "primary"}
              href={`/reports/${r.code}`}
              title={r.title}
              subtitle={`${r.code} · ${t.reportUpdatedAt} ${shortDate(r.updatedAt, locale)}`}
              meta={
                <>
                  <StatusChip status={r.status as ChipStatus} />
                  <span className="text-meta text-ink-muted">{statusLine(r, t, r.departmentName ? tx(r.departmentName) : "—")}</span>
                  {r.overdue && (
                    <span className="inline-flex items-center gap-1 text-meta font-semibold text-reported-ink">
                      <TriangleAlert aria-hidden size={15} />
                      {t.overdue}
                    </span>
                  )}
                </>
              }
            />
          ))}
        </Card>
      )}
    </PageContainer>
  );
}

// ---------- /reports ----------

/** Public feed: approved reports only, no reporter identity (GR_PUBLIC_STATUSES enforced by the API). */
export function PublicReports() {
  const { t, tx, locale } = useLocale();
  const { user, ready } = useAuth();
  const [cats, setCats] = useState<GrCategoryMeta[]>([]);
  const [cat, setCat] = useState<"ALL" | GrCategory>("ALL");
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ key: string; rows: GrReportView[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api.gr.listCategories().then(setCats);
  }, []);

  const key = `${cat}|${q}|${user?.id ?? ""}`;
  const rows = result?.key === key ? result.rows : null;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const id = setTimeout(() => {
      api.gr
        .listPublicReports({ q: q || undefined, category: cat === "ALL" ? undefined : [cat], provinceId: user?.provinceId })
        .then((r) => alive && setResult({ key, rows: r.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [ready, key, cat, q, user]);

  const options = useMemo(
    () => [{ value: "ALL" as const, label: t.allCategories, icon: Megaphone }, ...cats.map((c) => ({ value: c.id, label: tx(c.label), icon: CATEGORY_ICON[c.id] }))],
    [cats, t, tx],
  );

  async function support(r: GrReportView) {
    setBusy(r.id);
    try {
      const next = await api.gr.supportReport(r.id);
      setResult((res) => res && { ...res, rows: res.rows.map((x) => (x.id === next.id ? next : x)) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={t.publicReports}
        subtitle={t.publicReportsIntro}
        actions={
          <LinkButton href="/report/new" icon={Plus}>
            {t.newReport}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search aria-hidden size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchReports}
            aria-label={t.searchReports}
            className="min-h-13 w-full rounded-xl bg-surface pr-4 pl-12 text-body shadow-card ring-1 ring-line ring-inset focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <FilterChips label={t.allCategories} value={cat} onChange={setCat} options={options} />

        {!rows ? (
          <SkeletonRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Search} title={t.noResults} />
        ) : (
          <>
            <p className="text-meta text-ink-muted">
              {rows.length} {t.resultsFound} · {t.locationPrivate}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((r) => (
                <Card key={r.id} className="flex flex-col gap-3">
                  <ListHeader r={r} />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={r.status as ChipStatus} />
                    <span className="text-meta text-ink-muted">
                      {fmt(t.supports, { n: r.supportCount })} · {shortDate(r.updatedAt, locale)}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <LinkButton href={`/reports/${r.code}`} variant="secondary" size="sm">
                      {t.viewReport}
                    </LinkButton>
                    {user ? (
                      <Button
                        size="sm"
                        variant={r.mySupport ? "secondary" : "primary"}
                        icon={r.mySupport ? Check : ThumbsUp}
                        disabled={busy === r.id || r.mySupport || !r.can.support}
                        onClick={() => support(r)}
                      >
                        {r.mySupport ? t.supported : t.supportReport}
                      </Button>
                    ) : (
                      <LinkButton href="/login?next=/reports" size="sm" icon={ThumbsUp}>
                        {t.supportReport}
                      </LinkButton>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function ListHeader({ r }: { r: GrReportView }) {
  const Icon = CATEGORY_ICON[r.category];
  return (
    <Link href={`/reports/${r.code}`} className="flex items-start gap-3 [&:hover_.t]:underline">
      <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-primary-tint text-primary">
        <Icon aria-hidden size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="t block text-row leading-snug font-bold">{r.title}</span>
        <span className="mt-0.5 block text-meta text-ink-muted">{[r.code, r.addressHint].filter(Boolean).join(" · ")}</span>
      </span>
    </Link>
  );
}
