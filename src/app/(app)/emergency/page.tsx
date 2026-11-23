"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Clock, Navigation, ShieldAlert, Users, XCircle } from "lucide-react";
import { HotlineStrip, useIncidentTypes } from "@/features/emergency/meta";
import { api } from "@/lib/api";
import { isHelpOnTheWay } from "@/lib/api/emergency-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, CountBadge, PageHeader, Sheet, TextField } from "@/components/ui";
import { PHNOM_PENH_CENTER } from "@/lib/mock/data";
import type { EmIncidentForReporter, EmIncidentType, EmTrustedContact, LatLng } from "@/types";

type SosStep = "IDLE" | "HOLDING" | "COUNTDOWN" | "SENDING" | "TRACKING";

/** Wall-clock time for hold timers (kept outside render). */
const nowMs = () => Date.now();

export default function EmergencyHubPage() {
  const { t, tx, locale } = useLocale();
  const EM_INCIDENT_TYPES = useIncidentTypes();
  const { user } = useAuth();

  // Hotlines state (Unverified, check before launch)

  // SOS Flow state
  const [sosStep, setSosStep] = useState<SosStep>("IDLE");
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%
  const [countdown, setCountdown] = useState(5);
  const [selectedType, setSelectedType] = useState<EmIncidentType>("ROAD_CRASH");
  const [activeIncident, setActiveIncident] = useState<EmIncidentForReporter | null>(null);
  const [sosError, setSosError] = useState<string | null>(null);

  // Location Safety states
  const [currentLocation, setCurrentLocation] = useState<LatLng>(PHNOM_PENH_CENTER);
  const [isGpsConfirmed, setIsGpsConfirmed] = useState(false);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [manualLandmark, setManualLandmark] = useState("");

  // Cancel Incident Modal (for normal reports requiring reason)
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Contacts summary
  const [contacts, setContacts] = useState<EmTrustedContact[]>([]);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load hotlines, contacts, active incident, and GPS
  useEffect(() => {
    const deferred = setTimeout(() => {

    if (user) {
      api.em.listTrustedContacts().then(setContacts).catch(() => {});
      api.em.myIncidents().then((list) => {
        const active = list.find(
          (inc) => !["RESOLVED", "REJECTED", "CANCELLED", "DUPLICATE"].includes(inc.status)
        );
        if (active) {
          setActiveIncident(active);
          setSosStep("TRACKING");
        }
      }).catch(() => {});
    }

    // Geolocation safety check: never silently assume confirmed GPS
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setIsGpsConfirmed(true);
          setGpsErrorMsg(null);
        },
        (err) => {
          setIsGpsConfirmed(false);
          setGpsErrorMsg(
            locale === "km"
              ? "មិនអាចទាញយកទីតាំង GPS បានទេ។ សូមបញ្ចូលទីតាំងសម្គាល់ដោយដៃ។"
              : "GPS location unavailable or denied. Please provide a manual landmark."
          );
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsGpsConfirmed(false);
      setGpsErrorMsg(
        locale === "km"
          ? "កម្មវិធីរុករកមិនគាំទ្រ Geolocation ទេ។"
          : "Geolocation not supported by browser."
      );
    }
      }, 0);
    return () => clearTimeout(deferred);
  }, [user, locale]);

  // ---------- SOS Hold Logic (2s hold) ----------
  const startHold = () => {
    if (sosStep !== "IDLE") return;
    setSosStep("HOLDING");
    setHoldProgress(0);

    const startTime = nowMs();
    const duration = 2000;

    holdTimerRef.current = setInterval(() => {
      const elapsed = nowMs() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setHoldProgress(pct);

      if (elapsed >= duration) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        startCountdown();
      }
    }, 50);
  };

  const cancelHold = () => {
    if (sosStep === "HOLDING") {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      setHoldProgress(0);
      setSosStep("IDLE");
    }
  };

  // ---------- 5-second Cancel Countdown ----------
  const startCountdown = () => {
    setSosStep("COUNTDOWN");
    setCountdown(5);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          triggerSendSos();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const abortCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setSosStep("IDLE");
    setHoldProgress(0);
  };

  // ---------- Trigger Send SOS ----------
  const triggerSendSos = async () => {
    setSosStep("SENDING");
    setSosError(null);

    try {
      if (!user) {
        setSosError(locale === "km" ? "សូមចូលគណនីដើម្បីផ្ញើ SOS ក្នុងកម្មវិធី" : "Please sign in to send in-app SOS");
        setSosStep("IDLE");
        return;
      }

      // Location safety: if GPS was denied and no landmark was typed, prompt user
      if (!isGpsConfirmed && !manualLandmark.trim()) {
        const promptLandmark = window.prompt(
          locale === "km"
            ? "ទីតាំង GPS មិនទាន់ចែករំលែក។ សូមបញ្ចូលទីតាំងសម្គាល់ ឬឈ្មោះផ្លូវ៖"
            : "GPS not shared. Please enter a landmark or street name for responders:"
        );
        if (!promptLandmark || !promptLandmark.trim()) {
          setSosError(
            locale === "km"
              ? "តម្រូវឱ្យមានទីតាំងសម្គាល់នៅពេលគ្មាន GPS"
              : "A landmark is required when GPS is unavailable"
          );
          setSosStep("IDLE");
          return;
        }
        setManualLandmark(promptLandmark.trim());
      }

      const res = await api.em.sendSos({
        type: selectedType,
        location: currentLocation,
        locationSource: isGpsConfirmed ? "GPS" : "TEXT",
        locationConfirmed: isGpsConfirmed,
        locationStatus: isGpsConfirmed ? "CONFIRMED" : "UNCONFIRMED",
        landmark: manualLandmark.trim() || undefined,
        provinceId: user.provinceId || "phnom-penh",
        cityId: user.cityId || "doun-penh",
        shareContactWithResponders: true,
      });

      const inc = await api.em.getMyIncident(res.incident.id);
      setActiveIncident(inc);
      setSosStep("TRACKING");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      setSosError(err?.message || t.errGeneric);
      setSosStep("IDLE");
    }
  };

  // ---------- Accidental SOS Cancel (Sent by mistake - NO REASON REQUIRED) ----------
  const handleAccidentalCancel = async () => {
    if (!activeIncident) return;
    const confirmCancel = window.confirm(
      locale === "km"
        ? "តើអ្នកពិតជាចង់បោះបង់ SOS នេះ (ដោយសារចុចច្រឡំ) មែនទេ?"
        : "Are you sure you want to cancel this SOS (sent by mistake)?"
    );
    if (!confirmCancel) return;

    setIsCancelling(true);
    try {
      const updated = await api.em.cancelSosAccidental(activeIncident.id);
      setActiveIncident(updated);
      setSosStep("IDLE");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to cancel SOS");
    } finally {
      setIsCancelling(false);
    }
  };

  // ---------- Safe Close SOS ("I'm safe, close SOS") ----------
  const handleSafeClose = async () => {
    if (!activeIncident) return;
    const confirmSafe = window.confirm(
      locale === "km"
        ? "តើអ្នកមានសុវត្ថិភាពហើយ និងចង់បិទការសង្គ្រោះបន្ទាន់នេះមែនទេ?"
        : "Are you safe now and want to close this emergency incident?"
    );
    if (!confirmSafe) return;

    setIsCancelling(true);
    try {
      const updated = await api.em.closeSosSafe(activeIncident.id, "User indicated they are safe");
      setActiveIncident(updated);
      setSosStep("IDLE");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to close SOS");
    } finally {
      setIsCancelling(false);
    }
  };

  // ---------- Cancel Incident Modal Handler (with required reason for normal reports) ----------
  const handleCancelWithReason = async () => {
    if (!activeIncident || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      const updated = await api.em.cancelIncident(activeIncident.id, cancelReason);
      setActiveIncident(updated);
      setIsCancelOpen(false);
      setCancelReason("");
      setSosStep("IDLE");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to cancel incident");
    } finally {
      setIsCancelling(false);
    }
  };

  const activeContacts = contacts.filter((c) =>
    ["PENDING", "CONFIRMED", "MUTED"].includes(c.status)
  );
  const confirmedCount = contacts.filter((c) => c.status === "CONFIRMED").length;

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

  const getStatusLabel = (status: string) => {
    const key = `dispatchStatus${status}` as keyof typeof t;
    return t[key] || status;
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        <PageHeader
          title={t.emergencyHubTitle}
          subtitle={t.emergencyHubSubtitle}
          back="/"
        />

        <HotlineStrip />

        {/* LOCATION SAFETY WARNING (Never silently substitute Phnom Penh center) */}
        {!isGpsConfirmed && (
          <div className="rounded-2xl border-2 border-reported/30 bg-reported-tint p-4 text-reported-ink ">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 flex-none text-reported mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold text-row">{t.locationNotSharedWarning}</p>
                <p className="text-meta opacity-90">{t.locationLandmarkPrompt}</p>
                <div className="mt-2">
                  <input
                    type="text"
                    value={manualLandmark}
                    onChange={(e) => setManualLandmark(e.target.value)}
                    placeholder={
                      locale === "km"
                        ? "ឧទាហរណ៍៖ ក្បែរផ្សារធំថ្មី តូបលេខ ១២ ឬផ្ទះលេខ ៤៥ ផ្លូវ ១១០"
                        : "e.g. Near Central Market stall 12, or #45 St. 110"
                    }
                    className="w-full rounded-xl border border-reported/30 bg-white px-3.5 py-2 text-body text-ink focus:outline-none focus:ring-2 focus:ring-reported"
                  />
                </div>
                <p className="text-caption font-semibold text-reported-ink mt-1">
                  {t.locationNotConfirmedBadge}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. EMERGENCY SOS TRIGGER SECTION */}
        <Card className="border-2 border-danger/30 bg-danger p-6 shadow-sos">
          {sosStep === "TRACKING" && activeIncident ? (
            /* Dispatch Tracking View */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-3.5 rounded-full bg-fixed animate-ping" />
                  <span className="text-title font-extrabold text-ink">
                    {t.trackingStatus} · {activeIncident.code || activeIncident.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!activeIncident.locationConfirmed && (
                    <span className="rounded bg-reported-tint text-reported-ink px-2 py-0.5 text-caption font-bold border border-reported/30">
                      {t.locationNotConfirmedBadge}
                    </span>
                  )}
                  <span className="rounded-md bg-danger text-white px-2.5 py-1 text-caption font-bold">
                    {getStatusLabel(activeIncident.status)}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div
                className={`rounded-xl p-4 ring-1 ${
                  isHelpOnTheWay(activeIncident)
                    ? "bg-fixed-tint text-fixed-ink ring-fixed/30"
                    : "bg-reported-tint text-reported-ink ring-reported/30"
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold text-row">
                  {isHelpOnTheWay(activeIncident) ? (
                    <CheckCircle2 size={20} className="text-fixed" />
                  ) : (
                    <Clock size={20} className="text-reported animate-spin" />
                  )}
                  <span>
                    {isHelpOnTheWay(activeIncident)
                      ? t.helpIsOnTheWay
                      : t.helpNotYetDispatched}
                  </span>
                </div>
                <p className="mt-1 text-meta opacity-85">
                  {locale === "km"
                    ? "ស្ថានភាពជាក់ស្តែងត្រូវបានធ្វើបច្ចុប្បន្នភាពផ្ទាល់ពីស្ថាប័នឆ្លើយតប។"
                    : "Statuses reflect actual organization dispatch actions."}
                </p>
              </div>

              {/* Dispatches info */}
              <div className="space-y-2">
                <h4 className="text-body font-bold text-ink">
                  {locale === "km" ? "ស្ថាប័នឆ្លើយតបដែលបានបញ្ជូន" : "Dispatched Organizations"}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeIncident.dispatches.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-surface p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-primary" />
                        <div>
                          <span className="font-semibold text-meta block">{tx(d.organizationName)}</span>
                          <span className="text-caption text-ink-muted">{getOrgTypeLabel(d.organizationType)}</span>
                        </div>
                      </div>
                      <span className="text-caption font-bold text-primary bg-primary-tint px-2 py-0.5 rounded">
                        {getStatusLabel(d.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEPARATE ACTIONS: Cancel SOS (Accidental - no reason) vs I'm Safe (Close SOS) */}
              <div className="pt-3 flex flex-wrap items-center justify-end gap-3 border-t border-line">
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-danger border-danger/40 hover:bg-danger/10"
                  onClick={handleAccidentalCancel}
                  disabled={isCancelling}
                >
                  <XCircle size={16} />
                  <span>{t.cancelSosMistake}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-fixed hover:bg-fixed text-white"
                  onClick={handleSafeClose}
                  disabled={isCancelling}
                >
                  <CheckCircle2 size={16} />
                  <span>{t.closeSosSafeBtn}</span>
                </Button>
              </div>
            </div>
          ) : (
            /* SOS Button & Category Selection */
            <div className="text-center">
              <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-danger text-white shadow-sos">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-page font-extrabold text-ink">{t.sosTriggerTitle}</h2>
              <p className="mx-auto mt-1 max-w-lg text-body text-ink-muted">
                {t.sosTriggerHint}
              </p>

              {/* Emergency Category Selector */}
              <div className="mx-auto mt-4 max-w-xs text-left">
                <label className="text-meta font-bold text-ink">
                  {locale === "km" ? "ជ្រើសរើសប្រភេទគ្រោះអាសន្ន" : "Emergency Category"}
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-body font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-danger"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as EmIncidentType)}
                >
                  {EM_INCIDENT_TYPES.map((it) => (
                    <option key={it.id} value={it.id}>
                      {tx(it.label)} ({it.hotline})
                    </option>
                  ))}
                </select>
              </div>

              {/* Big Red Interactive SOS Button */}
              <div className="my-6 flex flex-col items-center justify-center">
                {sosStep === "COUNTDOWN" ? (
                  /* 5-second cancel countdown */
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex size-32 items-center justify-center rounded-full bg-danger text-display font-black text-white shadow-sos animate-pulse">
                      {countdown}s
                    </div>
                    <p className="text-row font-bold text-danger">
                      {fmt(t.cancelWithinSeconds, { n: countdown })}
                    </p>
                    <Button variant="secondary" onClick={abortCountdown}>
                      <XCircle size={18} />
                      {t.sosCancelBtn}
                    </Button>
                  </div>
                ) : (
                  /* Hold to Trigger SOS */
                  <div className="relative">
                    <button
                      type="button"
                      onMouseDown={startHold}
                      onMouseUp={cancelHold}
                      onMouseLeave={cancelHold}
                      onTouchStart={startHold}
                      onTouchEnd={cancelHold}
                      className="relative flex size-36 select-none flex-col items-center justify-center rounded-full bg-danger text-white shadow-sos transition-transform active:scale-95 hover:bg-danger-ink cursor-pointer"
                    >
                      <span className="text-display font-black tracking-wider">SOS</span>
                      <span className="text-caption font-bold opacity-90">
                        {t.holdToTrigger}
                      </span>
                    </button>

                    {/* Circular Hold Progress Indicator */}
                    {sosStep === "HOLDING" && (
                      <div className="mt-3 text-center">
                        <div className="h-2 w-36 overflow-hidden rounded-full bg-sand">
                          <div
                            className="h-full bg-danger transition-all duration-75"
                            style={{ width: `${holdProgress}%` }}
                          />
                        </div>
                        <span className="mt-1 block text-caption font-bold text-danger">
                          {holdProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {sosError && (
                  <p className="mt-3 text-meta font-bold text-danger">{sosError}</p>
                )}
              </div>

              <div className="mx-auto max-w-md rounded-xl bg-sand/60 p-3 text-caption text-ink-muted">
                <span className="font-semibold text-ink">
                  {locale === "km" ? "សម្គាល់៖" : "Note:"}
                </span>{" "}
                {locale === "km"
                  ? "ការចុច SOS នឹងចែករំលែកទីតាំងទៅកាន់ស្ថាប័នពាក់ព័ន្ធ និងផ្ញើសារអាសន្នទៅកាន់ទំនាក់ទំនងទុកចិត្តរបស់អ្នក។"
                  : "SOS shares your location snapshot with responders and alerts all your confirmed trusted contacts."}
              </div>
            </div>
          )}
        </Card>

        {/* 3. EMERGENCY CONTACTS LINK CARD */}
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 flex-none items-center justify-center rounded-xl bg-primary-tint text-primary">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-row font-bold text-ink">
                  {t.emergencyContactsTitle}
                </h3>
                <CountBadge count={activeContacts.length} />
              </div>
              <p className="text-meta text-ink-muted">
                {fmt(t.contactsConfirmedBadge, {
                  confirmed: confirmedCount,
                  total: activeContacts.length,
                })}
              </p>
            </div>
          </div>
          <Link
            href="/me/contacts"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-meta font-bold text-white shadow-card hover:bg-primary-hover"
          >
            <span>{t.manageContacts}</span>
            <ArrowRight size={16} />
          </Link>
        </Card>

        {/* 4. INCIDENT REPORTING & MY REPORTS (Core Feature 4, Step 4) */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card: Report Incident */}
          <Card className="flex flex-col justify-between p-6 transition-all hover:border-primary/40 hover:shadow-card">
            <div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-tint text-primary mb-3">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-title font-bold text-ink">{t.reportIncidentTitle}</h3>
              <p className="mt-1.5 text-meta text-ink-muted leading-relaxed">
                {t.reportIncidentSubtitle}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-line">
              <Link
                href="/emergency/report"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-meta font-bold text-white shadow-card hover:bg-primary-hover transition-colors"
              >
                <span>{locale === "km" ? "រាយការណ៍ហេតុការណ៍ឥឡូវនេះ" : "Report Incident Now"}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>

          {/* Card: My Reports */}
          <Card className="flex flex-col justify-between p-6 transition-all hover:border-primary/40 hover:shadow-card">
            <div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-sand text-ink mb-3">
                <Clock size={24} />
              </div>
              <h3 className="text-title font-bold text-ink">{t.emMyReportsTitle}</h3>
              <p className="mt-1.5 text-meta text-ink-muted leading-relaxed">
                {t.emMyReportsSubtitle}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-line">
              <Link
                href="/emergency/my-reports"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface py-2.5 text-meta font-bold text-ink shadow-card hover:bg-sand transition-colors"
              >
                <span>{locale === "km" ? "មើលរបាយការណ៍ទាំងអស់" : "View My Reports"}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>
        </div>

        {/* 5. EMERGENCY SERVICES DIRECTORY & NEARBY */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card 1: Directory */}
          <Card className="flex flex-col justify-between p-6 transition-all hover:border-primary/40 hover:shadow-card">
            <div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-tint text-primary mb-3">
                <Building2 size={24} />
              </div>
              <h3 className="text-title font-bold text-ink">{t.emergencyDirectoryTitle}</h3>
              <p className="mt-1.5 text-meta text-ink-muted leading-relaxed">
                {t.emergencyDirectorySubtitle}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-line">
              <Link
                href="/emergency/directory"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-meta font-bold text-white shadow-card hover:bg-primary-hover transition-colors"
              >
                <span>{locale === "km" ? "មើលបញ្ជីសេវាទាំងអស់" : "Browse All Services"}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>

          {/* Card 2: Nearby */}
          <Card className="flex flex-col justify-between p-6 transition-all hover:border-danger/40 hover:shadow-card">
            <div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-3">
                <Navigation size={24} />
              </div>
              <h3 className="text-title font-bold text-ink">{t.nearbyServicesPageTitle}</h3>
              <p className="mt-1.5 text-meta text-ink-muted leading-relaxed">
                {t.nearbyServicesPageSubtitle}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-line">
              <Link
                href="/emergency/nearby"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-danger py-2.5 text-meta font-bold text-white shadow-card hover:bg-danger-ink transition-colors"
              >
                <span>{locale === "km" ? "ស្វែងរកតាមចម្ងាយ GPS" : "Find Nearest via GPS"}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel Incident Reason Sheet (For normal reports requiring reason) */}
      {isCancelOpen && (
        <Sheet
          title={t.sosCancelBtn}
          onClose={() => setIsCancelOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {t.sosCancelReasonPrompt}
            </p>
            <TextField
              label={locale === "km" ? "មូលហេតុ" : "Reason"}
              placeholder="e.g. False alarm / Resolved already"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsCancelOpen(false)}>
                {t.close}
              </Button>
              <Button
                variant="danger"
                disabled={!cancelReason.trim() || isCancelling}
                onClick={handleCancelWithReason}
              >
                {isCancelling ? t.submitting : t.sosCancelBtn}
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </PageContainer>
  );
}
