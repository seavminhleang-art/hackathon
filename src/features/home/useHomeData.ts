"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";
import type { GrReportView, GrStatus } from "@/types/gov-reporting";
import type { LfClaimForClaimant, LfPublicPost } from "@/types/lost-found";
import type { CsAnnouncementView, CsGuideView, CsPlaceView, CsPostView } from "@/types/community";

export type ActivityItem =
  | { kind: "report"; report: GrReportView; at: string }
  | { kind: "claim"; claim: LfClaimForClaimant; at: string };

export interface HomeData {
  alert: CsAnnouncementView | null;
  activity: ActivityItem[];
  nearReport: GrReportView | null;
  nearFound: LfPublicPost | null;
  nearEvent: CsPostView | null;
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

  const [alerts, reports, claims, publicReports, found, events, cities, guides] = await Promise.all([
    settle(api.cs.activeAlerts(), []),
    user ? settle(api.gr.myReports(), []) : Promise.resolve([]),
    user ? settle(api.lf.myClaims(), []) : Promise.resolve([]),
    settle(api.gr.listPublicReports({ cityId, status: OPEN_PUBLIC }), []),
    settle(api.lf.listPosts({ kind: "FOUND", provinceId }), []),
    settle(api.cs.listPosts({ type: ["EVENT"], upcomingEvents: true, cityId }), []),
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

  const nearReport =
    publicReports.filter((r) => !r.isMine).sort((a, b) => b.supportCount - a.supportCount)[0] ?? null;

  return {
    alert: alerts[0] ?? null,
    activity,
    nearReport,
    nearFound: found.find((p) => !p.isMine) ?? null,
    nearEvent: events[0] ?? null,
    place: places.find((p) => user?.sangkat && p.sangkat === user.sangkat) ?? places[0] ?? null,
    guides: guides.slice(0, 2),
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
