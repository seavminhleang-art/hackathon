"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Building2, Camera, CheckCircle2, Clock, Eye, FileText, MapPin, MessageSquarePlus, Phone, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { IncidentIcon, useIncidentTypes } from "@/features/emergency/meta";
import { api } from "@/lib/api";
import { stripExifAndCompress } from "@/lib/utils/image-utils";
import { PageContainer } from "@/components/layout/AppShell";
import { PageSkeleton, Button, Card, PageHeader, Sheet, TextField } from "@/components/ui";
import type {
  EmIncidentForReporter,
  EmIncidentStatus,
  EmDispatchStatus,
} from "@/types";

function IncidentTrackingContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const { t, tx, locale } = useLocale();
  const EM_INCIDENT_TYPES = useIncidentTypes();
  const { user } = useAuth();

  const [incident, setIncident] = useState<EmIncidentForReporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Owner action: Cancel Report Sheet
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<"MISTAKE" | "RESOLVED" | "OTHER">("MISTAKE");
  const [cancelNote, setCancelNote] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Owner action: Add Details Sheet
  const [isAddDetailsOpen, setIsAddDetailsOpen] = useState(false);
  const [extraText, setExtraText] = useState("");
  const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
  const [isAddingDetails, setIsAddingDetails] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  // Fetch incident on load and poll every 5s

  async function loadIncident() {
    try {
      const data = await api.em.getMyIncident(id);
      setIncident(data);
      setErrorMsg(null);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      if (err?.code === "FORBIDDEN") {
        setErrorMsg(
          locale === "km"
            ? "ការចូលប្រើប្រាស់ត្រូវបានបដិសេធ៖ អ្នកអាចមើលបានតែរបាយការណ៍ដែលបានដាក់ស្នើដោយគណនីរបស់អ្នកប៉ុណ្ណោះ។"
            : "Access denied: you can only view reports submitted by your own account."
        );
      } else {
        setErrorMsg(err?.message || "Failed to load incident");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const first = setTimeout(loadIncident, 0);
    const interval = setInterval(loadIncident, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [id]);

  // Cancel Report (preset reason with optional note)
  const handleCancel = async () => {
    if (!incident) return;
    setIsCancelling(true);
    try {
      const presetText =
        selectedPreset === "MISTAKE"
          ? t.cancelPresetMistake
          : selectedPreset === "RESOLVED"
          ? t.cancelPresetResolved
          : t.cancelPresetOther;
      const finalReason = cancelNote.trim() ? `${presetText}: ${cancelNote.trim()}` : presetText;
      const updated = await api.em.cancelIncident(incident.id, finalReason);
      setIncident(updated);
      setIsCancelOpen(false);
      setCancelNote("");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to cancel incident");
    } finally {
      setIsCancelling(false);
    }
  };

  // Add Details Later (Extra text or photos)
  const handleAddDetails = async () => {
    if (!incident) return;
    if (!extraText.trim() && extraPhotos.length === 0) {
      alert(locale === "km" ? "សូមបញ្ចូលព័ត៌មានបន្ថែម ឬរូបថត" : "Please enter extra text or attach photos");
      return;
    }
    setIsAddingDetails(true);
    try {
      const updated = await api.em.addIncidentDetails(incident.id, {
        text: extraText.trim() || undefined,
        photoUrls: extraPhotos.length > 0 ? extraPhotos : undefined,
      });
      setIncident(updated);
      setIsAddDetailsOpen(false);
      setExtraText("");
      setExtraPhotos([]);
      alert(t.addDetailsSuccess);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to add details");
    } finally {
      setIsAddingDetails(false);
    }
  };

  // Handle Photo Upload for extra details with EXIF stripping
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsProcessingPhotos(true);
    try {
      const results = await Promise.all(
        files.slice(0, 3).map((f) => stripExifAndCompress(f, 1280, 1280, 0.75))
      );
      setExtraPhotos((prev) => [...prev, ...results.map((r) => r.dataUrl)]);
    } catch {
      alert("Failed to process photos");
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  // Dev Simulator Helpers
  const handleSimulateDispatch = async (status: Exclude<EmDispatchStatus, "SENT">) => {
    if (!incident) return;
    const res = await api.em.devSimulateDispatch(incident.id, status, {
      responseInfo: status === "RESPONDING" ? "En route to incident location" : undefined,
    });
    setIncident(res);
  };

  const handleSimulateReject = async () => {
    if (!incident) return;
    const reason = window.prompt("Enter rejection reason for testing:", "Insufficient information provided");
    if (!reason) return;
    const res = await api.em.devSimulateReject(incident.id, reason);
    setIncident(res);
  };

  if (loading) {
    return (
      <PageContainer>
        <PageSkeleton variant="detail" rows={2} />
      </PageContainer>
    );
  }

  if (errorMsg || !incident) {
    return (
      <PageContainer>
        <Card className="mx-auto max-w-lg p-8 text-center space-y-4">
          <AlertTriangle size={44} className="mx-auto text-danger" />
          <h2 className="text-title font-bold text-ink">
            {locale === "km" ? "មិនអាចចូលមើលរបាយការណ៍នេះបានទេ" : "Cannot View Report"}
          </h2>
          <p className="text-meta text-ink-muted">{errorMsg || "Report not found"}</p>
          <div className="pt-2">
            <Link href="/emergency">
              <Button variant="primary">{locale === "km" ? "ត្រឡប់ទៅទំព័រសង្គ្រោះបន្ទាន់" : "Back to Emergency Hub"}</Button>
            </Link>
          </div>
        </Card>
      </PageContainer>
    );
  }

  const isOwner = user?.id === incident.submittedByUserId || user?.id === incident.reporterId;
  const isHelpOnTheWay = api.em.isHelpOnTheWay(incident);
  const typeMeta = EM_INCIDENT_TYPES.find((m) => m.id === incident.type);
  const respondingDispatch = incident.dispatches?.find((d) => d.status === "RESPONDING" && d.responseInfo);
  const etaText = respondingDispatch?.responseInfo;

  // Status Timeline Stages
  const stages: { key: EmIncidentStatus; label: string }[] = [
    { key: "SUBMITTED", label: t.statusSubmitted },
    { key: "RECEIVED", label: t.statusReceived },
    { key: "UNDER_REVIEW", label: t.statusUnderReview },
    { key: "ACKNOWLEDGED", label: t.statusAcknowledged },
    { key: "RESPONDING", label: t.statusResponding },
    { key: "RESOLVED", label: t.statusResolved },
  ];

  const currentStageIndex = stages.findIndex((s) => s.key === incident.status);
  const isTerminal = ["REJECTED", "CANCELLED", "DUPLICATE", "FAILED_RETRYING", "CLOSED_BY_USER", "RESOLVED"].includes(incident.status);

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6 pb-32">
        <PageHeader
          title={`${t.trackingIncidentTitle} · ${incident.code || incident.id}`}
          subtitle={
            locale === "km"
              ? "តាមដានស្ថានភាពជាក់ស្តែងពីស្ថាប័នឆ្លើយតបបន្ទាន់"
              : "Real-time tracking of dispatch and responder responses"
          }
          back="/emergency"
        />

        {/* 1. MAIN INCIDENT HEADER CARD */}
        <Card className="p-6 border-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <IncidentIcon type={incident.type} className="text-danger" />
                <h2 className="text-title font-black text-ink">
                  {typeMeta ? tx(typeMeta.label) : incident.type}
                </h2>
              </div>
              <p className="font-mono text-meta font-bold text-primary-ink mt-0.5">
                {incident.code}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span
                className={`rounded-full px-3.5 py-1 text-meta font-bold text-white ${
                  incident.status === "RESOLVED" || incident.status === "CLOSED_BY_USER"
                    ? "bg-fixed"
                    : incident.status === "RESPONDING"
                    ? "bg-fixed animate-pulse"
                    : incident.status === "REJECTED" || incident.status === "CANCELLED"
                    ? "bg-night"
                    : "bg-danger"
                }`}
              >
                {t[`status${incident.status.charAt(0) + incident.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as keyof typeof t] || incident.status}
              </span>
              {incident.closedByUser && (
                <span className="text-caption font-bold text-fixed-ink bg-fixed-tint px-2 py-0.5 rounded-full">
                  {t.closedByUserBadge}
                </span>
              )}
              {incident.suggestedSeverity && (
                <span className="text-caption text-ink-muted">
                  {locale === "km" ? "កម្រិតស្នើ៖ " : "Suggested: "}
                  <strong className="text-ink">{incident.suggestedSeverity}</strong>{" "}
                  <span className="italic">({t.waitingForOrgSeverity})</span>
                </span>
              )}
            </div>
          </div>

          {/* 2. GLANCEABLE HERO STATUS BANNER (Strictly Honest & Real-Time) */}
          <div className="mt-4">
            {incident.status === "FAILED_RETRYING" ? (
              <div className="rounded-2xl border-2 border-danger bg-danger-tint p-4 text-danger flex items-start gap-3 shadow-card">
                <AlertTriangle size={24} className="flex-none animate-bounce mt-0.5" />
                <div>
                  <h4 className="font-black text-row">{t.statusBannerNotSentOffline}</h4>
                  <p className="text-body font-medium mt-1">
                    {locale === "km"
                      ? "របាយការណ៍មិនទាន់បានទៅដល់ស្ថាប័នឆ្លើយតបនៅឡើយទេដោយសារគ្មានសេវាអ៊ីនធឺណិត។ សូមទូរស័ព្ទទៅកាន់ ១១៧/១១៨/១១៩ ភ្លាមៗ!"
                      : "Report is stored locally on device and could not be transmitted. Please call 117/118/119 immediately!"}
                  </p>
                </div>
              </div>
            ) : incident.allDispatchesDeclined || incident.dispatches?.some((d) => d.status === "CANNOT_CONTINUE") ? (
              <div className="rounded-2xl border-2 border-danger bg-danger-tint p-4 text-danger space-y-3 shadow-card">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="flex-none animate-bounce mt-0.5" />
                  <div>
                    <h4 className="font-black text-row">{t.statusBannerAllDeclined}</h4>
                    <p className="text-body font-medium mt-1">
                      {t.allDeclinedCitizenBanner}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-danger/20">
                  <span className="text-caption font-bold text-ink mr-1">
                    {t.emergencyHotlinesAlwaysAvailable}
                  </span>
                  <a
                    href="tel:117"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-caption font-bold text-white hover:bg-danger-hover"
                  >
                    <Phone size={13} />
                    <span>117 ({locale === "km" ? "នគរបាល" : "Police"})</span>
                  </a>
                  <a
                    href="tel:118"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-caption font-bold text-white hover:bg-danger-hover"
                  >
                    <Phone size={13} />
                    <span>118 ({locale === "km" ? "ពន្លត់អគ្គិភ័យ" : "Fire"})</span>
                  </a>
                  <a
                    href="tel:119"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-caption font-bold text-white hover:bg-danger-hover"
                  >
                    <Phone size={13} />
                    <span>119 ({locale === "km" ? "សង្គ្រោះបន្ទាន់" : "Ambulance"})</span>
                  </a>
                </div>
              </div>
            ) : isHelpOnTheWay ? (
              <div className="rounded-2xl border-2 border-fixed bg-fixed-tint p-4 text-fixed-ink flex items-start gap-3 shadow-card ring-2 ring-fixed">
                <CheckCircle2 size={26} className="text-fixed flex-none mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-black text-row text-fixed-ink ">
                    {t.statusBannerHelpOnTheWay}
                  </h4>
                  {etaText ? (
                    <p className="text-body font-bold mt-1 text-fixed-ink ">
                      {t.statusBannerResponderEstimate}: <span className="font-mono underline">“{etaText}”</span>
                    </p>
                  ) : (
                    <p className="text-caption opacity-95 mt-1">
                      {locale === "km"
                        ? "ស្ថាប័នសង្គ្រោះបន្ទាន់បានឆ្លើយតប និងកំពុងធ្វើដំណើរទៅកាន់ទីតាំងរបស់អ្នក។"
                        : "Emergency units are confirmed en route to your location."}
                    </p>
                  )}
                </div>
              </div>
            ) : incident.status === "CLOSED_BY_USER" ? (
              <div className="rounded-2xl border border-fixed bg-fixed-tint p-4 text-fixed-ink flex items-start gap-3">
                <CheckCircle2 size={24} className="text-fixed flex-none mt-0.5" />
                <div>
                  <h4 className="font-black text-row">{t.statusClosedByUser}</h4>
                  <p className="text-body mt-1">
                    {t.statusBannerClosedByUser}
                  </p>
                </div>
              </div>
            ) : incident.status === "REJECTED" ? (
              <div className="rounded-2xl border-2 border-danger/60 bg-danger-tint p-4 text-danger flex items-start gap-3">
                <XCircle size={24} className="flex-none mt-0.5" />
                <div>
                  <h4 className="font-black text-row">{t.statusRejected}</h4>
                  <p className="text-body font-semibold mt-0.5">
                    {t.rejectedReasonLabel}: {incident.rejectReason || "No details provided"}
                  </p>
                </div>
              </div>
            ) : incident.status === "CANCELLED" ? (
              <div className="rounded-2xl border border-line bg-sand p-4 text-ink-muted flex items-start gap-3">
                <XCircle size={24} className="flex-none mt-0.5" />
                <div>
                  <h4 className="font-bold text-row text-ink">{t.statusCancelled}</h4>
                  <p className="text-caption mt-0.5">
                    {locale === "km" ? "មូលហេតុបោះបង់៖ " : "Cancel reason: "}
                    {incident.cancelReason || "Cancelled by user"}
                  </p>
                </div>
              </div>
            ) : incident.status === "RESOLVED" ? (
              <div className="rounded-2xl border border-fixed bg-fixed-tint p-4 text-fixed-ink flex items-start gap-3">
                <CheckCircle2 size={24} className="text-fixed flex-none mt-0.5" />
                <div>
                  <h4 className="font-black text-row">{t.statusResolved}</h4>
                  <p className="text-caption mt-0.5">
                    {locale === "km" ? "ហេតុការណ៍ត្រូវបានដោះស្រាយរួចរាល់ជាស្ថាពរ។" : "Incident operations successfully resolved."}
                  </p>
                </div>
              </div>
            ) : incident.status === "ACKNOWLEDGED" ? (
              <div className="rounded-2xl border-2 border-fixed bg-fixed-tint p-4 text-fixed-ink flex items-start gap-3 shadow-card">
                <ShieldCheck size={24} className="text-fixed flex-none mt-0.5" />
                <div>
                  <h4 className="font-black text-row text-fixed-ink ">
                    {t.statusAcknowledged}
                  </h4>
                  <p className="text-body mt-1">
                    {t.statusBannerAcknowledged}
                  </p>
                </div>
              </div>
            ) : incident.status === "UNDER_REVIEW" ? (
              <div className="rounded-2xl border-2 border-primary bg-primary-tint p-4 text-primary-ink flex items-start gap-3 shadow-card">
                <Clock size={24} className="text-primary-ink flex-none mt-0.5" />
                <div>
                  <h4 className="font-black text-row text-primary-ink ">
                    {t.statusUnderReview}
                  </h4>
                  <p className="text-body mt-1">
                    {t.statusBannerUnderReview}
                  </p>
                </div>
              </div>
            ) : incident.status === "RECEIVED" ? (
              <div className="rounded-2xl border-2 border-primary bg-primary-tint p-4 text-primary-ink flex items-start gap-3 shadow-card">
                <Eye size={24} className="text-primary-ink flex-none mt-0.5" />
                <div>
                  <h4 className="font-black text-row text-primary-ink ">
                    {t.statusReceived}
                  </h4>
                  <p className="text-body mt-1">
                    {t.statusBannerReceived}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-reported/30 bg-reported-tint p-4 text-reported-ink flex items-start gap-3 shadow-card">
                <Clock size={24} className="text-reported flex-none mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-black text-row text-reported-ink ">
                    {t.statusSubmitted}
                  </h4>
                  <p className="text-body mt-1">
                    {t.statusBannerSubmitted}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* POSSIBLE DUPLICATE BANNER */}
          {incident.isPossibleDuplicate && (
            <div className="mt-3 rounded-xl border border-reported/30 bg-reported-tint p-3 text-caption text-reported-ink flex items-start gap-2">
              <AlertTriangle size={16} className="text-reported flex-none mt-0.5" />
              <div>
                <p className="font-bold">{t.possibleDuplicateBanner}</p>
                {incident.possibleDuplicateOf && (
                  <p className="opacity-90 mt-0.5 font-mono">
                    Duplicate Match: {incident.possibleDuplicateOf}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3. VISUAL STATUS TIMELINE */}
          {!isTerminal && (
            <div className="mt-6 pt-4 border-t border-line">
              <h4 className="text-meta font-bold text-ink mb-3">{t.statusTimeline}</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                {stages.map((stage, idx) => {
                  const isPassed = currentStageIndex >= idx;
                  const isCurrent = currentStageIndex === idx;
                  return (
                    <div
                      key={stage.key}
                      className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center border transition-all ${
                        isCurrent
                          ? "border-primary bg-primary text-white font-bold ring-2 ring-primary/30"
                          : isPassed
                          ? "border-fixed/30 bg-fixed-tint text-fixed-ink "
                          : "border-line bg-surface text-ink-muted opacity-60"
                      }`}
                    >
                      <span className="text-caption leading-tight">{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. DISPATCHED ORGANIZATIONS */}
          <div className="mt-6 pt-4 border-t border-line">
            <h4 className="text-meta font-bold text-ink mb-2.5 flex items-center gap-1.5">
              <Building2 size={16} className="text-primary-ink" />
              <span>{t.dispatchesLabel}</span>
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {incident.dispatches.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface p-3"
                >
                  <div>
                    <span className="font-semibold text-meta block">{tx(d.organizationName)}</span>
                    <span className="text-caption text-ink-muted">{d.organizationType}</span>
                    {d.responseInfo && (
                      <span className="text-caption block text-primary-ink font-medium mt-0.5">
                        {d.responseInfo}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-caption font-bold px-2 py-0.5 rounded ${
                      d.status === "RESPONDING"
                        ? "bg-fixed-tint text-fixed-ink border border-fixed/30"
                        : d.status === "DECLINED"
                        ? "bg-sand text-ink"
                        : d.status === "CANNOT_CONTINUE"
                        ? "bg-reported-tint text-reported-ink border border-reported/30"
                        : "bg-sand text-ink"
                    }`}
                  >
                    {d.status === "CANNOT_CONTINUE"
                      ? (locale === "km" ? "មិនអាចបន្តបាន" : "Cannot Continue")
                      : d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. LOCATION DETAILS */}
          <div className="mt-6 pt-4 border-t border-line space-y-2">
            <h4 className="text-meta font-bold text-ink flex items-center gap-1.5">
              <MapPin size={16} className={incident.locationConfirmed ? "text-fixed" : "text-reported"} />
              <span>{locale === "km" ? "ទីតាំងដែលបានរាយការណ៍" : "Reported Location"}</span>
            </h4>
            {incident.locationConfirmed ? (
              <p className="text-caption text-ink">
                {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}{" "}
                {incident.accuracyM && `(±${incident.accuracyM}m)`}
                {incident.addressHint && ` · ${incident.addressHint}`}
              </p>
            ) : (
              <div className="rounded-lg border border-reported/30 bg-reported-tint p-2.5 text-caption text-reported-ink flex items-center gap-2">
                <AlertTriangle size={15} className="text-reported flex-none" />
                <span>
                  {t.locationUnconfirmedFlagged}: {incident.landmark || incident.addressHint || "No landmark specified"}
                </span>
              </div>
            )}
          </div>

          {/* 6. PHOTOS & SENSITIVE MEDIA */}
          {incident.photoUrls && incident.photoUrls.length > 0 && (
            <div className="mt-6 pt-4 border-t border-line space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-meta font-bold text-ink flex items-center gap-1.5">
                  <Camera size={16} className="text-primary-ink" />
                  <span>{locale === "km" ? "រូបថតហេតុការណ៍" : "Incident Photos"}</span>
                </h4>
                <span className="text-caption font-semibold text-reported-ink bg-reported-tint px-2 py-0.5 rounded">
                  Sensitive / Private
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {incident.photoUrls.map((url, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-line bg-sand aspect-square">
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. ADDITIONAL DETAILS ADDED LATER */}
          {incident.additionalDetails && incident.additionalDetails.length > 0 && (
            <div className="mt-6 pt-4 border-t border-line space-y-2">
              <h4 className="text-meta font-bold text-ink flex items-center gap-1.5">
                <FileText size={16} className="text-primary-ink" />
                <span>{locale === "km" ? "ព័ត៌មានបន្ថែមក្រោយមក" : "Updates Added Later"}</span>
              </h4>
              <div className="space-y-2">
                {incident.additionalDetails.map((det, idx) => (
                  <div key={idx} className="rounded-xl border border-line bg-surface p-3 text-caption text-ink space-y-1">
                    <div className="flex items-center justify-between text-ink-muted text-caption">
                      <span>{det.addedAt.slice(11, 16)}</span>
                      <span>Update #{idx + 1}</span>
                    </div>
                    {det.text && <p className="font-medium">{det.text}</p>}
                    {det.photoUrls && det.photoUrls.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {det.photoUrls.map((p, pIdx) => (
                          <img key={pIdx} src={p} alt="Extra" className="size-14 rounded-lg object-cover border" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. OWNER ACTIONS: Cancel Report & Add Details Later (Collapsed by default for uncluttered tracking) */}
          {isOwner && !["RESOLVED", "REJECTED", "CANCELLED", "DUPLICATE"].includes(incident.status) && (
            <details className="mt-6 pt-4 border-t border-line group">
              <summary className="text-caption font-semibold text-ink-muted cursor-pointer hover:text-ink flex items-center justify-between select-none py-1">
                <span>{t.secondaryActionsTitle}</span>
                <span className="text-caption text-ink-muted transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCancelOpen(true)}
                  className="text-danger border-danger/40 hover:bg-danger/10"
                >
                  <XCircle size={15} className="mr-1.5" />
                  <span>{t.cancelCountdownBtn}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddDetailsOpen(true)}
                  className="gap-1.5"
                >
                  <MessageSquarePlus size={15} />
                  <span>{t.addDetailsBtn}</span>
                </Button>
              </div>
            </details>
          )}

          {/* 9. DEV-ONLY RESPONSE SIMULATOR (Test statuses before Step 5) */}
          <div className="mt-8 rounded-xl border border-dashed border-reported bg-reported-tint p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-caption font-bold text-reported-ink ">
                {t.devSimulatorTitle}
              </span>
              <span className="text-caption font-mono font-bold bg-reported-tint text-reported-ink px-1.5 py-0.5 rounded">
                DEV ONLY
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="text-caption"
                onClick={() => handleSimulateDispatch("RECEIVED")}
              >
                {t.simulateReceived}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-caption"
                onClick={() => handleSimulateDispatch("ACKNOWLEDGED")}
              >
                {t.simulateAcknowledged}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-caption text-fixed-ink border-fixed/30"
                onClick={() => handleSimulateDispatch("RESPONDING")}
              >
                {t.simulateResponding}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-caption"
                onClick={() => handleSimulateDispatch("RESOLVED")}
              >
                {t.simulateResolved}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-caption text-danger border-danger/40"
                onClick={handleSimulateReject}
              >
                {t.simulateRejectAdmin}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* CANCEL REPORT MODAL (Preset reasons with optional note) */}
      {isCancelOpen && (
        <Sheet
          title={t.cancelCountdownBtn}
          onClose={() => setIsCancelOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {locale === "km"
                ? "សូមជ្រើសរើសមូលហេតុនៃការបោះបង់របាយការណ៍នេះ៖"
                : "Select a reason for cancelling this report:"}
            </p>
            <div className="space-y-2">
              {[
                { id: "MISTAKE" as const, label: t.cancelPresetMistake },
                { id: "RESOLVED" as const, label: t.cancelPresetResolved },
                { id: "OTHER" as const, label: t.cancelPresetOther },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedPreset === opt.id
                      ? "border-primary bg-primary/10 font-bold text-ink"
                      : "border-line bg-surface hover:bg-sand text-ink-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelPreset"
                    checked={selectedPreset === opt.id}
                    onChange={() => setSelectedPreset(opt.id)}
                    className="accent-primary"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <TextField
              label={t.cancelNoteOptional}
              placeholder={locale === "km" ? "ឧ. អ្នកជិតខាងបានជួយពន្លត់រួចរាល់..." : "e.g. Neighbor already helped extinguish it..."}
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsCancelOpen(false)}>
                {t.close}
              </Button>
              <Button
                variant="danger"
                disabled={isCancelling}
                onClick={handleCancel}
              >
                {isCancelling ? t.submitting : t.cancelCountdownBtn}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* ADD DETAILS LATER MODAL */}
      {isAddDetailsOpen && (
        <Sheet
          title={t.addDetailsTitle}
          onClose={() => setIsAddDetailsOpen(false)}
        >
          <div className="space-y-4">
            <TextField
              label={locale === "km" ? "ព័ត៌មានបន្ថែម" : "Additional Information"}
              placeholder={t.addDetailsPlaceholder}
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
            />

            <div>
              <label className="text-meta font-bold text-ink block mb-1">
                {locale === "km" ? "បន្ថែមរូបថត (អតិបរមា ៣)" : "Add Photos (Max 3)"}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                disabled={isProcessingPhotos}
                className="block w-full text-caption text-ink file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-caption file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover"
              />
              {extraPhotos.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {extraPhotos.map((p, i) => (
                    <img key={i} src={p} alt="Extra preview" className="size-14 rounded-lg object-cover border" />
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsAddDetailsOpen(false)}>
                {t.close}
              </Button>
              <Button
                variant="primary"
                disabled={(!extraText.trim() && extraPhotos.length === 0) || isAddingDetails}
                onClick={handleAddDetails}
              >
                {isAddingDetails ? t.submitting : t.addDetailsBtn}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* 10. STICKY 117/118/119 HOTLINE BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md px-4 py-2.5 shadow-raised">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Phone size={15} className="text-danger flex-none" />
            <span className="text-caption font-bold text-ink hidden sm:inline">
              {t.emergencyHotlinesAlwaysAvailable}
            </span>
            <span className="text-caption font-bold text-ink sm:hidden">
              {t.hotlines}:
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="tel:117"
              className="inline-flex items-center gap-1 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white px-2.5 py-1 text-caption font-bold transition"
            >
              <span>117 ({locale === "km" ? "នគរបាល" : "Police"})</span>
            </a>
            <a
              href="tel:118"
              className="inline-flex items-center gap-1 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white px-2.5 py-1 text-caption font-bold transition"
            >
              <span>118 ({locale === "km" ? "ពន្លត់អគ្គិភ័យ" : "Fire"})</span>
            </a>
            <a
              href="tel:119"
              className="inline-flex items-center gap-1 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white px-2.5 py-1 text-caption font-bold transition"
            >
              <span>119 ({locale === "km" ? "សង្គ្រោះបន្ទាន់" : "Ambulance"})</span>
            </a>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default function IncidentTrackingPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageSkeleton variant="detail" rows={2} />
        </PageContainer>
      }
    >
      <IncidentTrackingContent />
    </Suspense>
  );
}
