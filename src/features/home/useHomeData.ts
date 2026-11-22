"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";
import type { GrReportView, GrStatus } from "@/types/gov-reporting";
import type { LfCategory, LfClaimForClaimant, LfPublicPost } from "@/types/lost-found";
import type { CsAnnouncementView, CsGuideView, CsPlaceView, CsPostView, CsWasteSchedule } from "@/types/community";
import type { I18nText } from "@/types";

export type ActivityItem =
  | { kind: "report"; report: GrReportView; at: string }
  | { kind: "claim"; claim: LfClaimForClaimant; at: string };

export interface HomeData {
  alert: CsAnnouncementView | null;
  activity: ActivityItem[];
  /** City at a glance (province-wide, public data only). */
  stats: { fixed: number; working: number; returned: number; events: number };
  latestReports: GrReportView[];
  lostFound: LfPublicPost[];
  lfCategoryLabel: Partial<Record<LfCategory, I18nText>>;
  events: CsPostView[];
  board: CsPostView[];
  announcements: CsAnnouncementView[];
  waste: CsWasteSchedule | null;
  place: CsPlaceView | null;
  guides: CsGuideView[];
}

// Reports that need the citizen first, then open work, then finished.
const RANK: Partial<Record<GrStatus, number>> = { RESOLVED: 0, NEED_MORE_INFO: 0 };
const DONE: GrStatus[] = ["CLOSED", "REJECTED", "DUPLICATE", "CANCELLED"];
const rankOf = (s: GrStatus) => RANK[s] ?? (DONE.includes(s) ? 2 : 1);

const OPEN_PUBLIC: GrStatus[] = ["ASSIGNED", "IN_PROGRESS", "REOPENED"];

async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

async function loadHome(user: User | null): Promise<HomeData> {
  const cityId = user?.cityId;
  const provinceId = user?.provinceId;

  const [alerts, reports, claims, publicReports, lfOpen, lfAll, lfCats, events, board, announcements, waste, cities, guides] =
    await Promise.all([
      settle(api.cs.activeAlerts(), []),
      user ? settle(api.gr.myReports(), []) : Promise.resolve([]),
      user ? settle(api.lf.myClaims(), []) : Promise.resolve([]),
      settle(api.gr.listPublicReports({ provinceId }), []),
      settle(api.lf.listPosts({ provinceId }), []),
      settle(api.lf.listPosts({ provinceId, includeClosed: true }), []),
      settle(api.lf.getCategories(), []),
      settle(api.cs.listPosts({ type: ["EVENT"], upcomingEvents: true, provinceId }), []),
      settle(api.cs.listPosts({ type: ["DISCUSSION", "QUESTION", "POLL"], provinceId }), []),
      settle(api.cs.listAnnouncements(), []),
      cityId ? settle(api.cs.getWasteSchedules({ cityId }), []) : Promise.resolve([]),
      settle(api.getCities(provinceId), []),
      settle(api.cs.listGuides(), []),
    ]);

  const center = cities.find((c) => c.id === cityId)?.center;
  const places = await settle(api.cs.listPlaces({ cityId, type: ["SANGKAT_OFFICE"], near: center }), []);

  const activity: ActivityItem[] = [
    ...reports
      .filter((r) => r.status !== "CANCELLED" && r.status !== "DUPLICATE")
      .map((r) => ({ kind: "report" as const, report: r, at: r.updatedAt })),
    ...claims
      .filter((c) => c.status === "PENDING" || c.status === "APPROVED")
      .map((c) => ({ kind: "claim" as const, claim: c, at: c.createdAt })),
  ]
    .sort((a, b) => {
      const ra = a.kind === "report" ? rankOf(a.report.status) : 1;
      const rb = b.kind === "report" ? rankOf(b.report.status) : 1;
      return ra - rb || b.at.localeCompare(a.at);
    })
    .slice(0, 3);

  return {
    alert: alerts[0] ?? null,
    activity,
    stats: {
      fixed: publicReports.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED").length,
      working: publicReports.filter((r) => OPEN_PUBLIC.includes(r.status)).length,
      returned: lfAll.filter((p) => p.status === "RETURNED").length,
      events: events.length,
    },
    latestReports: [...publicReports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    lostFound: lfOpen.filter((p) => !p.isMine).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    lfCategoryLabel: Object.fromEntries(lfCats.map((c) => [c.id, c.label])),
    events: events.slice(0, 3),
    board: board.slice(0, 3),
    announcements: announcements.filter((x) => x.id !== alerts[0]?.id).slice(0, 3),
    waste: waste[0] ?? null,
    place: places.find((p) => user?.sangkat && p.sangkat === user.sangkat) ?? places[0] ?? null,
    guides: guides.slice(0, 4),
  };
}

/** Everything the home screen shows, reloaded when the user changes. */
export function useHomeData(user: User | null, ready: boolean) {
  const [data, setData] = useState<HomeData | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    loadHome(user).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [user, ready, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, setData, reload };
}
