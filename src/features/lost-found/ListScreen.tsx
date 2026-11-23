"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  HeartHandshake,
  KeyRound,
  MapPin,
  PackageSearch,
  Search,
  ShieldCheck,
} from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { Card, EmptyState, FilterChips, IconTile, Section, SkeletonRows, StatusChip, Thumb } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { shortDate } from "@/lib/i18n/format";
import type { City, Province } from "@/types";
import type { LfCategory, LfCategoryMeta, LfCreatePostInput, LfKind, LfMatch, LfPublicPost } from "@/types/lost-found";
import { PostFormSheet } from "./PostFormSheet";

const KIND_OPTIONS = ["ALL", "LOST", "FOUND"] as const;
type KindFilter = (typeof KIND_OPTIONS)[number];

export function ListScreen() {
  const router = useRouter();
  const { t, tx, locale } = useLocale();
  const { user, ready } = useAuth();
  const requireAuth = useRequireAuth();
  const [posts, setPosts] = useState<LfPublicPost[] | null>(null);
  const [categories, setCategories] = useState<LfCategoryMeta[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [category, setCategory] = useState<LfCategory | "ALL">("ALL");
  const [province, setProvince] = useState("ALL");
  const [error, setError] = useState(false);
  const [loadedMyPosts, setMyPosts] = useState<LfPublicPost[] | null>(null);
  const [loadedMyMatches, setMyMatches] = useState<{ postId: string; matches: LfMatch[] }[] | null>(null);
  // Only meaningful while signed in.
  const myPosts = user ? loadedMyPosts : null;
  const myMatches = user ? loadedMyMatches : null;
  const [reportKind, setReportKind] = useState<LfKind | null>(null);

  function openReport(kind: LfKind) {
    // Guests come back with ?report=<kind> and the form opens after login.
    requireAuth(() => setReportKind(kind), `${window.location.pathname}?report=${kind}`);
  }

  useEffect(() => {
    if (!ready || !user) return;
    const requestedKind = new URLSearchParams(window.location.search).get("report");
    if (requestedKind !== "LOST" && requestedKind !== "FOUND") return;
    // Open the form after mount (async) so it doesn't cascade a render inside the effect.
    const id = setTimeout(() => {
      setReportKind(requestedKind);
      router.replace(window.location.pathname);
    }, 0);
    return () => clearTimeout(id);
  }, [ready, user, router]);

  async function createPost(input: LfCreatePostInput) {
    await api.lf.createPost(input);
    const [nextPosts, nextMyPosts] = await Promise.all([api.lf.listPosts({ includeClosed: true }), api.lf.myPosts()]);
    setPosts(nextPosts);
    setMyPosts(nextMyPosts);
    setKind(input.kind);
    setCategory("ALL");
    setProvince("ALL");
    setQuery("");
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      api.lf.listPosts({ includeClosed: true }),
      api.lf.getCategories(),
      api.getProvinces(),
      api.getCities(),
    ])
      .then(([nextPosts, nextCategories, nextProvinces, nextCities]) => {
        if (!active) return;
        setPosts(nextPosts);
        setCategories(nextCategories);
        setProvinces(nextProvinces);
        setCities(nextCities);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) return; // signed-out: myPosts / myMatches are derived as null below
    let active = true;
    Promise.all([api.lf.myPosts(), api.lf.myMatches()])
      .then(([nextPosts, nextMatches]) => {
        if (!active) return;
        setMyPosts(nextPosts);
        setMyMatches(nextMatches);
      })
      .catch(() => {
        if (!active) return;
        setMyPosts([]);
        setMyMatches([]);
      });
    return () => {
      active = false;
    };
  }, [ready, user]);

  const openPosts = useMemo(
    () => (posts ?? []).filter((post) => post.status !== "RETURNED" && post.status !== "EXPIRED"),
    [posts],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (posts ?? []).filter((post) => {
      if (post.status === "RETURNED" || post.status === "EXPIRED") return false;
      if (kind !== "ALL" && post.kind !== kind) return false;
      if (category !== "ALL" && post.category !== category) return false;
      if (province !== "ALL" && post.provinceId !== province) return false;
      if (needle) {
        const categoryName = categories.find((item) => item.id === post.category);
        const haystack = `${post.title} ${post.description} ${post.place} ${categoryName ? tx(categoryName.label) : ""}`.toLocaleLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [posts, kind, category, province, query, categories, tx]);

  const counts: Record<KindFilter, number> = {
    ALL: openPosts.length,
    LOST: openPosts.filter((post) => post.kind === "LOST").length,
    FOUND: openPosts.filter((post) => post.kind === "FOUND").length,
  };
  const kindLabel: Record<KindFilter, string> = {
    ALL: t.lfAllPosts,
    LOST: t.lfLostTab,
    FOUND: t.lfFoundTab,
  };
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const provinceById = new Map(provinces.map((item) => [item.id, item]));

  return (
    <>
    <PageContainer className="pb-8">
      <div className="flex flex-col gap-6 lg:gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-meta font-bold tracking-wide text-gold-ink">
              <span className="size-2 rounded-full bg-gold" aria-hidden />
              {t.lfEyebrow}
            </p>
            <h1 className="text-page leading-tight font-bold text-ink lg:text-display">{t.tileLostFound}</h1>
            <p className="mt-2 max-w-2xl text-body leading-relaxed text-ink-muted">{t.lfPageSubtitle}</p>
          </div>
        </header>

        <section aria-label={t.lfQuickActions} className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => openReport("LOST")}
            className="flex min-h-24 items-center gap-4 rounded-2xl bg-primary p-4 text-left text-white shadow-card transition hover:bg-primary-hover sm:p-5"
          >
            <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-white/15"><Search aria-hidden size={23} /></span>
            <span className="min-w-0 flex-1"><span className="block text-row font-bold">{t.lfLostAction}</span><span className="mt-1 block text-meta text-white/80">{t.lfLostActionHint}</span></span>
            <ArrowRight aria-hidden size={19} />
          </button>
          <button
            type="button"
            onClick={() => openReport("FOUND")}
            className="flex min-h-24 items-center gap-4 rounded-2xl bg-surface p-4 text-left text-ink shadow-card ring-1 ring-line ring-inset transition hover:shadow-raised sm:p-5"
          >
            <IconTile icon={KeyRound} accent="gold" />
            <span className="min-w-0 flex-1"><span className="block text-row font-bold">{t.lfFoundAction}</span><span className="mt-1 block text-meta text-ink-muted">{t.lfFoundActionHint}</span></span>
            <ArrowRight aria-hidden size={19} className="text-primary-ink" />
          </button>
        </section>

        {user && (
          <section aria-label={t.lfYourDashboard}>
            <Section title={t.lfYourDashboard} hint={t.lfPersonalHint}>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { value: myPosts?.length ?? 0, label: t.lfYourPosts, tone: "bg-primary-tint text-primary-ink" },
                  { value: myMatches?.reduce((total, entry) => total + entry.matches.length, 0) ?? 0, label: t.lfPossibleMatches, tone: "bg-gold-tint text-gold-ink" },
                  { value: myPosts?.filter((post) => post.status === "POSTED" || post.status === "CLAIM_PENDING" || post.status === "APPROVED").length ?? 0, label: t.lfOpenPosts, tone: "bg-fixed-tint text-fixed-ink" },
                  { value: myPosts?.filter((post) => post.status === "RETURNED").length ?? 0, label: t.lfYourReturns, tone: "bg-reported-tint text-reported-ink" },
                ].map((stat) => (
                  <Card key={stat.label} className="flex min-h-20 items-center gap-3 p-3.5 lg:p-4">
                    <span className={`flex size-10 flex-none items-center justify-center rounded-xl text-title font-bold ${stat.tone}`}>{stat.value}</span>
                    <span className="text-meta font-medium leading-snug text-ink-muted">{stat.label}</span>
                  </Card>
                ))}
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Card>
                  <h3 className="mb-3 text-row font-bold text-ink">{t.lfLatestPosts}</h3>
                  {myPosts === null ? <SkeletonRows rows={2} /> : myPosts.length === 0 ? (
                    <p className="text-meta text-ink-muted">{t.lfNoPersonalPosts}</p>
                  ) : (
                    <div className="divide-y divide-line">
                      {myPosts.slice(0, 3).map((post) => (
                        <Link key={post.id} href={`/lost-found/${post.id}`} className="flex items-center gap-3 rounded-lg py-3 first:pt-0 last:pb-0 hover:bg-sand">
                          <Thumb src={post.photoUrls[0]} icon={post.kind === "LOST" ? Search : KeyRound} accent={post.kind === "LOST" ? "reported" : "gold"} size="sm" />
                          <span className="min-w-0 flex-1"><strong className="block truncate text-body text-ink">{post.title}</strong><span className="block truncate text-meta text-ink-muted">{post.place}</span></span>
                          <StatusChip status={post.kind} />
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
                <Card>
                  <h3 className="mb-3 text-row font-bold text-ink">{t.lfPossibleMatches}</h3>
                  {myMatches === null ? <SkeletonRows rows={2} /> : myMatches.flatMap((entry) => entry.matches).length === 0 ? (
                    <p className="text-meta text-ink-muted">{t.lfNoMatches}</p>
                  ) : (
                    <div className="divide-y divide-line">
                      {myMatches.flatMap((entry) => entry.matches.map((match) => ({ ...match, sourcePostId: entry.postId }))).slice(0, 3).map((match) => (
                        <Link key={`${match.sourcePostId}-${match.post.id}`} href={`/lost-found/${match.post.id}`} className="flex items-center gap-3 rounded-lg py-3 first:pt-0 last:pb-0 hover:bg-sand">
                          <Thumb src={match.post.photoUrls[0]} icon={match.post.kind === "FOUND" ? KeyRound : Search} accent={match.post.kind === "FOUND" ? "gold" : "reported"} size="sm" />
                          <span className="min-w-0 flex-1"><strong className="block truncate text-body text-ink">{match.post.title}</strong><span className="block truncate text-meta text-ink-muted">{match.post.place}</span></span>
                          <span className="rounded-full bg-fixed-tint px-2.5 py-1 text-meta font-semibold text-fixed-ink">{match.score}%</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </Section>
          </section>
        )}

        <section aria-label={t.lfCommunityHighlights}>
          <Section title={t.lfCommunityHighlights} hint={t.lfCommunityHint}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { value: openPosts.length, label: t.lfItemsListed, tone: "bg-primary-tint text-primary-ink" },
                { value: counts.LOST, label: t.lfLookingForOwner, tone: "bg-fixed-tint text-fixed-ink" },
                { value: counts.FOUND, label: t.lfFoundItems, tone: "bg-gold-tint text-gold-ink" },
                { value: posts?.filter((post) => post.status === "RETURNED").length ?? 0, label: t.lfReturnedItems, tone: "bg-reported-tint text-reported-ink" },
              ].map((stat) => (
                <Card key={stat.label} className="flex min-h-20 items-center gap-3 p-3.5 lg:p-4">
                  <span className={`flex size-10 flex-none items-center justify-center rounded-xl text-title font-bold ${stat.tone}`}>{stat.value}</span>
                  <span className="text-meta font-medium leading-snug text-ink-muted">{stat.label}</span>
                </Card>
              ))}
            </div>
          </Section>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.9fr)] lg:gap-8">
          <section id="lf-listings" className="min-w-0 scroll-mt-24">
            <Section title={t.lostFoundRecent} hint={t.lostFoundRecentHint}>
              <Card className="mb-4 space-y-4 p-4 lg:p-5">
                <label className="flex min-h-12 items-center gap-3 rounded-xl bg-sand px-3.5 ring-1 ring-line ring-inset focus-within:ring-2 focus-within:ring-primary">
                  <Search aria-hidden size={19} className="flex-none text-ink-muted" />
                  <span className="sr-only">{t.search}</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t.lfSearchPlaceholder}
                    className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
                  />
                </label>
                <FilterChips
                  label={t.lfFilterByKind}
                  options={KIND_OPTIONS.map((value) => ({ value, label: `${kindLabel[value]} · ${counts[value]}` }))}
                  value={kind}
                  onChange={setKind}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-12 items-center gap-3 rounded-xl bg-surface px-3.5 ring-1 ring-line-strong ring-inset">
                    <span className="text-meta font-semibold text-ink-muted">{t.lfCategory}</span>
                    <select value={category} onChange={(event) => setCategory(event.target.value as LfCategory | "ALL")} className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none">
                      <option value="ALL">{t.lfAllCategories}</option>
                      {categories.map((item) => <option key={item.id} value={item.id}>{tx(item.label)}</option>)}
                    </select>
                  </label>
                  <label className="flex min-h-12 items-center gap-3 rounded-xl bg-surface px-3.5 ring-1 ring-line-strong ring-inset">
                    <MapPin aria-hidden size={17} className="flex-none text-primary-ink" />
                    <span className="text-meta font-semibold text-ink-muted">{t.province}</span>
                    <select value={province} onChange={(event) => setProvince(event.target.value)} className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none">
                      <option value="ALL">{t.lfAllProvinces}</option>
                      {provinces.map((item) => <option key={item.id} value={item.id}>{tx(item.name)}</option>)}
                    </select>
                  </label>
                </div>
              </Card>

              <p className="mb-3 text-meta text-ink-muted" aria-live="polite">
                {t.lfShowing} <strong className="text-ink">{filtered.length}</strong> {t.lfItems}
              </p>
              {error ? (
                <EmptyState icon={PackageSearch} title={t.loadError} body={t.errGeneric} />
              ) : !posts ? (
                <Card padded={false}><SkeletonRows rows={4} /></Card>
              ) : filtered.length === 0 ? (
                <EmptyState icon={PackageSearch} title={t.lfNoItems} body={t.lfNoItemsHint} />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filtered.map((post) => {
                    const meta = categories.find((item) => item.id === post.category);
                    const city = cityById.get(post.cityId);
                    const provinceName = provinceById.get(post.provinceId);
                    return (
                      <article key={post.id} className="relative flex min-h-48 flex-col rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line/70 transition-shadow hover:shadow-raised lg:p-5">
                        <div className="flex items-start gap-3">
                          <Thumb src={post.photoUrls[0]} icon={post.kind === "LOST" ? Search : KeyRound} accent={post.kind === "LOST" ? "reported" : "gold"} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2"><StatusChip status={post.kind} /><span className="text-meta text-ink-muted">{meta ? tx(meta.label) : post.category}</span></div>
                            <h3 className="text-row leading-snug font-bold text-ink"><Link href={`/lost-found/${post.id}`} className="after:absolute after:inset-0 hover:underline">{post.title}</Link></h3>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-2 text-meta leading-relaxed text-ink-muted">{post.description}</p>
                        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                          <div className="min-w-0">
                            <p className="flex items-start gap-1.5 text-meta leading-snug text-ink"><MapPin aria-hidden size={15} className="mt-0.5 flex-none text-primary-ink" /><span>{post.place}{city ? ` · ${tx(city.name)}` : ""}{provinceName ? `, ${tx(provinceName.name)}` : ""}</span></p>
                            <p className="mt-1 pl-[21px] text-caption text-ink-muted">{shortDate(post.createdAt, locale)}{post.commentCount > 0 ? ` · ${post.commentCount} ${t.lfComments}` : ""}</p>
                          </div>
                          {post.status === "CLAIM_PENDING" && <StatusChip status="PENDING" />}
                          {post.status === "APPROVED" && <StatusChip status="APPROVED" />}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Section>
          </section>

          <aside className="flex flex-col gap-6">
            <Section title={t.lfHowTitle}>
              <Card padded={false} as="ol">
                {[
                  ["1", t.lfStepPost, t.lfStepPostHint],
                  ["2", t.lfStepMatch, t.lfStepMatchHint],
                  ["3", t.lfStepVerify, t.lfStepVerifyHint],
                  ["4", t.lfStepReturn, t.lfStepReturnHint],
                ].map(([number, title, hint]) => (
                  <li key={number} className="flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0 lg:px-5">
                    <span className="flex size-8 flex-none items-center justify-center rounded-full bg-primary-tint text-meta font-bold text-primary-ink">{number}</span>
                    <span className="min-w-0"><strong className="block text-body text-ink">{title}</strong><span className="mt-0.5 block text-meta leading-snug text-ink-muted">{hint}</span></span>
                  </li>
                ))}
              </Card>
            </Section>
            <Card className="flex items-start gap-3 bg-gold-tint/70">
              <ShieldCheck aria-hidden size={21} className="mt-0.5 flex-none text-gold-ink" />
              <div><h2 className="text-title font-bold text-ink">{t.lfSafetyTitle}</h2><p className="mt-1 text-meta leading-relaxed text-ink-muted">{t.lfSafetyHint}</p></div>
            </Card>
            <div className="flex items-center gap-3 rounded-2xl bg-fixed-tint/70 p-4 text-meta leading-snug text-fixed-ink"><HeartHandshake aria-hidden size={21} className="flex-none" />{t.lfKindReminder}</div>
          </aside>
        </div>
      </div>
    </PageContainer>
    {reportKind && user && <PostFormSheet kind={reportKind} user={user} categories={categories} provinces={provinces} cities={cities} onClose={() => setReportKind(null)} onSubmit={createPost} />}
    </>
  );
}
