"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Building2, Camera, CheckCircle2, MapPin, Phone, RefreshCw, Send, Shield, ShieldAlert, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HotlineStrip, IncidentIcon, useIncidentTypes, useLocations } from "@/features/emergency/meta";
import { api } from "@/lib/api";
import { offlineQueue } from "@/lib/api/offline-queue";
import { stripExifAndCompress } from "@/lib/utils/image-utils";
import { PageContainer } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/ui";
import type { EmIncidentType, EmSeverity, LatLng, EmConsents, EmServiceView } from "@/types";

export default function IncidentReportPage() {
  const { t, tx, locale } = useLocale();
  const { provinces: PROVINCES, cities: CITIES } = useLocations();
  const EM_INCIDENT_TYPES = useIncidentTypes();
  const { user } = useAuth();
  const router = useRouter();

  // Pinned toll-free hotlines

  // Form State: 1. Category (Required)
  const [category, setCategory] = useState<EmIncidentType>("ROAD_CRASH");

  // 2. Location (Required)
  const [location, setLocation] = useState<LatLng | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"CONFIRMED" | "UNCONFIRMED">("UNCONFIRMED");
  const [accuracyM, setAccuracyM] = useState<number | undefined>(undefined);
  const [landmark, setLandmark] = useState("");
  const [addressHint, setAddressHint] = useState("");
  const [provinceId, setProvinceId] = useState(user?.provinceId || "phnom-penh");
  const [cityId, setCityId] = useState(user?.cityId || "doun-penh");
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // 3. Optional Fields
  const [description, setDescription] = useState("");
  const [numInjured, setNumInjured] = useState<"0" | "1" | "2-5" | "5+">("0");
  const [occurredAt, setOccurredAt] = useState<string>("");
  const [suggestedSeverity, setSuggestedSeverity] = useState<EmSeverity>("HIGH");

  useEffect(() => {
    const deferred = setTimeout(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setOccurredAt(d.toISOString().slice(0, 16));
      }, 0);
    return () => clearTimeout(deferred);
  }, []);

  // 4. Photos (up to 4, client-side EXIF stripped)
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoWarningDismissed, setPhotoWarningDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 5. Consents (Separate, defaults off except sending to orgs)
  const [consents, setConsents] = useState<EmConsents>({
    shareWithOrganizations: true,
    allowCallback: false,
    shareWithMedia: false,
    anonymous: false,
  });

  // Submission & Offline state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);
  const [queuedIncidentCode, setQueuedIncidentCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Request GPS snapshot on mount
  useEffect(() => {
    requestGpsLocation();
  }, []);

  function requestGpsLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("UNCONFIRMED");
      setLocationConfirmed(false);
      return;
    }
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracyM(Math.round(pos.coords.accuracy));
        setLocationConfirmed(true);
        setLocationStatus("CONFIRMED");
        setIsGpsLoading(false);
      },
      () => {
        // Location Denied/Failed: NEVER silently substitute Phnom Penh center as user location
        setLocation(null);
        setLocationConfirmed(false);
        setLocationStatus("UNCONFIRMED");
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  // Who this report would be routed to (preview only; the API routes for real on submit).
  const routesTo = EM_INCIDENT_TYPES.find((m) => m.id === category)?.routesTo;
  const [suggestedRecipients, setSuggestedRecipients] = useState<EmServiceView[]>([]);
  useEffect(() => {
    if (!routesTo?.length) return;
    let alive = true;
    api.em
      .listServices({ type: routesTo, provinceId, cityId })
      .then((rows) => alive && setSuggestedRecipients(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [routesTo, provinceId, cityId]);

  // Handle Photo Upload with client-side EXIF stripping & compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 4 - photoUrls.length;
    if (remainingSlots <= 0) {
      alert(locale === "km" ? "អ្នកអាចផ្ទុករូបថតបានអតិបរមា ៤ សន្លឹកប៉ុណ្ណោះ។" : "You can upload up to 4 photos maximum.");
      return;
    }

    setIsProcessingPhotos(true);
    try {
      const toProcess = files.slice(0, remainingSlots);
      const results = await Promise.all(
        toProcess.map((f) => stripExifAndCompress(f, 1280, 1280, 0.75))
      );
      setPhotoUrls((prev) => [...prev, ...results.map((r) => r.dataUrl)]);
    } catch {
      alert(locale === "km" ? "មិនអាចដំណើរការរូបភាពបានទេ។" : "Failed to process photos.");
    } finally {
      setIsProcessingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Handler
  const handleSubmit = async (e?: { preventDefault(): void }) => {
    e?.preventDefault();
    if (!category) {
      setErrorMsg(locale === "km" ? "សូមជ្រើសរើសប្រភេទគ្រោះអាសន្ន" : "Please select an emergency category");
      return;
    }

    if (!locationConfirmed && !landmark.trim() && !addressHint.trim()) {
      setErrorMsg(
        locale === "km"
          ? "ទីតាំង GPS មិនទាន់បានបញ្ជាក់ឡើយ។ សូមបញ្ចូលទីតាំងសម្គាល់ ឬអាសយដ្ឋានដោយដៃ។"
          : "GPS is unconfirmed. Please provide a landmark or manual address."
      );
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const payload = {
      type: category,
      suggestedSeverity,
      description: description.trim() || undefined,
      numInjured,
      peopleAffected: numInjured === "5+" ? 5 : numInjured === "2-5" ? 3 : numInjured === "1" ? 1 : 0,
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      location: location || undefined,
      locationSource: locationConfirmed ? ("GPS" as const) : ("TEXT" as const),
      locationConfirmed,
      locationStatus,
      landmark: landmark.trim() || undefined,
      addressHint: addressHint.trim() || undefined,
      accuracyM: locationConfirmed ? accuracyM : undefined,
      provinceId,
      cityId,
      photoUrls,
      sensitiveMedia: true,
      consents,
    };

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Network offline");
      }
      const created = await api.em.createIncident(payload);
      router.push(`/emergency/${created.id}`);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      // Check for rate limit or storage quota error
      if (err?.code === "LIMIT" || err?.field === "storage" || err?.message?.toLowerCase().includes("quota")) {
        setErrorMsg(
          err?.field === "storage" || err?.message?.toLowerCase().includes("quota")
            ? t.storageQuotaError
            : err.message
        );
        setIsSubmitting(false);
        return;
      }
      // Offline fallback: Queue in offline queue & persist draft
      offlineQueue.add("REPORT", payload, err);
      setIsOfflineQueued(true);
      setQueuedIncidentCode(`INC-${new Date().getFullYear()}-QUEUED`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cities = CITIES.filter((c) => c.provinceId === provinceId);

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6 pb-20">
        <PageHeader
          title={t.reportIncidentTitle}
          subtitle={t.reportIncidentSubtitle}
          back="/emergency"
        />

        <HotlineStrip />

        {/* OFFLINE QUEUED BANNER */}
        {isOfflineQueued ? (
          <Card className="p-6 border-reported/30 bg-reported-tint text-reported-ink ">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="flex-none text-reported mt-0.5" />
              <div className="space-y-3">
                <h3 className="text-row font-bold">
                  {locale === "km"
                    ? "របាយការណ៍មិនទាន់បានផ្ញើ (កំពុងព្យាយាមឡើងវិញ)"
                    : "Report Not Yet Sent (FAILED_RETRYING)"}
                </h3>
                <p className="text-caption opacity-95">{t.offlineQueueNotice}</p>
                <p className="text-meta font-bold text-ink">
                  {locale === "km"
                    ? "កូដបណ្តោះអាសន្ន៖ "
                    : "Temporary Queued Code: "}
                  <span className="font-mono text-primary">{queuedIncidentCode}</span>
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => offlineQueue.retryAll(async () => handleSubmit())}
                  >
                    <RefreshCw size={14} className="mr-1.5" />
                    <span>{locale === "km" ? "ព្យាយាមផ្ញើម្តងទៀត" : "Retry Sending Now"}</span>
                  </Button>
                  <a
                    href={`sms:117?body=${encodeURIComponent(
                      `EMERGENCY REPORT: ${category}. ${landmark || addressHint || "Location unconfirmed"}`
                    )}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-reported bg-reported-tint px-3 py-1.5 text-caption font-bold text-reported-ink hover:bg-reported-tint"
                  >
                    <Phone size={14} />
                    <span>{t.smsFallbackBtn}</span>
                  </a>
                  <Link href="/emergency">
                    <Button variant="ghost" size="sm">
                      {t.close}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ERROR BANNER */}
            {errorMsg && (
              <div className="rounded-xl border border-danger/40 bg-danger-tint p-4 text-meta font-bold text-danger flex items-center gap-2">
                <AlertTriangle size={18} className="flex-none" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. CATEGORY SELECTION (REQUIRED) */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-row font-bold text-ink flex items-center gap-2">
                  <ShieldAlert size={18} className="text-primary" />
                  <span>{locale === "km" ? "១. ប្រភេទគ្រោះអាសន្ន (តម្រូវឱ្យជ្រើសរើស)" : "1. Emergency Category (Required)"}</span>
                </h3>
                <span className="text-caption font-bold text-danger uppercase">* {locale === "km" ? "តម្រូវ" : "Required"}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {EM_INCIDENT_TYPES.map((type) => {
                  const isSelected = category === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setCategory(type.id);
                        setSuggestedSeverity(type.defaultSeverity === "CRITICAL" ? "HIGH" : type.defaultSeverity);
                      }}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary-tint font-bold text-primary ring-2 ring-primary/30"
                          : "border-line bg-surface hover:border-ink-muted text-ink"
                      }`}
                    >
                      <IncidentIcon type={type.id} className="text-danger" />
                      <span className="text-caption font-semibold leading-tight">{tx(type.label)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Review Suggested Recipients */}
              <div className="mt-4 rounded-xl border border-line bg-sand p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-caption font-bold text-ink flex items-center gap-1.5">
                    <Building2 size={15} className="text-primary" />
                    <span>{t.suggestedRecipients}</span>
                  </span>
                  <span className="text-caption text-ink-muted">
                    {locale === "km" ? "ពិនិត្យមុនពេលផ្ញើ" : "Review before send"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedRecipients.length > 0 ? (
                    suggestedRecipients.map((org) => (
                      <span
                        key={org.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-caption font-medium border border-line text-ink"
                      >
                        <span className="font-semibold">{tx(org.name)}</span>
                        <span className="text-caption text-ink-muted">({org.type})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-caption text-ink-muted">
                      {locale === "km" ? "ស្នងការដ្ឋាននគរបាលមូលដ្ឋាន ឬមន្ទីរពេទ្យបន្ទាន់" : "Local police division & emergency services"}
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* 2. LOCATION SAFETY (REQUIRED) */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-row font-bold text-ink flex items-center gap-2">
                  <MapPin size={18} className={locationConfirmed ? "text-fixed" : "text-reported"} />
                  <span>{locale === "km" ? "២. ទីតាំងកើតហេតុ (តម្រូវឱ្យមាន)" : "2. Incident Location (Required)"}</span>
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={requestGpsLocation}
                  disabled={isGpsLoading}
                  className="gap-1 text-caption text-primary hover:bg-primary-tint"
                >
                  <RefreshCw size={13} className={isGpsLoading ? "animate-spin" : ""} />
                  <span>{locale === "km" ? "ពិនិត្យ GPS" : "Refresh GPS"}</span>
                </Button>
              </div>

              {locationConfirmed ? (
                <div className="rounded-xl border border-fixed/30 bg-fixed-tint p-3.5 text-caption text-fixed-ink ">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    <span>{locale === "km" ? "GPS ត្រូវបានបញ្ជាក់ (កូអរដោនេផ្ទាល់)" : "GPS Location Confirmed"}</span>
                  </p>
                  <p className="mt-0.5 opacity-90">
                    {location?.lat.toFixed(5)}, {location?.lng.toFixed(5)} (±{accuracyM}m)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-reported/30 bg-reported-tint p-3.5 text-caption text-reported-ink ">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={16} className="text-reported" />
                      <span>{t.locationNotSharedWarning}</span>
                    </p>
                    <p className="mt-1 opacity-95">{t.locationLandmarkPrompt}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <SelectField
                      label={t.province}
                      value={provinceId}
                      onChange={(e) => {
                        setProvinceId(e.target.value);
                        const first = CITIES.find((c) => c.provinceId === e.target.value);
                        if (first) setCityId(first.id);
                      }}
                    >
                      {PROVINCES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {tx(p.name)}
                        </option>
                      ))}
                    </SelectField>

                    <SelectField
                      label={t.city}
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {tx(c.name)}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <TextField
                    label={locale === "km" ? "ទីតាំងសម្គាល់ / អាសយដ្ឋានដោយដៃ" : "Landmark / Manual Address"}
                    placeholder={locale === "km" ? "ឧ. ក្បែរផ្សារទួលទំពូង តូបលេខ ១២" : "e.g. Near Russian Market, Stall 12"}
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    required={!locationConfirmed}
                  />
                </div>
              )}
            </Card>

            {/* 3. OPTIONAL FIELDS: Description, Injured, Time, Suggested Severity */}
            <Card className="p-5 space-y-4">
              <h3 className="text-row font-bold text-ink">
                {locale === "km" ? "៣. ព័ត៌មានបន្ថែម (ជាជម្រើស)" : "3. Additional Details (Optional)"}
              </h3>

              <div>
                <TextField
                  label={locale === "km" ? "ការពិពណ៌នាហេតុការណ៍" : "Incident Description"}
                  placeholder={locale === "km" ? "បញ្ជាក់ព័ត៌មានលម្អិតអំពីអ្វីដែលបានកើតឡើង..." : "Key details about what happened..."}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Number Injured Presets (0 / 1 / 2-5 / 5+) */}
                <div>
                  <label className="text-meta font-bold text-ink block mb-1.5">
                    {t.numInjuredLabel}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["0", "1", "2-5", "5+"] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNumInjured(preset)}
                        className={`rounded-lg py-2 text-center text-caption font-bold border transition-all ${
                          numInjured === preset
                            ? "border-primary bg-primary text-white"
                            : "border-line bg-surface text-ink hover:border-ink-muted"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time (default now) */}
                <div>
                  <label className="text-meta font-bold text-ink block mb-1.5">
                    {t.occurredAtLabel}
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-meta text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Suggested Severity (User suggestion, shown as waiting for org to set severity) */}
                <div>
                  <label className="text-meta font-bold text-ink block mb-1.5">
                    {locale === "km" ? "កម្រិតស្នើ" : "Suggested Severity"}
                  </label>
                  <select
                    value={suggestedSeverity}
                    onChange={(e) => setSuggestedSeverity(e.target.value as EmSeverity)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-meta text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                  <span className="block mt-1 text-caption italic text-ink-muted leading-tight">
                    ({t.waitingForOrgSeverity})
                  </span>
                </div>
              </div>
            </Card>

            {/* 4. PHOTOS: EXIF Stripping, Compression, Safety Warning */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-row font-bold text-ink flex items-center gap-2">
                  <Camera size={18} className="text-primary" />
                  <span>{t.photoUploadLabel}</span>
                </h3>
                <span className="text-caption text-ink-muted">{photoUrls.length}/4</span>
              </div>

              {/* Safety Danger Warning */}
              <div className="rounded-xl border border-danger/30 bg-danger-tint p-3 text-caption font-bold text-danger">
                {t.photoDangerWarning}
              </div>

              {/* EXIF Stripping & Sensitive Media Privacy Notice */}
              <div className="rounded-xl border border-line bg-sand p-3 space-y-1 text-caption text-ink-muted">
                <p className="text-fixed-ink font-semibold">
                  {t.photoExifStripped}
                </p>
                <p>{t.mediaSensitiveDefault}</p>
              </div>

              {/* Upload Input & Thumbnails */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {photoUrls.length < 4 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isProcessingPhotos}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 font-bold"
                  >
                    <Upload size={15} />
                    <span>
                      {isProcessingPhotos
                        ? locale === "km"
                          ? "កំពុងលុប EXIF និងបង្រួមរូបភាព..."
                          : "Stripping EXIF & compressing..."
                        : locale === "km"
                        ? "ជ្រើសរើសរូបថត (អតិបរមា ៤)"
                        : "Choose Photos (Max 4)"}
                    </span>
                  </Button>
                )}

                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {photoUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-line bg-sand aspect-square">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1.5 right-1.5 rounded-full bg-ink p-1 text-white hover:bg-danger transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 py-0.5 text-caption font-mono text-white">
                          Clean EXIF
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* 5. CONSENT TOGGLES (Stored in consents, off by default except sending to orgs) */}
            <Card className="p-5 space-y-4">
              <h3 className="text-row font-bold text-ink flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                <span>{locale === "km" ? "៥. ការយល់ព្រមចែករំលែកទិន្នន័យ" : "5. Privacy & Consents"}</span>
              </h3>

              <div className="space-y-3">
                {/* 1. Share with response organizations (Default ON) */}
                <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 cursor-pointer hover:bg-sand transition-colors">
                  <input
                    type="checkbox"
                    checked={consents.shareWithOrganizations}
                    onChange={(e) => setConsents({ ...consents, shareWithOrganizations: e.target.checked })}
                    className="mt-0.5 size-4 rounded border-line text-primary focus:ring-primary"
                  />
                  <div className="text-caption">
                    <span className="font-bold text-ink block">{t.consentShareOrgs}</span>
                    <span className="text-ink-muted">
                      {locale === "km"
                        ? "បញ្ជូនព័ត៌មានទៅកាន់ស្ថាប័នពាក់ព័ន្ធ (នគរបាល ពន្លត់អគ្គិភ័យ ឬសង្គ្រោះ)"
                        : "Dispatches the report to police, fire, or ambulance teams."}
                    </span>
                  </div>
                </label>

                {/* 2. Allow responders to call me (Default OFF) */}
                <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 cursor-pointer hover:bg-sand transition-colors">
                  <input
                    type="checkbox"
                    checked={consents.allowCallback}
                    onChange={(e) => setConsents({ ...consents, allowCallback: e.target.checked })}
                    disabled={consents.anonymous}
                    className="mt-0.5 size-4 rounded border-line text-primary focus:ring-primary"
                  />
                  <div className="text-caption">
                    <span className="font-bold text-ink block">{t.consentAllowCallback}</span>
                    <span className="text-ink-muted">{t.orgPhoneVisibilityNotice}</span>
                  </div>
                </label>

                {/* 3. Share with media (Default OFF) */}
                <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 cursor-pointer hover:bg-sand transition-colors">
                  <input
                    type="checkbox"
                    checked={consents.shareWithMedia}
                    onChange={(e) => setConsents({ ...consents, shareWithMedia: e.target.checked })}
                    className="mt-0.5 size-4 rounded border-line text-primary focus:ring-primary"
                  />
                  <div className="text-caption">
                    <span className="font-bold text-ink block">{t.consentShareMedia}</span>
                    <span className="text-ink-muted">
                      {locale === "km"
                        ? "សម្រាប់តែការចេញផ្សាយព័ត៌មានទូទៅ គ្មានឈ្មោះ មុខ ឬលេខទូរស័ព្ទឡើយ។"
                        : "General area only. Names, faces, and phone numbers are strictly removed."}
                    </span>
                  </div>
                </label>

                {/* 4. Report anonymously (Default OFF) */}
                <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 cursor-pointer hover:bg-sand transition-colors">
                  <input
                    type="checkbox"
                    checked={consents.anonymous}
                    onChange={(e) => {
                      const anon = e.target.checked;
                      setConsents({
                        ...consents,
                        anonymous: anon,
                        allowCallback: anon ? false : consents.allowCallback,
                      });
                    }}
                    className="mt-0.5 size-4 rounded border-line text-primary focus:ring-primary"
                  />
                  <div className="text-caption">
                    <span className="font-bold text-ink block">{t.consentAnonymous}</span>
                    <span className="text-ink-muted">
                      {locale === "km"
                        ? "លាក់អត្តសញ្ញាណរបស់អ្នកទាំងស្រុងពីក្រុមសង្គ្រោះ និងអ្នកគ្រប់គ្រង។"
                        : "Completely hides your identity from responders."}
                    </span>
                  </div>
                </label>
              </div>
            </Card>

            {/* SUBMIT BUTTON */}
            <div className="flex justify-end gap-3 pt-2">
              <Link href="/emergency">
                <Button type="button" variant="secondary" size="lg">
                  {t.close}
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="gap-2 font-bold px-8 shadow-card"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>{locale === "km" ? "ដាក់ស្នើរបាយការណ៍" : "Submit Incident Report"}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </PageContainer>
  );
}
