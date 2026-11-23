"use client";

import { Droplet, Lightbulb, Pin, TrafficCone, Trash2, Trees, Waves, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { GrCategory, GrReportView } from "@/types/gov-reporting";
import { fmt } from "@/lib/i18n/dictionary";

/** One icon per category, used on every reporting screen (and Home). */
export const CATEGORY_ICON: Record<GrCategory, LucideIcon> = {
  ROAD_TRANSPORT: TrafficCone,
  WASTE: Trash2,
  DRAINAGE_FLOODING: Waves,
  PUBLIC_LIGHTING: Lightbulb,
  WATER: Droplet,
  PUBLIC_INFRASTRUCTURE: Trees,
  OTHER: Pin,
};

/** Plain-words line under the status chip ("Road Maintenance is fixing it"). */
export function statusLine(r: GrReportView, t: Dictionary, dept: string): string {
  switch (r.status) {
    case "IN_PROGRESS":
      return fmt(t.activityInProgress, { dept });
    case "ASSIGNED":
    case "REOPENED":
      return fmt(t.activityAssigned, { dept });
    case "SUBMITTED":
      return t.activitySubmitted;
    case "UNDER_REVIEW":
      return t.activityUnderReview;
    case "NEED_MORE_INFO":
      return t.activityNeedInfo;
    case "RESOLVED":
      return t.awaitingVerification;
    case "CLOSED":
      return t.activityClosed;
    default:
      return t.activityRejected;
  }
}

/** "300 m" / "1.2 km" */
export function metres(m: number, t: Dictionary) {
  return m < 1000 ? fmt(t.mAway, { n: Math.round(m / 10) * 10 }) : fmt(t.kmAway, { n: (m / 1000).toFixed(1) });
}

/** First citizen (evidence) photo of a report, for list thumbnails. */
export const coverPhoto = (r: { photos?: { url: string; kind: string }[] }) => r.photos?.find((p) => p.kind === "EVIDENCE")?.url;
