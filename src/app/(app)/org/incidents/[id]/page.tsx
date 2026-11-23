"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { api } from "@/lib/api";
import { currentUser } from "@/lib/api/mock-db";
import { EmIncidentForOrg, EmSeverity } from "@/types";
import { PageContainer } from "@/components/layout/AppShell";
import { Card, Button, PageHeader, Sheet, Badge, TextField } from "@/components/ui";
import { ShieldAlert, Clock, MapPin, AlertTriangle, CheckCircle2, XCircle, Phone, Send, Navigation, FileText, User, ShieldCheck } from "lucide-react";

function OrgIncidentContent() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { locale, t, tx } = useLocale();

  const [user, setUser] = useState(currentUser());
  const [incident, setIncident] = useState<EmIncidentForOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals for Dispatch Transitions
  const [isRespondingModalOpen, setIsRespondingModalOpen] = useState(false);
  const [responseInfo, setResponseInfo] = useState("");

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [confirmResolutionChecked, setConfirmResolutionChecked] = useState(false);

  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [isCannotContinueModalOpen, setIsCannotContinueModalOpen] = useState(false);
  const [cannotContinueReason, setCannotContinueReason] = useState("");

  const [isSeverityModalOpen, setIsSeverityModalOpen] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<EmSeverity>("MEDIUM");

  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // 10-second Undo State for Responding
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (!showUndoToast || undoSecondsLeft === null) return;
    const timer = setTimeout(() => {
      if (undoSecondsLeft <= 0) {
        setShowUndoToast(false);
        setUndoSecondsLeft(null);
        return;
      }
      setUndoSecondsLeft((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, undoSecondsLeft <= 0 ? 0 : 1000);
    return () => clearTimeout(timer);
  }, [showUndoToast, undoSecondsLeft]);


  async function loadIncident() {
    try {
      // Opening the incident marks SENT -> RECEIVED automatically once
      const data = await api.em.getOrgIncident(id);
      setIncident(data);
      setSelectedSeverity(data.severity);
      setErrorMsg(null);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      if (err?.code === "FORBIDDEN") {
        setErrorMsg(
          locale === "km"
            ? "ការចូលប្រើប្រាស់ត្រូវបានបដិសេធ៖ របាយការណ៍នេះមិនត្រូវបានចាត់ចែងមកកាន់អង្គភាពរបស់អ្នកឡើយ។"
            : "Access denied: this dispatch is not assigned to your organization."
        );
      } else {
        setErrorMsg(err?.message || "Failed to load incident");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const first = setTimeout(() => {
      setUser(currentUser());
      loadIncident();
    }, 0);
    const interval = setInterval(loadIncident, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [id]);

  const isAuthorized = user && (user.role === "ORGANIZATION" || user.role === "ADMIN");

  if (!isAuthorized) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-xl py-12 text-center space-y-4">
          <ShieldAlert size={56} className="mx-auto text-danger" />
          <h1 className="text-title font-black text-ink">
            {locale === "km" ? "ការចូលប្រើប្រាស់ត្រូវបានបដិសេធ" : "Access Denied"}
          </h1>
          <p className="text-body text-ink-muted">
            {locale === "km"
              ? "ទំព័រនេះសម្រាប់តែមន្ត្រី ឬបុគ្គលិកអង្គភាពឆ្លើយតបសង្គ្រោះបន្ទាន់ប៉ុណ្ណោះ។"
              : "This console is strictly for emergency response organization personnel."}
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="primary">
                <span>{locale === "km" ? "ចូលគណនីមន្ត្រី" : "Sign In as Organization Staff"}</span>
              </Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 text-center font-bold text-ink-muted">
          {t.submitting}
        </div>
      </PageContainer>
    );
  }

  if (errorMsg || !incident) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-xl py-12 text-center space-y-4">
          <AlertTriangle size={48} className="mx-auto text-danger" />
          <h2 className="text-title font-black text-ink">
            {locale === "km" ? "មិនអាចបើកព័ត៌មានបានឡើយ" : "Cannot Access Incident"}
          </h2>
          <p className="text-body text-ink-muted">{errorMsg || "Incident not found"}</p>
          <div className="pt-2">
            <Link href="/org/inbox">
              <Button variant="secondary">
                <span>{locale === "km" ? "ត្រឡប់ទៅប្រអប់ទទួល" : "Back to Org Inbox"}</span>
              </Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Handle Dispatch Transitions
  const handleAcknowledge = async () => {
    setIsActionSubmitting(true);
    try {
      const updated = await api.em.updateDispatch(incident.id, "ACKNOWLEDGED");
      setIncident(updated);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to acknowledge dispatch");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleMarkResponding = async () => {
    setIsActionSubmitting(true);
    try {
      const updated = await api.em.updateDispatch(incident.id, "RESPONDING", {
        responseInfo: responseInfo.trim() || undefined,
      });
      setIncident(updated);
      setIsRespondingModalOpen(false);
      setResponseInfo("");
      setShowUndoToast(true);
      setUndoSecondsLeft(10);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to mark responding");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleUndoResponding = async () => {
    setIsUndoing(true);
    try {
      const updated = await api.em.undoResponding(incident.id);
      setIncident(updated);
      setShowUndoToast(false);
      setUndoSecondsLeft(null);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to undo responding status");
    } finally {
      setIsUndoing(false);
    }
  };

  const handleResolve = async () => {
    setIsActionSubmitting(true);
    try {
      const updated = await api.em.updateDispatch(incident.id, "RESOLVED", {
        note: resolutionNote.trim() || undefined,
      });
      setIncident(updated);
      setIsResolveModalOpen(false);
      setResolutionNote("");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to resolve dispatch");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      alert(locale === "km" ? "សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ" : "Please provide a reason for declining");
      return;
    }
    setIsActionSubmitting(true);
    try {
      const updated = await api.em.updateDispatch(incident.id, "DECLINED", {
        note: declineReason.trim(),
      });
      setIncident(updated);
      setIsDeclineModalOpen(false);
      setDeclineReason("");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to decline dispatch");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleCannotContinue = async () => {
    if (!cannotContinueReason.trim()) {
      alert(locale === "km" ? "សូមបញ្ជាក់មូលហេតុដែលមិនអាចបន្ត" : "Please enter a reason why responders cannot continue");
      return;
    }
    setIsActionSubmitting(true);
    try {
      const updated = await api.em.updateDispatch(incident.id, "CANNOT_CONTINUE", {
        note: cannotContinueReason.trim(),
      });
      setIncident(updated);
      setIsCannotContinueModalOpen(false);
      setCannotContinueReason("");
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to update status to cannot continue");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleSaveSeverity = async () => {
    setIsActionSubmitting(true);
    try {
      const updated = await api.em.setAuthoritativeSeverity(incident.id, selectedSeverity);
      setIncident(updated);
      setIsSeverityModalOpen(false);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      alert(err?.message || "Failed to update severity");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const dp = incident.dispatch;
  const isTerminal = dp.status === "RESOLVED" || dp.status === "DECLINED" || dp.status === "CANNOT_CONTINUE";

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-6 pb-36">
        <PageHeader
          title={`${t.orgConsoleTitle} - ${incident.code || incident.id}`}
          subtitle={
            locale === "km"
              ? `ស្ថានភាពការបញ្ជូន៖ ${dp.status} | ស្ថានភាពរួម៖ ${incident.status}`
              : `Dispatch Status: ${dp.status} | Overall Incident: ${incident.status}`
          }
          back="/org/inbox"
        />

        {/* 1. URGENT NOTICES */}
        {incident.standDownWarning && (
          <div className="rounded-2xl border-2 border-danger bg-danger-tint p-4 text-danger flex items-start gap-3 shadow-card">
            <AlertTriangle size={24} className="flex-none animate-bounce mt-0.5" />
            <div>
              <h4 className="text-row font-black">
                {locale === "km" ? "ការព្រមានអំពីការបញ្ឈប់បេសកកម្ម" : "Stand Down Verification Notice"}
              </h4>
              <p className="mt-1 text-body font-medium">
                {t.standDownAlert}
              </p>
              <p className="mt-2 text-caption opacity-90">
                {locale === "km"
                  ? "ក្រុមសង្គ្រោះរបស់អ្នកស្ថិតក្នុងស្ថានភាព 'កំពុងឆ្លើយតប'។ កុំបោះបង់បេសកកម្មដោយស្វ័យប្រវត្តិឡើយ រហូតទាល់តែបានទាក់ទងផ្ទៀងផ្ទាត់ជាមួយអ្នករាយការណ៍ ឬសមត្ថកិច្ចនៅកន្លែងកើតហេតុ។"
                  : "Your response unit is currently marked RESPONDING. Do not automatically stand down without contacting the caller or confirming on scene."}
              </p>
            </div>
          </div>
        )}

        {incident.status === "CLOSED_BY_USER" && (
          <div className="rounded-2xl border-2 border-fixed bg-fixed-tint p-4 text-fixed-ink flex items-start gap-3 shadow-card">
            <CheckCircle2 size={24} className="flex-none text-fixed mt-0.5" />
            <div>
              <h4 className="text-row font-black">
                {locale === "km" ? "ពលរដ្ឋបានបញ្ជាក់ថាសុវត្ថិភាព" : "Citizen Reported Safe (Closed by User)"}
              </h4>
              <p className="mt-1 text-body font-medium">
                {locale === "km"
                  ? "ពលរដ្ឋបានបិទ SOS ដោយបញ្ជាក់ថាខ្លួនមានសុវត្ថិភាពហើយ។ អង្គភាពរបស់អ្នកនៅតែត្រូវផ្ទៀងផ្ទាត់ និងបញ្ចប់ប្រតិបត្តិការ ជាផ្លូវការ។"
                  : "The citizen reported they are safe and closed SOS from their device. Please verify scene safety and resolve your organization's dispatch."}
              </p>
            </div>
          </div>
        )}

        {incident.isUnacknowledgedStale && (
          <div className="rounded-2xl border border-reported bg-reported-tint p-3.5 text-reported-ink flex items-center gap-3">
            <Clock size={20} className="flex-none text-reported animate-pulse" />
            <span className="text-body font-bold">{t.unacknowledgedWarning}</span>
          </div>
        )}

        {/* 2. DISPATCH ACTIONS & STATUS TRACKER */}
        <Card className="p-6 space-y-5 shadow-card border-2 border-primary/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <span className="text-caption font-bold text-ink-muted uppercase tracking-wider block">
                {locale === "km" ? "ស្ថានភាពការបញ្ជូនរបស់អង្គភាពអ្នក" : "Your Organization Dispatch Status"}
              </span>
              <div className="mt-1 flex items-center gap-2.5">
                <Badge
                  variant={
                    dp.status === "RESPONDING"
                      ? "success"
                      : dp.status === "ACKNOWLEDGED"
                      ? "info"
                      : dp.status === "RECEIVED"
                      ? "default"
                      : dp.status === "DECLINED"
                      ? "danger"
                      : dp.status === "CANNOT_CONTINUE"
                      ? "warning"
                      : "secondary"
                  }
                  className="text-row px-3 py-1 font-black"
                >
                  {dp.status === "CANNOT_CONTINUE"
                    ? (locale === "km" ? "មិនអាចបន្តបាន" : "CANNOT CONTINUE")
                    : dp.status}
                </Badge>
                {dp.responseInfo && (
                  <span className="text-meta font-bold text-fixed ">
                    “{dp.responseInfo}”
                  </span>
                )}
                {dp.status === "CANNOT_CONTINUE" && dp.note && (
                  <span className="text-caption font-semibold text-reported-ink ">
                    ({dp.note})
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {!isTerminal && (
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. ACKNOWLEDGE */}
                {dp.status === "RECEIVED" && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isActionSubmitting}
                    onClick={handleAcknowledge}
                    className="font-bold gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    <span>{t.btnAcknowledge}</span>
                  </Button>
                )}

                {/* 2. RESPONDING */}
                {(dp.status === "RECEIVED" || dp.status === "ACKNOWLEDGED") && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isActionSubmitting}
                    onClick={() => setIsRespondingModalOpen(true)}
                    className="font-bold gap-1.5 bg-fixed hover:bg-fixed"
                  >
                    <Send size={16} />
                    <span>{t.btnResponding}</span>
                  </Button>
                )}

                {/* 3. RESOLVE */}
                {(dp.status === "ACKNOWLEDGED" || dp.status === "RESPONDING") && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isActionSubmitting}
                    onClick={() => setIsResolveModalOpen(true)}
                    className="font-bold gap-1.5 border-fixed text-fixed-ink "
                  >
                    <CheckCircle2 size={16} />
                    <span>{t.btnResolveDispatch}</span>
                  </Button>
                )}

                {/* 4. CANNOT CONTINUE (Allowed when RESPONDING, reason required) */}
                {dp.status === "RESPONDING" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isActionSubmitting}
                    onClick={() => setIsCannotContinueModalOpen(true)}
                    className="font-bold gap-1.5 text-reported-ink border-reported hover:bg-reported "
                  >
                    <AlertTriangle size={16} />
                    <span>{t.btnCannotContinue || (locale === "km" ? "មិនអាចបន្តបាន" : "Cannot Continue")}</span>
                  </Button>
                )}

                {/* 5. DECLINE (Not allowed when RESPONDING) */}
                {dp.status !== "RESPONDING" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isActionSubmitting}
                    onClick={() => setIsDeclineModalOpen(true)}
                    className="font-bold gap-1.5 text-danger border-danger/40 hover:bg-danger/10"
                  >
                    <XCircle size={16} />
                    <span>{t.btnDeclineDispatch}</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Authoritative Severity Management */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-body font-bold text-ink">
                {t.setSeverityTitle}:
              </span>
              <Badge
                variant={
                  incident.severity === "CRITICAL"
                    ? "danger"
                    : incident.severity === "HIGH"
                    ? "warning"
                    : "default"
                }
                className="text-meta font-black"
              >
                {incident.severity}
              </Badge>
              {incident.suggestedSeverity && (
                <span className="text-caption text-ink-muted">
                  ({t.suggestedSeverityLabel}: {incident.suggestedSeverity})
                </span>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSeverityModalOpen(true)}
              className="font-bold text-caption"
            >
              <span>{locale === "km" ? "ផ្លាស់ប្តូរកម្រិតធ្ងន់ធ្ងរ" : "Update Severity"}</span>
            </Button>
          </div>
        </Card>

        {/* 3. CALLER & REPORTER CONTACT CARD (Strictly Guarded) */}
        <Card className="p-6 space-y-4">
          <h3 className="text-row font-bold text-ink flex items-center gap-2">
            <User size={18} className="text-primary" />
            <span>{t.callerPhoneAllowed}</span>
          </h3>

          {incident.reporterContact ? (
            <div className="rounded-xl border border-fixed/30 bg-fixed-tint p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-fixed-ink text-body">
                  {incident.reporterContact.fullName}
                </p>
                <p className="font-mono text-fixed-ink font-black text-row mt-0.5">
                  {incident.reporterContact.phone}
                </p>
                <p className="text-caption text-fixed-ink mt-1">
                  {locale === "km" ? "អ្នករាយការណ៍បានយល់ព្រមឱ្យទាក់ទងមកវិញ" : "Reporter granted permission to call back"}
                </p>
              </div>

              <a
                href={`tel:${incident.reporterContact.phone}`}
                className="inline-flex items-center gap-2 rounded-xl bg-fixed px-5 py-2.5 text-meta font-bold text-white shadow-card hover:bg-fixed transition"
              >
                <Phone size={16} />
                <span>{t.callReporterBtn}</span>
              </a>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-sand p-4 text-ink-muted flex items-start gap-3">
              <ShieldCheck size={20} className="flex-none text-ink-muted mt-0.5" />
              <div>
                <p className="text-body font-bold text-ink">
                  {locale === "km" ? "ព័ត៌មានទំនាក់ទំនងត្រូវបានលាក់" : "Contact Information Hidden"}
                </p>
                <p className="text-caption mt-0.5">
                  {t.callerPhoneHiddenNotice}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* 4. INCIDENT DETAILS & LOCATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Details Card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-row font-bold text-ink flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <span>{locale === "km" ? "ព័ត៌មានហេតុការណ៍" : "Incident Overview"}</span>
            </h3>

            <div className="space-y-2 text-body">
              <div>
                <span className="text-caption text-ink-muted block font-semibold">{t.incidentDescriptionLabel}:</span>
                <p className="font-medium text-ink mt-0.5">{incident.description}</p>
              </div>

              {incident.numInjured && (
                <div>
                  <span className="text-caption text-ink-muted block font-semibold">{t.numInjuredLabel}:</span>
                  <p className="font-bold text-danger mt-0.5">{incident.numInjured}</p>
                </div>
              )}

              <div>
                <span className="text-caption text-ink-muted block font-semibold">{t.occurredAtLabel}:</span>
                <p className="text-caption text-ink font-medium mt-0.5">
                  {new Date(incident.occurredAt).toLocaleString(locale === "km" ? "km-KH" : "en-US")}
                </p>
              </div>
            </div>
          </Card>

          {/* Location Card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-row font-bold text-ink flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span>{locale === "km" ? "ទីតាំងកើតហេតុ" : "Location"}</span>
            </h3>

            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-sand p-3 space-y-1">
                {incident.landmark && (
                  <p className="font-bold text-ink text-body">
                    {incident.landmark}
                  </p>
                )}
                <p className="text-caption text-ink-muted">
                  {incident.cityId}, {incident.provinceId}
                </p>
                {incident.location && (
                  <p className="font-mono text-caption text-ink-muted">
                    {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
                    {incident.accuracyM ? ` (±${incident.accuracyM}m)` : ""}
                  </p>
                )}
                {!incident.locationConfirmed && (
                  <span className="inline-block mt-1 rounded bg-reported-tint text-reported-ink px-2 py-0.5 text-caption font-bold">
                    {locale === "km" ? "ទីតាំងមិនទាន់បញ្ជាក់ (GPS បរាជ័យ/បដិសេធ)" : "Unconfirmed Location (GPS Denied)"}
                  </span>
                )}
              </div>

              {incident.location && (
                <a
                  href={`https://www.google.com/maps?q=${incident.location.lat},${incident.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-caption font-bold text-primary hover:underline"
                >
                  <Navigation size={14} />
                  <span>{locale === "km" ? "បើកមើលក្នុងផែនទី Google Maps" : "Open in Google Maps"}</span>
                </a>
              )}
            </div>
          </Card>
        </div>

        {/* 5. PHOTOS CARD (Sensitive Media) */}
        {incident.photoUrls && incident.photoUrls.length > 0 && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-row font-bold text-ink flex items-center gap-2">
                <span>{t.photoUploadLabel}</span>
              </h3>
              <span className="rounded bg-reported-tint text-reported-ink px-2 py-0.5 text-caption font-bold">
                {locale === "km" ? "ព័ត៌មានរសើប" : "Sensitive Media (Private)"}
              </span>
            </div>

            <p className="text-caption text-ink-muted">
              {t.mediaSensitiveDefault}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {incident.photoUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-line bg-ink aspect-video hover:opacity-90 transition"
                >
                  <img
                    src={url}
                    alt={`Incident media ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* 6. SITUATIONAL AWARENESS: OTHER DISPATCHES */}
        {incident.otherDispatches && incident.otherDispatches.length > 0 && (
          <Card className="p-6 space-y-4">
            <h3 className="text-row font-bold text-ink flex items-center gap-2">
              <ShieldAlert size={18} className="text-primary" />
              <span>{t.otherOrganizationsDispatched}</span>
            </h3>

            <div className="space-y-2.5">
              {incident.otherDispatches.map((od) => (
                <div
                  key={od.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-line bg-sand"
                >
                  <span className="font-bold text-ink text-meta">
                    {tx(od.organizationName)} ({od.organizationType})
                  </span>
                  <Badge
                    variant={
                      od.status === "RESPONDING"
                        ? "success"
                        : od.status === "RESOLVED"
                        ? "info"
                        : od.status === "DECLINED"
                        ? "danger"
                        : "secondary"
                    }
                  >
                    {od.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 7. STATUS HISTORY TIMELINE */}
        <Card className="p-6 space-y-4">
          <h3 className="text-row font-bold text-ink">
            {t.statusTimeline}
          </h3>

          <div className="space-y-3 pt-2">
            {incident.history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 text-caption">
                <div className="size-2 rounded-full bg-primary mt-1.5 flex-none" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{h.status}</span>
                    <span className="text-ink-muted">by {h.by}</span>
                  </div>
                  {h.note && (
                    <p className="text-ink mt-0.5 font-medium">{h.note}</p>
                  )}
                  <span className="text-caption text-ink-muted block mt-0.5">
                    {new Date(h.at).toLocaleTimeString(locale === "km" ? "km-KH" : "en-US")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* MODAL: MARK RESPONDING (Quick ETA Chips) */}
      {isRespondingModalOpen && (
        <Sheet
          title={t.btnResponding}
          onClose={() => setIsRespondingModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {locale === "km"
                ? "កំណត់ស្ថានភាពថា 'កំពុងឆ្លើយតប'។ អ្នកអាចជ្រើសរើស ETA រហ័ស ឬបញ្ចូលកំណត់សម្គាល់សម្រាប់បង្ហាញដល់ពលរដ្ឋ៖"
                : "Mark status as RESPONDING. Select a quick ETA chip or enter response notes visible to the citizen:"}
            </p>

            {/* Quick ETA Chips */}
            <div>
              <span className="text-caption font-bold text-ink-muted block mb-1.5">
                {t.statusBannerResponderEstimate} (ETA):
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "5m", label: t.etaChip5m },
                  { id: "10m", label: t.etaChip10m },
                  { id: "15m", label: t.etaChip15m },
                  { id: "30m", label: t.etaChip30m },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setResponseInfo(chip.label)}
                    className={`rounded-xl border px-3 py-1.5 text-caption font-bold transition ${
                      responseInfo === chip.label
                        ? "border-fixed bg-fixed text-white shadow-card"
                        : "border-line bg-surface hover:bg-sand text-ink"
                    }`}
                  >
                    ⏱ {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <TextField
              label={t.responseNotesLabel}
              placeholder={t.responseNotesPlaceholder}
              value={responseInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResponseInfo(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsRespondingModalOpen(false)}>
                {t.close}
              </Button>
              <Button
                variant="primary"
                disabled={isActionSubmitting}
                onClick={handleMarkResponding}
                className="bg-fixed hover:bg-fixed"
              >
                {isActionSubmitting ? t.submitting : t.btnResponding}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* MODAL: RESOLVE DISPATCH (Confirmation Required) */}
      {isResolveModalOpen && (
        <Sheet
          title={t.confirmResolutionTitle}
          onClose={() => {
            setIsResolveModalOpen(false);
            setConfirmResolutionChecked(false);
          }}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {locale === "km"
                ? "តើប្រតិបត្តិការសង្គ្រោះត្រូវបានបញ្ចប់រួចរាល់ហើយមែនទេ? បញ្ចូលកំណត់សម្គាល់ដោះស្រាយ (ស្រេចចិត្ត)៖"
                : "Confirm that response operations are completed. Add resolution notes (optional):"}
            </p>
            <TextField
              label={locale === "km" ? "កំណត់សម្គាល់ដោះស្រាយ" : "Resolution Note"}
              placeholder={locale === "km" ? "ឧ. ភ្លើងត្រូវបានពន្លត់ទាំងស្រុង..." : "e.g. Fire completely extinguished..."}
              value={resolutionNote}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResolutionNote(e.target.value)}
            />

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-fixed/30 bg-fixed-tint text-fixed-ink cursor-pointer">
              <input
                type="checkbox"
                checked={confirmResolutionChecked}
                onChange={(e) => setConfirmResolutionChecked(e.target.checked)}
                className="mt-0.5 rounded accent-emerald-600 size-4 flex-none"
              />
              <span className="text-caption font-semibold">
                {t.confirmResolutionCheck}
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsResolveModalOpen(false);
                  setConfirmResolutionChecked(false);
                }}
              >
                {t.close}
              </Button>
              <Button
                variant="primary"
                disabled={!confirmResolutionChecked || isActionSubmitting}
                onClick={handleResolve}
                className="bg-fixed hover:bg-fixed"
              >
                {isActionSubmitting ? t.submitting : t.btnResolveDispatch}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* MODAL: DECLINE DISPATCH (Preset Chips & Reason Required) */}
      {isDeclineModalOpen && (
        <Sheet
          title={t.btnDeclineDispatch}
          onClose={() => setIsDeclineModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {locale === "km"
                ? "សូមបញ្ជាក់មូលហេតុដែលអង្គភាពរបស់អ្នកបដិសេធការបញ្ជូននេះ (ឧ. ក្រៅតំបន់ទទួលខុសត្រូវ ឬខុសផ្នែកជំនាញ)៖"
                : "Please state why your organization is declining this dispatch (reason is required):"}
            </p>

            {/* Quick Decline Reason Chips */}
            <div>
              <span className="text-caption font-bold text-ink-muted block mb-1.5">
                {locale === "km" ? "ជ្រើសរើសមូលហេតុរហ័ស៖" : "Quick Preset Reasons:"}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  locale === "km" ? "ក្រៅតំបន់ទទួលខុសត្រូវ" : "Outside jurisdiction",
                  locale === "km" ? "ខុសផ្នែកជំនាញ" : "Specialty mismatch",
                  locale === "km" ? "ខ្វះកម្លាំង/សម្ភារៈ" : "Capacity exhausted",
                  locale === "km" ? "ព័ត៌មានមិនគ្រប់គ្រាន់" : "Insufficient details",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setDeclineReason(reason)}
                    className={`rounded-xl border px-3 py-1.5 text-caption font-bold transition ${
                      declineReason === reason
                        ? "border-danger bg-danger text-white shadow-card"
                        : "border-line bg-surface hover:bg-sand text-ink"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <TextField
              label={t.declineReasonLabel}
              placeholder={t.declineReasonPlaceholder}
              value={declineReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeclineReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsDeclineModalOpen(false)}>
                {t.close}
              </Button>
              <Button
                variant="danger"
                disabled={!declineReason.trim() || isActionSubmitting}
                onClick={handleDecline}
              >
                {isActionSubmitting ? t.submitting : t.btnDeclineDispatch}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* MODAL: CANNOT CONTINUE (Fix 4: Preset Chips & Reason Required) */}
      {isCannotContinueModalOpen && (
        <Sheet
          title={t.cannotContinueTitle || (locale === "km" ? "មិនអាចបន្តប្រតិបត្តិការឆ្លើយតបបាន" : "Cannot Continue Dispatch")}
          onClose={() => setIsCannotContinueModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {t.cannotContinueNotice ||
                (locale === "km"
                  ? "សូមបញ្ជាក់មូលហេតុដែលក្រុមសង្គ្រោះមិនអាចបន្តបាន (ឧ. ផ្លូវត្រូវកាត់ផ្តាច់ គ្រោះថ្នាក់ខ្លាំង ឬត្រូវការជំនួយបន្ថែម)។ ការបញ្ជូននេះនឹងត្រូវប្រគល់ទៅ Admin វិញ ហើយពលរដ្ឋនឹងត្រូវបានណែនាំឱ្យទូរស័ព្ទទៅ 117/118/119 ដោយផ្ទាល់៖"
                  : "Please state why responders cannot continue (e.g. road blocked, extreme hazard, or requires secondary unit). This returns the dispatch to admin for reassignment and advises citizen to call 117/118/119 directly:")}
            </p>

            {/* Quick Cannot Continue Reason Chips */}
            <div>
              <span className="text-caption font-bold text-ink-muted block mb-1.5">
                {locale === "km" ? "ជ្រើសរើសមូលហេតុរហ័ស៖" : "Quick Preset Reasons:"}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  locale === "km" ? "ផ្លូវត្រូវកាត់ផ្តាច់ / ទឹកលិចខ្លាំង" : "Road blocked / flooded",
                  locale === "km" ? "គ្រោះថ្នាក់ខ្លាំងចំពោះក្រុមសង្គ្រោះ" : "Extreme hazard to crew",
                  locale === "km" ? "ត្រូវការកម្លាំងជំនាញបន្ថែម" : "Requires specialist backup",
                  locale === "km" ? "រកទីតាំងពលរដ្ឋមិនឃើញ" : "Unable to locate citizen",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCannotContinueReason(reason)}
                    className={`rounded-xl border px-3 py-1.5 text-caption font-bold transition ${
                      cannotContinueReason === reason
                        ? "border-danger bg-danger text-white shadow-card"
                        : "border-line bg-surface hover:bg-sand text-ink"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <TextField
              label={t.cannotContinueReasonLabel || (locale === "km" ? "មូលហេតុមិនអាចបន្ត (ចាំបាច់)" : "Reason Cannot Continue (Required)")}
              placeholder={t.cannotContinueReasonPlaceholder || (locale === "km" ? "ឧ. ផ្លូវទឹកលិចខ្លាំង ឡានសង្គ្រោះមិនអាចចូលរួច..." : "e.g. Floodwater too high, ambulance cannot pass...")}
              value={cannotContinueReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCannotContinueReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsCannotContinueModalOpen(false)}>
                {t.close}
              </Button>
              <Button
                variant="danger"
                disabled={!cannotContinueReason.trim() || isActionSubmitting}
                onClick={handleCannotContinue}
              >
                {isActionSubmitting ? t.submitting : (t.btnCannotContinue || "Submit")}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* MODAL: SET AUTHORITATIVE SEVERITY */}
      {isSeverityModalOpen && (
        <Sheet
          title={t.setSeverityTitle}
          onClose={() => setIsSeverityModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {locale === "km"
                ? "ជ្រើសរើសកម្រិតភាពធ្ងន់ធ្ងរផ្លូវការសម្រាប់ហេតុការណ៍នេះ៖"
                : "Select the authoritative severity level for this incident:"}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as EmSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`p-3 rounded-xl border text-center font-black transition ${
                    selectedSeverity === sev
                      ? sev === "CRITICAL"
                        ? "border-danger bg-danger text-white shadow-card"
                        : sev === "HIGH"
                        ? "border-reported bg-reported text-white"
                        : "border-primary bg-primary text-white"
                      : "border-line bg-surface hover:bg-sand text-ink"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsSeverityModalOpen(false)}>
                {t.close}
              </Button>
              <Button
                variant="primary"
                disabled={isActionSubmitting}
                onClick={handleSaveSeverity}
              >
                {isActionSubmitting ? t.submitting : t.save}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* 5. STICKY ACTION BAR FOR RESPONDERS (Mobile & Desktop) */}
      {!isTerminal && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md px-4 py-3 shadow-raised">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-caption font-bold text-ink-muted hidden sm:inline">
                {locale === "km" ? "ស្ថានភាពបច្ចុប្បន្ន៖" : "Current status:"}
              </span>
              <Badge
                variant={
                  dp.status === "RESPONDING"
                    ? "success"
                    : dp.status === "ACKNOWLEDGED"
                    ? "info"
                    : "default"
                }
                className="font-black text-caption"
              >
                {dp.status === "CANNOT_CONTINUE"
                  ? (locale === "km" ? "មិនអាចបន្តបាន" : "CANNOT CONTINUE")
                  : dp.status}
              </Badge>
              {dp.responseInfo && (
                <span className="text-caption font-semibold text-fixed hidden md:inline truncate max-w-[160px]">
                  “{dp.responseInfo}”
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {dp.status === "RECEIVED" && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isActionSubmitting}
                  onClick={handleAcknowledge}
                  className="font-bold gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>{t.btnAcknowledge}</span>
                </Button>
              )}

              {(dp.status === "RECEIVED" || dp.status === "ACKNOWLEDGED") && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isActionSubmitting}
                  onClick={() => setIsRespondingModalOpen(true)}
                  className="font-bold gap-1.5 bg-fixed hover:bg-fixed"
                >
                  <Send size={16} />
                  <span>{t.btnResponding}</span>
                </Button>
              )}

              {(dp.status === "ACKNOWLEDGED" || dp.status === "RESPONDING") && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isActionSubmitting}
                  onClick={() => setIsResolveModalOpen(true)}
                  className="font-bold gap-1.5 border-fixed text-fixed-ink "
                >
                  <CheckCircle2 size={16} />
                  <span>{t.btnResolveDispatch}</span>
                </Button>
              )}

              {dp.status === "RESPONDING" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isActionSubmitting}
                  onClick={() => setIsCannotContinueModalOpen(true)}
                  className="font-bold gap-1.5 text-reported-ink border-reported hover:bg-reported "
                >
                  <AlertTriangle size={16} />
                  <span>{locale === "km" ? "មិនអាចបន្ត" : "Cannot Continue"}</span>
                </Button>
              )}

              {dp.status !== "RESPONDING" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isActionSubmitting}
                  onClick={() => setIsDeclineModalOpen(true)}
                  className="font-bold gap-1.5 text-danger border-danger/40 hover:bg-danger/10"
                >
                  <XCircle size={16} />
                  <span>{t.btnDeclineDispatch}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. UNDO RESPONDING TOAST (10-second countdown window) */}
      {showUndoToast && undoSecondsLeft !== null && undoSecondsLeft > 0 && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl bg-ink text-white p-4 shadow-2xl flex items-center justify-between gap-3 border border-ink-muted">
          <div className="flex items-center gap-2.5">
            <Clock size={18} className="text-reported flex-none animate-pulse" />
            <p className="text-caption font-medium">
              {fmt(t.undoNotice, { seconds: undoSecondsLeft })}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUndoResponding}
            disabled={isUndoing}
            className="bg-ink text-white hover:bg-ink border-ink-muted text-caption font-bold flex-none"
          >
            {isUndoing ? "..." : t.undoRespondingBtn}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

export default function OrgIncidentPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-ink-muted">Loading...</div>}>
      <OrgIncidentContent />
    </Suspense>
  );
}
