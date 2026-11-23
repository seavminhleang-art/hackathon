"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Titled block on a page. `href` adds a "See all" link. */
export function Section({
  title,
  hint,
  href,
  action,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  href?: string;
  /** Custom right-side action instead of "See all". */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-title leading-snug font-bold text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-meta leading-snug text-ink-muted">{hint}</p>}
        </div>
        {action ??
          (href && (
            <Link
              href={href}
              className="-mr-2 flex min-h-11 flex-none items-center gap-0.5 rounded-lg px-2 text-meta font-semibold text-primary-ink hover:bg-primary-tint"
            >
              {t.seeAll}
              <ChevronRight aria-hidden size={16} />
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}

/**
 * Top of every feature screen: optional back link, title, subtitle, actions.
 * Example: <PageHeader title={t.lostFound} back="/" actions={<LinkButton href="/lost-found/new">…</LinkButton>} />
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="-ml-2 mb-1 inline-flex min-h-10 items-center rounded-lg px-2 text-ink-muted hover:bg-sand-deep" aria-label="Back">
            <ArrowLeft aria-hidden size={20} />
          </Link>
        )}
        <h1 className="text-page leading-snug font-bold text-ink lg:text-display">{title}</h1>
        {subtitle && <p className="mt-1 text-body text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-none flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Says what will appear here and offers one next step. */
export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-5 py-7 text-center">
      <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-sand-deep text-ink-muted">
        <Icon aria-hidden size={24} />
      </span>
      <p className="text-row font-semibold text-ink">{title}</p>
      {body && <p className="max-w-sm text-meta text-ink-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Loading placeholder shaped like a list row. */
export function SkeletonRows({ rows = 2 }: { rows?: number }) {
  const { t } = useLocale();
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-card" role="status" aria-busy="true" aria-label={t.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0 motion-safe:animate-pulse">
          <div className="size-10 flex-none rounded-xl bg-sand-deep" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-3.5 w-2/3 rounded bg-sand-deep" />
            <div className="h-3 w-5/6 rounded bg-sand-deep/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grey placeholder block for custom skeletons. Size and shape it with className (h-*, w-*, rounded-*). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-lg bg-sand-deep motion-safe:animate-pulse ${className}`} />;
}

/**
 * Whole-screen placeholder: page title, subtitle, then a list (or a photo + text card for detail pages).
 * Wrap in <PageContainer>. Use for route `loading.tsx`, Suspense fallbacks and auth checks/redirects,
 * so a screen never flashes blank or shows a lone spinner.
 */
export function PageSkeleton({ rows = 4, variant = "list" }: { rows?: number; variant?: "list" | "detail" }) {
  const { t } = useLocale();
  return (
    <div role="status" aria-busy="true" aria-label={t.loading} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5 pb-1">
        <Skeleton className="h-9 w-1/2 max-w-sm lg:h-10" />
        <Skeleton className="h-4 w-3/4 max-w-md opacity-70" />
      </div>
      {variant === "detail" && (
        <>
          <Skeleton className="h-56 w-full rounded-2xl sm:h-72" />
          <div className="flex flex-col gap-2.5 rounded-2xl bg-surface p-5 shadow-card">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </>
      )}
      <SkeletonRows rows={rows} />
    </div>
  );
}

/** Small count bubble, e.g. unread notifications. */
export function CountBadge({ count, tone = "danger" }: { count: number; tone?: "danger" | "primary" }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption leading-none font-bold text-white ${tone === "danger" ? "bg-danger" : "bg-primary"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
