"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BadgeCheck, CircleCheck, Flag } from "lucide-react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { Button, Sheet, SubNav } from "@/components/ui";
import type { City, Locale, Province } from "@/types";
import type { CsReportReason, CsScope } from "@/types/community";
import { fmt } from "@/lib/i18n/dictionary";
import { useCs, type CsDict } from "./i18n";

export function useCommunityHref() {
  const inDashboard = usePathname().startsWith("/dashboard/");
  return (href: string) => inDashboard && href.startsWith("/") && !href.startsWith("/dashboard")
    ? `/dashboard${href}`
    : href;
}

// ---------- Hub header: title + Board · Groups · News ----------

export function CommunityTabs({ active }: { active: "/community" | "/community/groups" | "/announcements" }) {
  const { c } = useCs();
  const href = useCommunityHref();
  return (
    <SubNav
      active={href(active)}
      items={[
        { href: href("/community"), label: c.board },
        { href: href("/community/groups"), label: c.groups },
        { href: href("/announcements"), label: c.news },
      ]}
    />
  );
}

// ---------- Official badge ----------

/** Badge + text, so "official" never depends on color alone. */
export function OfficialBadge() {
  const { c } = useCs();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2 py-0.5 text-caption font-semibold text-primary-ink">
      <BadgeCheck aria-hidden size={14} />
      {c.official}
    </span>
  );
}

// ---------- Time ----------

export function timeAgo(iso: string, c: CsDict): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return c.justNow;
  if (mins < 60) return fmt(c.minAgo, { n: mins });
  const h = Math.round(mins / 60);
  if (h < 24) return fmt(c.hAgo, { n: h });
  return fmt(c.dAgo, { n: Math.round(h / 24) });
}

// ---------- Area names (cities / provinces) ----------

let areaCache: Promise<{ cities: City[]; provinces: Province[] }> | null = null;

/** City and province names, loaded once per page. */
export function useAreas() {
  const [areas, setAreas] = useState<{ cities: City[]; provinces: Province[] } | null>(null);
  useEffect(() => {
    areaCache ??= Promise.all([api.getCities(), api.getProvinces()]).then(([cities, provinces]) => ({ cities, provinces }));
    let alive = true;
    areaCache.then((a) => alive && setAreas(a));
    return () => {
      alive = false;
    };
  }, []);
  return areas;
}

export function scopeLabel(scope: CsScope, areas: ReturnType<typeof useAreas>, locale: Locale, c: CsDict): string {
  if (scope.level === "NATIONAL") return c.nationwide;
  const city = areas?.cities.find((x) => x.id === scope.cityId);
  const prov = areas?.provinces.find((x) => x.id === scope.provinceId);
  const cityName = city?.name[locale];
  const provName = prov?.name[locale];
  if (scope.level === "SANGKAT") return [scope.sangkat, cityName].filter(Boolean).join(", ");
  if (scope.level === "CITY") return cityName ?? provName ?? "";
  return provName ?? "";
}

// ---------- Report ----------

const REASONS: CsReportReason[] = ["SPAM", "FAKE", "PERSONAL_INFO", "OFFENSIVE", "OTHER"];

/** Labelled "Report" text button + reason sheet. */
export function ReportButton({ targetType, targetId }: { targetType: "POST" | "COMMENT"; targetId: string }) {
  const { c } = useCs();
  const requireAuth = useRequireAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CsReportReason | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reason) return;
    setBusy(true);
    try {
      await api.cs.reportContent({ targetType, targetId, reason });
      setDone(true);
    } catch {
      setDone(true); // already reported counts as done for the user
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => requireAuth(() => setOpen(true))}
        className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-meta font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink"
      >
        <Flag aria-hidden size={16} />
        {c.report}
      </button>
      {open && (
        <Sheet title={c.reportTitle} icon={<Flag aria-hidden size={22} />} onClose={() => setOpen(false)}>
          {done ? (
            <>
              <p className="flex items-center gap-2 text-body font-semibold text-fixed-ink">
                <CircleCheck aria-hidden size={20} />
                {c.reported}
              </p>
              <Button onClick={() => setOpen(false)} block>
                OK
              </Button>
            </>
          ) : (
            <>
              <p className="text-meta text-ink-muted">{c.reportBody}</p>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label={c.reportTitle}>
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={reason === r}
                    onClick={() => setReason(r)}
                    className={`flex min-h-13 items-center gap-3 rounded-xl px-4 text-left text-body font-semibold ring-inset ${
                      reason === r ? "bg-primary-tint text-primary-ink ring-2 ring-primary" : "bg-surface ring-1 ring-line-strong"
                    }`}
                  >
                    {reason === r && <CircleCheck aria-hidden size={18} />}
                    {c[`r${r}` as keyof CsDict]}
                  </button>
                ))}
              </div>
              <Button onClick={send} disabled={!reason || busy} block>
                {c.sendReport}
              </Button>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

// ---------- Small helpers ----------

/** Neutral info strip (visitor, offline…). */
export function InfoStrip({ icon, children, action }: { icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-primary-tint p-4 text-ink sm:flex-row sm:items-center">
      <span className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 flex-none text-primary-ink">{icon}</span>
        <span className="text-meta">{children}</span>
      </span>
      {action}
    </div>
  );
}

/** "1.2 km" / "200 m". */
export function distanceLabel(km: number | undefined, c: CsDict): string | null {
  if (km === undefined) return null;
  return km < 1 ? fmt(c.mAway, { n: Math.round((km * 1000) / 50) * 50 }) : fmt(c.kmAway, { n: km.toFixed(1) });
}

export function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Initial-letter avatar (names only, no photos). */
export function Avatar({ name, official }: { name: string; official?: boolean }) {
  return (
    <span
      className={`flex size-9 flex-none items-center justify-center rounded-full text-meta font-bold ${
        official ? "bg-primary text-white" : "bg-reported-tint text-reported-ink"
      }`}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}

