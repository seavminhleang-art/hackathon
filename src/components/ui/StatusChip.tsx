"use client";

import {
  CheckCheck,
  CircleCheck,
  CircleDot,
  CircleHelp,
  CircleX,
  Clock,
  Copy,
  Hourglass,
  Loader,
  PackageSearch,
  RotateCcw,
  Search,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * One status chip for every feature. Always icon + label + color, never color alone.
 * Solid fills stay readable in bright sun; amber carries dark text for contrast.
 */
export type ChipStatus =
  // Government reporting
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEED_MORE_INFO"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED"
  | "REOPENED"
  | "DUPLICATE"
  | "CANCELLED"
  // Lost & Found claims / posts
  | "PENDING"
  | "APPROVED"
  | "COMPLETED"
  | "EXPIRED"
  | "FOUND"
  | "LOST"
  // Services
  | "OPEN"
  | "SHUT";

type Tone = "reported" | "progress" | "fixed" | "muted" | "outline";

const META: Record<ChipStatus, { icon: LucideIcon; tone: Tone; label: keyof Dictionary }> = {
  SUBMITTED: { icon: CircleDot, tone: "reported", label: "stSUBMITTED" },
  UNDER_REVIEW: { icon: Search, tone: "reported", label: "stUNDER_REVIEW" },
  NEED_MORE_INFO: { icon: CircleHelp, tone: "reported", label: "stNEED_MORE_INFO" },
  ASSIGNED: { icon: UserCheck, tone: "progress", label: "stASSIGNED" },
  IN_PROGRESS: { icon: Loader, tone: "progress", label: "stIN_PROGRESS" },
  REOPENED: { icon: RotateCcw, tone: "reported", label: "stREOPENED" },
  RESOLVED: { icon: CircleCheck, tone: "fixed", label: "stRESOLVED" },
  CLOSED: { icon: CheckCheck, tone: "fixed", label: "stCLOSED" },
  REJECTED: { icon: CircleX, tone: "muted", label: "stREJECTED" },
  DUPLICATE: { icon: Copy, tone: "muted", label: "stDUPLICATE" },
  CANCELLED: { icon: CircleX, tone: "muted", label: "stCANCELLED" },
  PENDING: { icon: Hourglass, tone: "reported", label: "stPENDING" },
  APPROVED: { icon: CircleCheck, tone: "fixed", label: "stAPPROVED" },
  COMPLETED: { icon: CheckCheck, tone: "fixed", label: "stCOMPLETED" },
  EXPIRED: { icon: Clock, tone: "muted", label: "stEXPIRED" },
  FOUND: { icon: PackageSearch, tone: "outline", label: "stFOUND" },
  LOST: { icon: Search, tone: "outline", label: "stLOST" },
  OPEN: { icon: Clock, tone: "fixed", label: "openNow" },
  SHUT: { icon: Clock, tone: "muted", label: "closedNow" },
};

// Tinted pill + dark ink of the same hue: calmer than solid fills, still AA contrast.
const TONE: Record<Tone, string> = {
  reported: "bg-reported-tint text-reported-ink ring-reported/25",
  progress: "bg-progress-tint text-progress-ink ring-progress/40",
  fixed: "bg-fixed-tint text-fixed-ink ring-fixed/25",
  muted: "bg-sand-deep text-ink-muted ring-line-strong",
  outline: "bg-surface text-ink ring-line-strong",
};

export function StatusChip({ status }: { status: ChipStatus }) {
  const { t } = useLocale();
  const m = META[status];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta leading-relaxed font-semibold whitespace-nowrap ring-1 ring-inset ${TONE[m.tone]}`}
    >
      <Icon aria-hidden size={15} strokeWidth={2.5} />
      {t[m.label]}
    </span>
  );
}
