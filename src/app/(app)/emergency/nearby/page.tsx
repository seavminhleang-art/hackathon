"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Clock,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Siren,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { PageContainer } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  CountBadge,
  EmptyState,
  PageHeader,
  Section,
  SelectField,
  StatusChip,
} from "@/components/ui";
import { EMERGENCY_HOTLINES, PROVINCES, CITIES } from "@/lib/mock/data";
import type {
  EmergencyHotline,
  EmOrgType,
  EmServiceFilter,
  EmServiceView,
  LatLng,
} from "@/types";

export default function NearbyEmergencyPage() {
  const { t, tx, locale } = useLocale();
  const { user } = useAuth();

  // Hotlines (Pinned, unverified, works without login/network)
  const [hotlines, setHotlines] = useState<EmergencyHotline[]>(EMERGENCY_HOTLINES);

  // GPS & Location state
  const [gpsLocation, setGpsLocation] = useState<LatLng | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(true);
  const [isGpsDenied, setIsGpsDenied] = useState(false);
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | null>(null);

  // Fallback area selection (when GPS is denied)
  const [selectedProvince, setSelectedProvince] = useState<string>(user?.provinceId || "phnom-penh");
  const [selectedCity, setSelectedCity] = useState<string>(user?.cityId || "doun-penh");

  // Filter & Search
  const [services, setServices] = useState<EmServiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // 1. Get GPS coordinates snapshot
  const requestLocation = () => {
    setIsGpsLoading(true);
    setIsGpsDenied(false);

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsAccuracyM(Math.round(pos.coords.accuracy));
          setIsGpsLoading(false);
        },
        () => {
          // GPS denied or unavailable: never use city center as user's position!
          setGpsLocation(null);
          setIsGpsDenied(true);
          setIsGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsLocation(null);
      setIsGpsDenied(true);
      setIsGpsLoading(false);
    }
  };

  useEffect(() => {
    api.getEmergencyHotlines().then(setHotlines).catch(() => {});
    requestLocation();
  }, []);

  // 2. Load services: if GPS is available, sort by distance. If not, scope to selected area.
  useEffect(() => {
    setLoading(true);
    const filter: EmServiceFilter = {};

    if (selectedType !== "ALL") {
      filter.type = [selectedType as EmOrgType];
    }

    if (gpsLocation) {
      // User location snapshot is available: calculate distance and sort!
      filter.near = gpsLocation;
    } else {
      // GPS not available: scope to user's selected city/province without fake coordinates
      filter.provinceId = selectedProvince;
      filter.cityId = selectedCity;
    }

    api.em
      .listServices(filter)
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gpsLocation, selectedProvince, selectedCity, selectedType]);

  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.km.toLowerCase().includes(q) ||
      s.name.en.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  const getOrgTypeLabel = (type: string) => {
    switch (type) {
      case "POLICE":
        return t.servicePolice;
      case "HOSPITAL":
        return t.serviceHospital;
      case "AMBULANCE":
        return t.serviceAmbulance;
      case "FIRE":
        return t.serviceFire;
      case "RESCUE":
        return t.serviceRescue;
      default:
        return type;
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl space-y-8 pb-16">
        <PageHeader
          title={t.nearbyServicesPageTitle}
          subtitle={t.nearbyServicesPageSubtitle}
          back="/emergency"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={requestLocation}
              disabled={isGpsLoading}
              className="gap-1.5"
            >
              <RefreshCw size={15} className={isGpsLoading ? "animate-spin" : ""} />
              <span>{locale === "km" ? "ធ្វើបច្ចុប្បន្នភាពទីតាំង" : "Refresh Location"}</span>
            </Button>
          }
        />

        {/* Directions vs Direct Call Offline Note */}
        <p className="rounded-xl border border-line bg-surface p-3 text-caption text-ink-muted">
          💡 {t.directionsOfflineNote}
        </p>

        {/* 1. PINNED 117/118/119 HOTLINES (Unverified, check before launch, works offline) */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-row font-bold text-ink">
              {locale === "km"
                ? "លេខទូរស័ព្ទសង្គ្រោះបន្ទាន់ (មិនទាន់ផ្ទៀងផ្ទាត់ · ពិនិត្យមុនដាក់ឱ្យដំណើរការ)"
                : "Emergency Hotlines (Unverified · Check before launch)"}
            </span>
            <span className="text-caption font-semibold text-danger bg-danger-tint px-2.5 py-0.5 rounded-full border border-danger/30">
              {t.unverifiedCheckBeforeLaunch}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {hotlines.map((h) => (
              <a
                key={h.id}
                href={`tel:${h.number}`}
                className="group flex items-center gap-4 rounded-2xl bg-danger p-4 text-white shadow-card transition-all hover:bg-danger-ink hover:shadow-raised"
              >
                <div className="flex size-14 flex-none items-center justify-center rounded-xl bg-white/20 text-display font-extrabold tracking-tight">
                  {h.number}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-title font-bold leading-tight">
                    {tx(h.name)}
                  </span>
                  <span className="mt-0.5 block text-caption text-white/80">
                    {locale === "km" ? "ចុចដើម្បីខលភ្លាមៗ" : "Tap to Call Now"}
                  </span>
                </div>
                <Phone size={20} className="text-white/60 group-hover:text-white transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* 2. LOCATION SAFETY STATUS BANNER */}
        {gpsLocation ? (
          /* GPS Active: Real Snapshot */
          <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-200/60 text-emerald-800">
                <Navigation size={20} />
              </div>
              <div>
                <p className="font-bold text-row">
                  {locale === "km" ? "ទីតាំង GPS បានផ្ទៀងផ្ទាត់" : "GPS Location Active"}
                </p>
                <p className="text-meta opacity-90">
                  {locale === "km"
                    ? `តម្រៀបសេវាសង្គ្រោះបន្ទាន់តាមចម្ងាយពីទីតាំងបច្ចុប្បន្នរបស់អ្នក (ភាពត្រឹមត្រូវ ~${gpsAccuracyM ?? 15} ម៉ែត្រ)`
                    : `Sorted by distance from your current location snapshot (accuracy ~${gpsAccuracyM ?? 15} m)`}
                </p>
              </div>
            </div>
            <span className="flex size-3.5 rounded-full bg-emerald-500 animate-pulse flex-none" />
          </div>
        ) : isGpsDenied ? (
          /* Location Denied / Not Shared: Never use city center as user location! Provide area selector */
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 flex-none text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-row">{t.locationNotSharedWarning}</p>
                <p className="text-meta opacity-90">{t.locationNotSharedDesc}</p>
              </div>
            </div>

            {/* Area Picker */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-amber-200 dark:border-amber-900/50">
              <span className="text-meta font-bold text-ink">
                {t.chooseArea}:
              </span>
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedCity("");
                }}
                className="rounded-xl border border-amber-300 bg-white dark:bg-zinc-900 px-3 py-1.5 text-meta font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {tx(p.name)}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="rounded-xl border border-amber-300 bg-white dark:bg-zinc-900 px-3 py-1.5 text-meta font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CITIES.filter((c) => c.provinceId === selectedProvince).map((c) => (
                  <option key={c.id} value={c.id}>
                    {tx(c.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {/* 3. FILTERS & SEARCH */}
        <Card className="space-y-4 p-5">
          {/* Search Box */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-body text-ink focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Org Type Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {[
              { id: "ALL", label: t.allServices },
              { id: "POLICE", label: t.servicePolice },
              { id: "HOSPITAL", label: t.serviceHospital },
              { id: "AMBULANCE", label: t.serviceAmbulance },
              { id: "FIRE", label: t.serviceFire },
              { id: "RESCUE", label: t.serviceRescue },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`rounded-xl px-4 py-1.5 text-meta font-semibold transition-colors ${
                  selectedType === tab.id
                    ? "bg-primary text-white shadow-card"
                    : "bg-surface text-ink hover:bg-sand"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* 4. NEARBY FACILITIES LIST */}
        <Section
          title={t.nearbyServicesPageTitle}
          action={<CountBadge count={filteredServices.length} />}
        >
          {loading ? (
            <div className="py-12 text-center text-ink-muted">{t.submitting}</div>
          ) : filteredServices.length === 0 ? (
            <Card className="py-12 text-center text-ink-muted">
              {locale === "km" ? "រកមិនឃើញសេវាសង្គ្រោះបន្ទាន់ទេ" : "No emergency services found"}
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredServices.map((s) => (
                <Card
                  key={s.id}
                  className="flex flex-col justify-between p-5 transition-all hover:border-primary/40 hover:shadow-card"
                >
                  <div>
                    {/* Top Row: Name and Type */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-row font-bold text-ink leading-snug">
                          {tx(s.name)}
                        </h3>
                        <span className="mt-1 inline-block rounded-md bg-sand px-2 py-0.5 text-caption font-semibold text-ink">
                          {getOrgTypeLabel(s.type)}
                        </span>
                      </div>

                      {/* Distance in KM (Only when GPS is confirmed) */}
                      {s.distanceKm !== undefined && (
                        <span className="flex-none rounded-xl bg-primary/10 px-2.5 py-1 text-meta font-black text-primary border border-primary/20">
                          {fmt(t.distanceKm, { dist: s.distanceKm.toFixed(1) })}
                        </span>
                      )}
                    </div>

                    {/* Address */}
                    <p className="mt-3 flex items-start gap-1.5 text-meta text-ink-muted">
                      <MapPin size={15} className="mt-0.5 flex-none text-primary" />
                      <span>{s.address}</span>
                    </p>

                    {/* Hours and Last Verified Date */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-ink-muted">
                      <div className="flex items-center gap-1 font-medium text-emerald-700">
                        <Clock size={13} />
                        <span>{t.open24Hours}</span>
                      </div>
                      {s.lastVerified ? (
                        <div className="flex items-center gap-1 opacity-80">
                          <Shield size={12} />
                          <span>
                            {t.lastVerified}: {s.lastVerified.slice(0, 10)}
                          </span>
                        </div>
                      ) : null}
                      {s.pendingReview && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-caption font-bold text-amber-900 border border-amber-300">
                          ⚠️ {t.pendingAdminReview}
                        </span>
                      )}
                      {s.isStaleVerified && !s.pendingReview && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-caption font-bold text-amber-800 border border-amber-200">
                          ⚠️ {t.lastVerifiedStaleWarning}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone & Direct Calling */}
                  <div className="mt-5 border-t border-line pt-3.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-meta font-bold text-ink">
                          {s.phone}
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200">
                          {t.sampleDataBadge}
                        </span>
                      </div>
                    </div>

                    {/* Call Now and Directions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${s.phone}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-danger py-2 text-meta font-bold text-white shadow-card hover:bg-danger-ink transition-colors"
                      >
                        <Phone size={15} />
                        <span>{t.callNow}</span>
                      </a>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.location.lat},${s.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-meta font-bold text-ink hover:bg-sand transition-colors"
                      >
                        <Compass size={15} className="text-primary" />
                        <span>{t.directions}</span>
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>
    </PageContainer>
  );
}
