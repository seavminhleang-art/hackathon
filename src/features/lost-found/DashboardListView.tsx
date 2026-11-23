"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { Button, Card, EmptyState, SkeletonRows, StatusChip } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { shortDate } from "@/lib/i18n/format";
import type { City, Province } from "@/types";
import type { LfCategory, LfCategoryMeta, LfKind, LfPublicPost } from "@/types/lost-found";

type KindFilter = "ALL" | LfKind;
type SortOrder = "NEWEST" | "OLDEST";

export function DashboardListView({
  posts,
  openPosts,
  filtered,
  categories,
  provinces,
  cities,
  query,
  onQuery,
  kind,
  onKind,
  category,
  onCategory,
  province,
  onProvince,
  counts,
  error,
  onReport,
}: {
  posts: LfPublicPost[] | null;
  openPosts: LfPublicPost[];
  filtered: LfPublicPost[];
  categories: LfCategoryMeta[];
  provinces: Province[];
  cities: City[];
  query: string;
  onQuery: (value: string) => void;
  kind: KindFilter;
  onKind: (value: KindFilter) => void;
  category: LfCategory | "ALL";
  onCategory: (value: LfCategory | "ALL") => void;
  province: string;
  onProvince: (value: string) => void;
  counts: Record<KindFilter, number>;
  error: boolean;
  onReport: (kind: LfKind) => void;
}) {
  const { t, tx, locale } = useLocale();
  const [sort, setSort] = useState<SortOrder>("NEWEST");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [safetyExpanded, setSafetyExpanded] = useState(false);
  const pageSize = 5;
  const sorted = useMemo(() => [...filtered].sort((a, b) => sort === "NEWEST" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)), [filtered, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);
  const categoryCounts = useMemo(() => openPosts.reduce<Partial<Record<LfCategory, number>>>((result, post) => {
    result[post.category] = (result[post.category] ?? 0) + 1;
    return result;
  }, {}), [openPosts]);
  const locationCounts = useMemo(() => {
    const result = new Map<string, number>();
    openPosts.forEach((post) => result.set(post.place, (result.get(post.place) ?? 0) + 1));
    return [...result.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [openPosts]);
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const provinceById = new Map(provinces.map((item) => [item.id, item]));
  const start = sorted.length ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, sorted.length);

  function changePage(next: number) {
    setPage(Math.min(Math.max(next, 1), pageCount));
  }

  return (
    <div className="bg-[#f6f8fb] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1500px] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0">
          <header className="mb-4">
            <h1 className="text-page font-bold leading-tight text-ink">{t.tileLostFound}</h1>
            <p className="mt-1 text-meta text-ink-muted">{t.lfPageSubtitle}</p>
          </header>

          <div className="mb-4 flex gap-5 border-b border-line">
            {(["ALL", "LOST", "FOUND"] as const).map((value) => {
              const label = value === "ALL" ? t.lfAllPosts : value === "LOST" ? t.lfLostTab : t.lfFoundTab;
              return <button key={value} type="button" onClick={() => { onKind(value); setPage(1); }} className={`min-h-11 border-b-2 px-1 text-meta font-semibold ${kind === value ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"}`} aria-pressed={kind === value}>{label}</button>;
            })}
          </div>

          <Card padded={false} className="mb-3 p-3 sm:p-4">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(110px,.7fr)_minmax(140px,.9fr)_minmax(140px,.85fr)_minmax(125px,.7fr)]">
              <label className="flex min-h-12 items-center gap-2.5 rounded-xl bg-sand px-3 ring-1 ring-line ring-inset focus-within:ring-2 focus-within:ring-primary">
                <Search aria-hidden size={17} className="text-ink-muted" /><span className="sr-only">{t.search}</span><input value={query} onChange={(event) => { onQuery(event.target.value); setPage(1); }} placeholder={t.lfSearchPlaceholder} className="min-w-0 flex-1 bg-transparent text-meta text-ink outline-none placeholder:text-ink-muted" />
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-xl bg-surface px-3 ring-1 ring-line ring-inset"><span className="sr-only">{t.lfFilterByKind}</span><select value={kind} onChange={(event) => { onKind(event.target.value as KindFilter); setPage(1); }} className="min-w-0 flex-1 bg-transparent text-meta text-ink outline-none"><option value="ALL">{t.lfAllPosts}</option><option value="LOST">{t.lfLostTab}</option><option value="FOUND">{t.lfFoundTab}</option></select><ChevronDown aria-hidden size={15} className="text-ink-muted" /></label>
              <label className="flex min-h-12 items-center gap-2 rounded-xl bg-surface px-3 ring-1 ring-line ring-inset"><span className="sr-only">{t.lfCategory}</span><select value={category} onChange={(event) => { onCategory(event.target.value as LfCategory | "ALL"); setPage(1); }} className="min-w-0 flex-1 bg-transparent text-meta text-ink outline-none"><option value="ALL">{t.lfAllCategories}</option>{categories.map((item) => <option key={item.id} value={item.id}>{tx(item.label)}</option>)}</select><ChevronDown aria-hidden size={15} className="text-ink-muted" /></label>
              <label className="flex min-h-12 items-center gap-2 rounded-xl bg-surface px-3 ring-1 ring-line ring-inset"><span className="sr-only">{t.province}</span><select value={province} onChange={(event) => { onProvince(event.target.value); setPage(1); }} className="min-w-0 flex-1 bg-transparent text-meta text-ink outline-none"><option value="ALL">{t.lfAllLocations}</option>{provinces.map((item) => <option key={item.id} value={item.id}>{tx(item.name)}</option>)}</select><ChevronDown aria-hidden size={15} className="text-ink-muted" /></label>
              <label className="flex min-h-12 items-center gap-2 rounded-xl bg-surface px-3 ring-1 ring-line ring-inset"><span className="sr-only">{t.lfSortBy}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="min-w-0 flex-1 bg-transparent text-meta text-ink outline-none"><option value="NEWEST">{t.lfSortBy}: {t.lfNewest}</option><option value="OLDEST">{t.lfSortBy}: {t.lfOldest}</option></select><ChevronDown aria-hidden size={15} className="text-ink-muted" /></label>
            </div>
          </Card>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-caption text-ink-muted" aria-live="polite">{t.lfShowing} <b className="text-ink">{start}–{end}</b> {t.lfOf} {sorted.length} {t.lfItems}</p>
            <Button size="sm" onClick={() => onReport(kind === "FOUND" ? "FOUND" : "LOST")} icon={Search}>{t.lfReportEitherItem}</Button>
          </div>

          {error ? <EmptyState icon={Search} title={t.loadError} body={t.errGeneric} /> : !posts ? <Card padded={false}><SkeletonRows rows={4} /></Card> : sorted.length === 0 ? <EmptyState icon={Search} title={t.lfNoItems} body={t.lfNoItemsHint} /> : (
            <div className="flex flex-col gap-2.5">
              {visible.map((post) => {
                const meta = categories.find((item) => item.id === post.category);
                const city = cityById.get(post.cityId);
                const provinceName = provinceById.get(post.provinceId);
                const isExpanded = expanded === post.id;
                return <Card key={post.id} padded={false} className="p-3 sm:p-3.5">
                  <div className="flex items-center gap-3">
                    {post.photoUrls[0] ? <img src={post.photoUrls[0]} alt="" className="size-16 flex-none rounded-lg bg-sand object-cover" /> : <span className="flex size-16 flex-none items-center justify-center rounded-lg bg-sand text-ink-muted"><Search aria-hidden size={22} /></span>}
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5"><StatusChip status={post.kind} /><span className="rounded-md bg-sand px-2 py-0.5 text-caption text-ink-muted">{meta ? tx(meta.label) : post.category}</span></div>
                      <h2 className="truncate text-meta font-bold text-ink">{post.title}</h2>
                      <p className="mt-0.5 line-clamp-1 text-caption text-ink-muted">{post.description}</p>
                    </div>
                    <div className="hidden min-w-36 text-caption leading-snug text-ink-muted sm:block"><p className="flex items-start gap-1"><MapPin aria-hidden size={13} className="mt-0.5 flex-none text-primary" /><span>{post.place}{city ? ` · ${tx(city.name)}` : ""}{provinceName ? `, ${tx(provinceName.name)}` : ""}</span></p><p className="mt-1 pl-4">{shortDate(post.createdAt, locale)}</p></div>
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : post.id)} className="min-h-11 flex-none rounded-lg border border-line px-3 text-caption font-semibold text-primary hover:bg-primary-tint" aria-expanded={isExpanded}>{isExpanded ? t.lfHideDetails : t.lfViewDetails}</button>
                  </div>
                  {isExpanded && <div className="mt-3 border-t border-line pt-3 text-meta text-ink-muted sm:hidden"><p className="flex items-center gap-1.5"><MapPin aria-hidden size={15} className="text-primary" />{post.place}{city ? ` · ${tx(city.name)}` : ""}{provinceName ? `, ${tx(provinceName.name)}` : ""}</p><p className="mt-2">{shortDate(post.createdAt, locale)}{post.commentCount > 0 ? ` · ${post.commentCount} ${t.lfComments}` : ""}</p></div>}
                  {isExpanded && <p className="mt-3 border-t border-line pt-3 text-meta leading-relaxed text-ink-muted">{post.description}</p>}
                </Card>;
              })}
            </div>
          )}

          {pageCount > 1 && <nav className="mt-5 flex items-center justify-center gap-1.5" aria-label={t.lfPagination}>
            <button type="button" onClick={() => changePage(page - 1)} disabled={page === 1} aria-label={t.previous} className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-ink disabled:opacity-40"><ChevronLeft aria-hidden size={17} /></button>
            {Array.from({ length: Math.min(pageCount, 5) }, (_, index) => index + 1).map((number) => <button key={number} type="button" onClick={() => changePage(number)} aria-current={page === number ? "page" : undefined} className={`size-11 rounded-lg border text-meta font-semibold ${page === number ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:bg-primary-tint"}`}>{number}</button>)}
            {pageCount > 5 && <span className="px-1 text-meta text-ink-muted">…</span>}
            <button type="button" onClick={() => changePage(page + 1)} disabled={page === pageCount} aria-label={t.next} className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-ink disabled:opacity-40"><ChevronRight aria-hidden size={17} /></button>
          </nav>}
        </main>

        <aside className="flex flex-col gap-3.5">
          <Card className="p-4">
            <h2 className="text-meta font-bold text-ink">{t.lfCategory}</h2>
            <button type="button" onClick={() => { onCategory("ALL"); setPage(1); }} className={`mt-3 flex min-h-8 w-full items-center justify-between text-caption ${category === "ALL" ? "font-bold text-primary" : "text-ink-muted hover:text-primary"}`}><span>{t.lfAllCategories}</span><span>{openPosts.length}</span></button>
            {categories.map((item) => <button key={item.id} type="button" onClick={() => { onCategory(item.id); setPage(1); }} className={`flex min-h-8 w-full items-center justify-between text-caption ${category === item.id ? "font-bold text-primary" : "text-ink-muted hover:text-primary"}`}><span>{tx(item.label)}</span><span>{categoryCounts[item.id] ?? 0}</span></button>)}
          </Card>

          <Card className="p-4">
            <h2 className="text-meta font-bold text-ink">{t.lfPopularLocations}</h2>
            <div className="mt-2">{locationCounts.map(([place, count]) => <button key={place} type="button" onClick={() => { onQuery(place); setPage(1); }} className="flex min-h-9 w-full items-center justify-between gap-2 text-caption text-ink-muted hover:text-primary"><span className="truncate">{place}</span><span>{count}</span></button>)}</div>
          </Card>

          <Card className="border border-fixed/20 bg-fixed-tint/50 p-4">
            <div className="flex items-center gap-2 text-fixed-ink"><ShieldCheck aria-hidden size={17} /><h2 className="text-meta font-bold">{t.lfSafetyTips}</h2></div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-caption leading-snug text-fixed-ink"><li>{t.lfSafetyTipPrivacy}</li><li>{t.lfSafetyTipMeeting}</li><li>{t.lfSafetyTipReport}</li></ul>
            <button type="button" onClick={() => setSafetyExpanded((expanded) => !expanded)} aria-expanded={safetyExpanded} className="mt-3 inline-flex min-h-9 items-center text-caption font-semibold text-primary hover:underline">{t.lfSafetyGuidelines} →</button>
            {safetyExpanded && <p className="mt-2 border-t border-fixed/20 pt-2 text-caption leading-snug text-fixed-ink">{t.lfSafetyHint}</p>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
