"use client";

import { useEffect, useState } from "react";
import {
  Ambulance,
  Baby,
  Building,
  CarFront,
  Flame,
  LifeBuoy,
  Phone,
  ShieldAlert,
  Siren,
  TriangleAlert,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { City, EmIncidentType, EmIncidentTypeMeta, EmergencyHotline, Province } from "@/types";

/**
 * Shared pieces for the Emergency screens: incident icons (lucide, never emoji),
 * the pinned 117/118/119 strip and province/city lists from the API.
 */

export const INCIDENT_ICON: Record<EmIncidentType, LucideIcon> = {
  ROAD_CRASH: CarFront,
  FIRE: Flame,
  MEDICAL: Ambulance,
  CRIME: ShieldAlert,
  VIOLENCE: TriangleAlert,
  FLOOD_DANGER: Waves,
  DROWNING: LifeBuoy,
  BUILDING_COLLAPSE: Building,
  ELECTRICAL_HAZARD: Zap,
  MISSING_PERSON: Baby,
  OTHER: Siren,
};

/** The hotlines must show even before (or without) the API answering: calls work offline. */
const FALLBACK_HOTLINES: EmergencyHotline[] = [
  { id: "police", number: "117", icon: "", name: { km: "ប៉ូលិស", en: "Police" }, unverified: true },
  { id: "fire", number: "118", icon: "", name: { km: "អគ្គិភ័យ", en: "Fire" }, unverified: true },
  { id: "ambulance", number: "119", icon: "", name: { km: "សង្គ្រោះបន្ទាន់", en: "Ambulance" }, unverified: true },
];

/** Pinned call buttons for 117 / 118 / 119. Same look as the SOS sheet. */
export function HotlineStrip() {
  const { t, tx } = useLocale();
  const [hotlines, setHotlines] = useState<EmergencyHotline[]>(FALLBACK_HOTLINES);
  useEffect(() => {
    let alive = true;
    api
      .getEmergencyHotlines()
      .then((rows) => alive && setHotlines(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return (
    <section aria-label={t.emergencyHotlinesAlwaysAvailable} className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2.5">
        {hotlines.map((h) => (
          <a
            key={h.id}
            href={`tel:${h.number}`}
            className="flex min-h-18 flex-col items-center justify-center gap-0.5 rounded-2xl bg-danger px-2 py-3 text-white shadow-card hover:bg-danger-hover sm:flex-row sm:gap-3"
          >
            <Phone aria-hidden size={20} className="hidden sm:block" />
            <span className="text-title font-extrabold tabular-nums">{h.number}</span>
            <span className="text-meta font-semibold">{tx(h.name)}</span>
          </a>
        ))}
      </div>
      <p className="text-caption text-ink-muted">{t.emergencyHotlinesAlwaysAvailable}</p>
    </section>
  );
}

/** Provinces and the cities of all provinces, loaded once from the API. */
export function useLocations() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all([api.getProvinces(), api.getCities()]).then(([p, c]) => {
      if (!alive) return;
      setProvinces(p);
      setCities(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { provinces, cities };
}

/** Lucide icon for an incident type. */
export function IncidentIcon({ type, size = 22, className }: { type: EmIncidentType; size?: number; className?: string }) {
  const Icon = INCIDENT_ICON[type] ?? Siren;
  return <Icon aria-hidden size={size} className={className} />;
}

/** Incident types with their routing and hotline, from the API. Empty until loaded. */
export function useIncidentTypes() {
  const [types, setTypes] = useState<EmIncidentTypeMeta[]>([]);
  useEffect(() => {
    let alive = true;
    api.em.listIncidentTypes().then((rows) => alive && setTypes(rows));
    return () => {
      alive = false;
    };
  }, []);
  return types;
}
