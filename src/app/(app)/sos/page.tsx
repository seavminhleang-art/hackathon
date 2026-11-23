"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api";
import { offlineQueue } from "@/lib/api/offline-queue";
import { PageContainer } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/ui";
import { EMERGENCY_HOTLINES, PROVINCES, CITIES } from "@/lib/mock/data";
import { EM_INCIDENT_TYPES } from "@/lib/mock/emergency";
import type {
  EmergencyHotline,
  EmIncidentForReporter,
  EmIncidentType,
  EmSosResult,
  LatLng,
} from "@/types";

type SosStep = "READY" | "HOLDING" | "COUNTDOWN" | "ACTIVE" | "OFFLINE_QUEUED" | "CLOSED";

export default function SosPage() {
  const { t, tx, locale } = useLocale();
  const { user } = useAuth();

  // Pinned hotlines (Unverified, check before launch, works offline)
  const [hotlines] = useState<EmergencyHotline[]>(EMERGENCY_HOTLINES);

  // SOS Flow State
  const [step, setStep] = useState<SosStep>("READY");
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%
  const [countdown, setCountdown] = useState(5); // 5s countdown
  const [tapConfirmCount, setTapConfirmCount] = useState(0); // accessible 2-tap confirm alternative
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);

  // Emergency Type Suggestion
  const [selectedType, setSelectedType] = useState<EmIncidentType>("MEDICAL");
  const [sosNote, setSosNote] = useState("");

  // Location tracking state
  const [location, setLocation] = useState<LatLng | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"CONFIRMED" | "UNCONFIRMED">("UNCONFIRMED");
  const [accuracyM, setAccuracyM] = useState<number | undefined>(undefined);
  const [landmark, setLandmark] = useState("");
  const [provinceId, setProvinceId] = useState(user?.provinceId || "phnom-penh");
  const [cityId, setCityId] = useState(user?.cityId || "doun-penh");
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Active Incident Data
  const [activeIncident, setActiveIncident] = useState<EmIncidentForReporter | null>(null);
  const [sosResult, setSosResult] = useState<EmSosResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Audio beep simulation & Silent SOS (Discreet mode)
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSilentSos, setIsSilentSos] = useState(false);

  // Timers
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Background tab & locked phone safety: Never silently send on wake
  const [wasBackgroundedDuringCountdown, setWasBackgroundedDuringCountdown] = useState(false);
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (step === "COUNTDOWN") {
          wasHiddenRef.current = true;
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }
      } else {
        if (wasHiddenRef.current && step === "COUNTDOWN") {
          setWasBackgroundedDuringCountdown(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [step]);

  // Geolocation request on mount
  useEffect(() => {
    requestGpsLocation();
  }, []);

  const requestGpsLocation = () => {
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
        // GPS denied or unavailable: NEVER substitute city center
        setLocation(null);
        setLocationConfirmed(false);
        setLocationStatus("UNCONFIRMED");
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  // 1. PRESS & HOLD 2 SECONDS LOGIC
  const startHold = () => {
    if (step !== "READY") return;
    setStep("HOLDING");
    setHoldProgress(0);

    const startTime = Date.now();
    const duration = 2000; // 2 seconds

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(progress);

      if (elapsed >= duration) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
        triggerCountdown();
      }
    }, 40);
  };

  const cancelHold = () => {
    if (step === "HOLDING") {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
      setHoldProgress(0);
      setStep("READY");
    }
  };

  // Accessible 2-tap activation alternative
  const handleAccessibleTap = () => {
    if (step !== "READY") return;
    if (tapConfirmCount === 0) {
      setTapConfirmCount(1);
      const timer = setTimeout(() => {
        setTapConfirmCount(0);
      }, 3000);
      setTapTimer(timer);
    } else {
      if (tapTimer) clearTimeout(tapTimer);
      setTapConfirmCount(0);
      triggerCountdown();
    }
  };

  // 2. COUNTDOWN 5 SECONDS LOGIC (Timestamp-based + Background Paused to prevent silent send on wake)
  const triggerCountdown = () => {
    setStep("COUNTDOWN");
    setCountdown(5);
    setWasBackgroundedDuringCountdown(false);
    wasHiddenRef.current = false;

    const targetTime = Date.now() + 5000;
    countdownIntervalRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        wasHiddenRef.current = true;
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
        return;
      }
      const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
        if ((typeof document !== "undefined" && document.hidden) || wasHiddenRef.current) {
          setWasBackgroundedDuringCountdown(true);
          return;
        }
        dispatchSos();
      }
    }, 100);
  };

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setStep("READY");
    setCountdown(5);
    setHoldProgress(0);
    setWasBackgroundedDuringCountdown(false);
    wasHiddenRef.current = false;
  };

  // 3. DISPATCH SOS LOGIC
  const dispatchSos = async () => {
    setIsSubmitting(true);
    const payload = {
      type: selectedType,
      note: sosNote.trim() || undefined,
      location: location || undefined,
      locationSource: locationConfirmed ? ("GPS" as const) : ("TEXT" as const),
      locationConfirmed,
      locationStatus,
      accuracyM: locationConfirmed ? accuracyM : undefined,
      landmark: landmark.trim() || undefined,
      provinceId,
      cityId,
      notifyTrustedContacts: true,
      shareContactWithResponders: true,
    };

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Network offline");
      }
      const res = await api.em.sendSos(payload);
      setSosResult(res);
      setActiveIncident(res.incident);
      setStep("ACTIVE");
    } catch (err: any) {
      // Offline fallback: Queue submission
      offlineQueue.add("SOS", payload, err);
      setStep("OFFLINE_QUEUED");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. ACCIDENTAL CANCEL vs I'M SAFE CLOSE
  const handleAccidentalCancel = async () => {
    if (!activeIncident) return;

    // Extra confirmation when cancelling after an organization is already RESPONDING
    const isResponding =
      activeIncident.status === "RESPONDING" ||
      activeIncident.dispatches.some((d) => d.status === "RESPONDING");
    if (isResponding) {
      const proceed = window.confirm(t.extraConfirmCancelResponding);
      if (!proceed) return;
    }

    try {
      setIsSubmitting(true);
      const updated = await api.em.cancelSosAccidental(activeIncident.id);
      setActiveIncident(updated);
      setStep("CLOSED");
      setActionMessage(t.sosAccidentalCancelDone);
    } catch (err: any) {
      alert(err?.message || "Failed to cancel");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSafeClose = async () => {
    if (!activeIncident) return;
    try {
      setIsSubmitting(true);
      const updated = await api.em.closeSosSafe(activeIncident.id);
      setActiveIncident(updated);
      setStep("CLOSED");
      setActionMessage(t.sosSafeCloseDone);
    } catch (err: any) {
      alert(err?.message || "Failed to close");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll active incident updates every 5 seconds when in ACTIVE step
  useEffect(() => {
    if (step !== "ACTIVE" || !activeIncident) return;
    const interval = setInterval(async () => {
      try {
        const refreshed = await api.em.getMyIncident(activeIncident.id);
        setActiveIncident(refreshed);
      } catch {
        // Silently keep current state on poll error
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, activeIncident]);

  const cities = CITIES.filter((c) => c.provinceId === provinceId);
  const helpOnTheWay = activeIncident ? api.em.isHelpOnTheWay(activeIncident) : false;

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6 pb-20">
        <PageHeader
          title={locale === "km" ? "សង្គ្រោះបន្ទាន់ SOS" : "Emergency SOS"}
          subtitle={locale === "km" ? "ហៅទូរស័ព្ទផ្ទាល់ ឬផ្ញើជំនួយសង្គ្រោះបន្ទាន់ក្នុងកម្មវិធី" : "Direct hotlines & 1-touch rapid emergency dispatch"}
          back="/emergency"
        />

        {/* 1. PINNED 117/118/119 HOTLINES (Always accessible, never blocked) */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-meta font-bold text-ink">
              {t.emergencyHotlinesAlwaysAvailable}
            </span>
            <span className="text-[11px] font-semibold text-danger bg-danger-tint px-2 py-0.5 rounded-full border border-danger/30">
              {t.unverifiedCheckBeforeLaunch}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {hotlines.map((h) => (
              <a
                key={h.id}
                href={`tel:${h.number}`}
                className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface-alt p-2.5 text-center transition-all hover:border-danger hover:bg-danger-tint group"
              >
                <div className="text-2xl">{h.icon}</div>
                <span className="text-row font-black text-danger group-hover:underline">
                  {h.number}
                </span>
                <span className="text-caption font-bold text-ink">{tx(h.name)}</span>
              </a>
            ))}
          </div>
        </div>

        {/* 2. SOS READY / TRIGGER SCREEN */}
        {step === "READY" || step === "HOLDING" ? (
          <div className="space-y-6">
            {/* Emergency Type Selector (Suggestion only) */}
            <Card className="p-5">
              <h3 className="text-row font-bold text-ink mb-3">
                {locale === "km" ? "ប្រភេទគ្រោះអាសន្ន (ការស្នើសុំ)" : "Emergency Type (Suggestion)"}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EM_INCIDENT_TYPES.map((type) => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-danger bg-danger-tint font-bold text-danger ring-2 ring-danger/30"
                          : "border-line bg-surface hover:border-ink-muted text-ink"
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-caption leading-tight">{tx(type.label)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Note */}
              <div className="mt-4">
                <TextField
                  label={locale === "km" ? "កំណត់សម្គាល់បន្ថែម (ជាជម្រើស)" : "Optional brief note"}
                  placeholder={locale === "km" ? "ឧ. របួសជើង, ត្រូវការជំនួយជាបន្ទាន់..." : "e.g. Leg injured, need immediate help..."}
                  value={sosNote}
                  onChange={(e) => setSosNote(e.target.value)}
                />
              </div>
            </Card>

            {/* Location Status & Safety Controls */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className={locationConfirmed ? "text-emerald-600" : "text-amber-600"} />
                  <h3 className="text-row font-bold text-ink">
                    {locale === "km" ? "ទីតាំងរបស់អ្នក" : "Your Location"}
                  </h3>
                </div>
                <Button
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
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 p-3 text-caption text-emerald-800 dark:text-emerald-200">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>{locale === "km" ? "GPS ត្រូវបានបញ្ជាក់" : "GPS Location Confirmed"}</span>
                  </p>
                  <p className="mt-0.5 opacity-90">
                    {location?.lat.toFixed(5)}, {location?.lng.toFixed(5)} (±{accuracyM}m)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-caption text-amber-900 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      <span>{t.locationNotSharedWarning}</span>
                    </p>
                    <p className="mt-1 opacity-90">{t.locationLandmarkPrompt}</p>
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
                    placeholder={locale === "km" ? "ឧ. ក្បែរផ្សារទួលទំពូង តូបលេខ ១២" : "e.g. Near Russian Market stall 12"}
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    required
                  />
                </div>
              )}
            </Card>

            {/* Silent SOS Toggle (Discreet Mode) */}
            <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl ${isSilentSos ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-sand text-ink-muted"}`}>
                  {isSilentSos ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </div>
                <div>
                  <h4 className="text-meta font-bold text-ink">{t.silentSos}</h4>
                  <p className="text-caption text-ink-muted">{t.silentSosDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSilentSos(!isSilentSos)}
                className={`relative inline-flex h-6 w-11 flex-none cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSilentSos ? "bg-amber-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isSilentSos ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Big 2-Second Hold SOS Button */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative flex items-center justify-center">
                {/* Visual Progress Ring */}
                <svg className="h-56 w-56 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#fee2e2"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="8"
                    strokeDasharray={276.46}
                    strokeDashoffset={276.46 - (276.46 * holdProgress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-75"
                  />
                </svg>

                {/* Main Action Touch Button (With contextmenu preventDefault and touch-action none) */}
                <button
                  type="button"
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  onTouchCancel={cancelHold}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
                  className={`absolute flex h-40 w-40 flex-col items-center justify-center rounded-full bg-danger text-white shadow-sos active:scale-95 transition-all select-none focus:outline-none focus:ring-4 focus:ring-danger/50 ${
                    isSilentSos ? "ring-2 ring-amber-400" : ""
                  }`}
                >
                  <ShieldAlert size={44} className="mb-1" />
                  <span className="text-2xl font-black tracking-wider">SOS</span>
                  <span className="text-[11px] font-semibold opacity-90">{t.holdToActivateSos.slice(0, 16)}...</span>
                </button>
              </div>

              <p className="mt-4 text-center text-meta font-bold text-ink">
                {t.holdToActivateSos}
              </p>
              <p className="text-center text-caption text-ink-muted">
                {t.releaseCancelsSos}
              </p>

              {/* Accessible Alternative: Deliberate 2-Tap Confirm */}
              <div className="mt-6 border-t border-line pt-4 text-center">
                <Button
                  variant={tapConfirmCount === 1 ? "danger" : "secondary"}
                  size="sm"
                  onClick={handleAccessibleTap}
                  className="gap-2 font-bold"
                >
                  <Shield size={16} />
                  <span>
                    {tapConfirmCount === 1
                      ? locale === "km"
                        ? "ចុចម្តងទៀតដើម្បីបញ្ជាក់ SOS!"
                        : "Tap again to confirm SOS!"
                      : t.tapToActivateSos}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 3. 5-SECOND COUNTDOWN SCREEN */}
        {step === "COUNTDOWN" && (
          <Card className="p-8 text-center bg-danger-tint border-danger/40">
            {wasBackgroundedDuringCountdown ? (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="flex justify-center mb-2 text-amber-600">
                  <AlertTriangle size={44} className="animate-bounce" />
                </div>
                <h2 className="text-title font-black text-ink">
                  {locale === "km" ? "ការរាប់ថយក្រោយត្រូវបានផ្អាក" : "Countdown Paused"}
                </h2>
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950 text-caption text-amber-900 dark:text-amber-200 text-left">
                  <p className="font-bold">
                    {locale === "km"
                      ? "⚠️ អេក្រង់ត្រូវបានបិទ ឬចាក់សោកំឡុងពេលរាប់ថយក្រោយ។"
                      : "⚠️ Screen was locked or minimized during countdown."}
                  </p>
                  <p className="mt-1">
                    {locale === "km"
                      ? "ដើម្បីការពារការផ្ញើច្រឡំដោយមិនដឹងខ្លួន សំណើ SOS មិនត្រូវបានផ្ញើដោយស្វ័យប្រវត្តិឡើយ។ សូមបញ្ជាក់ថាតើអ្នកពិតជាចង់ផ្ញើ SOS ឬបោះបង់?"
                      : "To prevent accidental triggers in pocket/background, SOS was not sent automatically. Please confirm if you want to send SOS or cancel."}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={() => {
                      setWasBackgroundedDuringCountdown(false);
                      dispatchSos();
                    }}
                    className="font-bold px-8 shadow-card"
                  >
                    <CheckCircle2 size={18} className="mr-2" />
                    <span>{locale === "km" ? "ផ្ញើ SOS ឥឡូវនេះ" : "Send SOS Now"}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={cancelCountdown}
                    className="font-bold px-6"
                  >
                    <XCircle size={18} className="mr-2" />
                    <span>{t.cancelCountdownBtn}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-3 text-danger">
                  <Volume2 size={36} className="animate-pulse" />
                </div>
                <h2 className="text-title font-black text-danger">
                  {t.sosCountdownTitle}
                </h2>
                <div className="my-6">
                  <span className="font-mono text-7xl font-black text-danger">
                    {countdown}
                  </span>
                  <span className="block text-meta font-bold text-danger mt-1">
                    {t.sosCountdownSeconds}
                  </span>
                </div>

                <p className="text-meta text-ink mb-6 max-w-md mx-auto">
                  {locale === "km"
                    ? "ប្រសិនបើចុចច្រឡំ សូមចុចបោះបង់ភ្លាមៗ។ គ្មានសំណើ ឬការជូនដំណឹងណាមួយត្រូវបានផ្ញើរហូតដល់ចប់ការរាប់ថយក្រោយ។"
                    : "If pressed by mistake, cancel now. Nothing is created or sent until the countdown reaches zero."}
                </p>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={cancelCountdown}
                  className="w-full sm:w-auto px-8 py-3 text-row font-bold border-2 border-danger text-danger hover:bg-danger hover:text-white"
                >
                  <XCircle size={20} className="mr-2" />
                  <span>{t.cancelCountdownBtn}</span>
                </Button>
              </>
            )}
          </Card>
        )}

        {/* 4. OFFLINE QUEUED SCREEN */}
        {step === "OFFLINE_QUEUED" && (
          <Card className="p-6 border-amber-300 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="flex-none text-amber-600 mt-0.5" />
              <div>
                <h3 className="text-row font-bold">{locale === "km" ? "មិនទាន់បានផ្ញើទៅកាន់ក្រុមសង្គ្រោះ" : "SOS Not Yet Sent to Responders"}</h3>
                <p className="mt-1 text-caption opacity-95">{t.offlineQueueNotice}</p>
                <p className="mt-3 text-meta font-bold text-ink">
                  {locale === "km" ? "សូមហៅទូរស័ព្ទផ្ទាល់ទៅកាន់លេខទូរស័ព្ទបន្ទាន់ខាងលើភ្លាមៗ!" : "Please call the direct emergency hotlines above immediately!"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button variant="primary" size="sm" onClick={() => offlineQueue.retryAll(dispatchSos)}>
                    <RefreshCw size={14} className="mr-1.5" />
                    <span>{locale === "km" ? "ព្យាយាមផ្ញើម្តងទៀត" : "Retry Sending"}</span>
                  </Button>
                  <a
                    href={`sms:117?body=${encodeURIComponent(
                      `EMERGENCY SOS: ${selectedType}. ${landmark || (location ? `${location.lat},${location.lng}` : "Phnom Penh")}`
                    )}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-100 dark:bg-amber-900 px-3 py-1.5 text-caption font-bold text-amber-950 dark:text-amber-100 hover:bg-amber-200"
                  >
                    <Phone size={14} />
                    <span>{t.smsFallbackBtn}</span>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => setStep("READY")}>
                    {t.close}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 5. ACTIVE INCIDENT TRACKING SCREEN */}
        {step === "ACTIVE" && activeIncident && (
          <div className="space-y-6">
            {/* Main Status Header */}
            <Card className="p-6 border-primary/30">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <span className="text-caption font-semibold text-ink-muted">
                    {locale === "km" ? "លេខកូដករណីបន្ទាន់" : "Emergency Incident Code"}
                  </span>
                  <h2 className="font-mono text-2xl font-black text-primary">
                    {activeIncident.code}
                  </h2>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-danger px-3 py-1 text-meta font-bold text-white">
                    {activeIncident.status}
                  </span>
                  {activeIncident.suggestedSeverity && (
                    <span className="text-[11px] text-ink-muted">
                      {locale === "km" ? "កម្រិតស្នើ៖ " : "Suggested: "}
                      <strong className="text-ink">{activeIncident.suggestedSeverity}</strong>{" "}
                      <span className="italic">({t.waitingForOrgSeverity})</span>
                    </span>
                  )}
                  <span className="text-caption text-ink-muted">
                    {activeIncident.occurredAt.slice(11, 16)}
                  </span>
                </div>
              </div>

              {/* Responder Status: Only show Help is on the way when RESPONDING! */}
              {helpOnTheWay ? (
                <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950 p-4 text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-600 flex-none" />
                  <div>
                    <h4 className="font-bold text-row">{t.helpIsOnTheWay}</h4>
                    <p className="text-caption opacity-90">
                      {locale === "km" ? "ក្រុមសង្គ្រោះបានឆ្លើយតប និងកំពុងធ្វើដំណើរទៅកាន់ទីតាំងរបស់អ្នក។" : "Responders have acknowledged and are en route to your location."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-line bg-surface-alt p-3.5 text-caption text-ink-muted flex items-center gap-2">
                  <Clock size={16} className="text-primary flex-none" />
                  <span>
                    {locale === "km"
                      ? "សំណើត្រូវបានបញ្ជូនទៅកាន់ស្ថាប័នពាក់ព័ន្ធ។ កំពុងរង់ចាំការឆ្លើយតប..."
                      : "Dispatched to emergency services. Waiting for responder acknowledgment..."}
                  </span>
                </div>
              )}

              {/* Location Confirmation Notice */}
              {!activeIncident.locationConfirmed && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-caption text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-600 flex-none" />
                  <span>{t.locationUnconfirmedFlagged}: {activeIncident.landmark || t.locationLandmarkPrompt}</span>
                </div>
              )}

              {/* Dispatched Organizations */}
              <div className="mt-5">
                <h4 className="text-meta font-bold text-ink mb-2.5 flex items-center gap-1.5">
                  <Building2 size={16} className="text-primary" />
                  <span>{t.dispatchesLabel}</span>
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeIncident.dispatches.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-surface p-3"
                    >
                      <div>
                        <span className="font-semibold text-meta block">{tx(d.organizationName)}</span>
                        <span className="text-caption text-ink-muted">{d.organizationType}</span>
                        {d.responseInfo && (
                          <span className="text-caption block text-primary font-medium mt-0.5">
                            {d.responseInfo}
                          </span>
                        )}
                      </div>
                      <span className={`text-caption font-bold px-2 py-0.5 rounded ${
                        d.status === "RESPONDING"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-sand text-ink"
                      }`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerted Contacts */}
              <div className="mt-5">
                <h4 className="text-meta font-bold text-ink mb-2 flex items-center gap-1.5">
                  <Users size={16} className="text-primary" />
                  <span>{t.alertedContactsLabel}</span>
                </h4>
                {sosResult && (sosResult.notifiedInApp.length > 0 || sosResult.smsLinks.length > 0) ? (
                  <div className="flex flex-wrap gap-2">
                    {sosResult.notifiedInApp.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 px-2.5 py-1 text-caption font-medium border border-emerald-200"
                      >
                        <Check size={13} />
                        <span>{name} (In-App)</span>
                      </span>
                    ))}
                    {sosResult.smsLinks.map((s) => (
                      <span
                        key={s.name}
                        className="inline-flex items-center gap-1 rounded-md bg-sand px-2.5 py-1 text-caption font-medium text-ink border border-line"
                      >
                        <span>{s.name} (SMS Sent)</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-caption text-ink-muted">
                    {locale === "km" ? "គ្មានទំនាក់ទំនងបន្ទាន់ដែលបានបញ្ជាក់ត្រូវបានកំណត់ឡើយ។" : "No confirmed contacts were configured."}
                  </p>
                )}
              </div>

              {/* DEV-ONLY RESPONSE SIMULATOR (Test statuses before Step 5) */}
              <div className="mt-6 rounded-xl border border-dashed border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-caption font-bold text-amber-900 dark:text-amber-200">
                    🛠️ {t.devSimulatorTitle}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded">
                    DEV ONLY
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[12px]"
                    onClick={async () => {
                      const res = await api.em.devSimulateDispatch(activeIncident.id, "RECEIVED");
                      setActiveIncident(res);
                    }}
                  >
                    {t.simulateReceived}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[12px]"
                    onClick={async () => {
                      const res = await api.em.devSimulateDispatch(activeIncident.id, "ACKNOWLEDGED");
                      setActiveIncident(res);
                    }}
                  >
                    {t.simulateAcknowledged}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[12px] text-emerald-700 dark:text-emerald-300 border-emerald-300"
                    onClick={async () => {
                      const res = await api.em.devSimulateDispatch(activeIncident.id, "RESPONDING", {
                        responseInfo: "Units en route to your location",
                      });
                      setActiveIncident(res);
                    }}
                  >
                    {t.simulateResponding}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[12px]"
                    onClick={async () => {
                      const res = await api.em.devSimulateDispatch(activeIncident.id, "RESOLVED");
                      setActiveIncident(res);
                    }}
                  >
                    {t.simulateResolved}
                  </Button>
                </div>
              </div>

              {/* TWO SEPARATE ACTIONS: Cancel SOS (Accidental) vs I'm Safe (Close SOS) */}
              <div className="mt-6 border-t border-line pt-4 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAccidentalCancel}
                  disabled={isSubmitting}
                  className="text-ink-muted hover:text-danger hover:border-danger"
                >
                  <XCircle size={15} className="mr-1.5" />
                  <span>{t.cancelSosMistake}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSafeClose}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 size={15} className="mr-1.5" />
                  <span>{t.closeSosSafeBtn}</span>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* 6. INCIDENT RESOLVED / CANCELLED SCREEN */}
        {step === "CLOSED" && (
          <Card className="p-8 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-3" />
            <h3 className="text-title font-bold text-ink">
              {actionMessage || t.sosSafeCloseDone}
            </h3>
            {activeIncident?.closedByUser && (
              <span className="inline-block mt-2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 px-3 py-1 text-caption font-bold border border-emerald-300">
                {t.closedByUserBadge}
              </span>
            )}
            <p className="text-meta text-ink-muted mt-1">
              {locale === "km"
                ? "ស្ថាប័នសង្គ្រោះបន្ទាន់ និងទំនាក់ទំនងរបស់អ្នកត្រូវបានជូនដំណឹងអំពីការបិទនេះរួចរាល់។"
                : "Emergency responders and your contacts have been notified of this update."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setStep("READY")}>
                {locale === "km" ? "ត្រឡប់ទៅផ្ទាំង SOS" : "Back to SOS"}
              </Button>
              <Link href="/emergency">
                <Button variant="primary">
                  {locale === "km" ? "ទំព័រដើមសង្គ្រោះបន្ទាន់" : "Emergency Hub"}
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
