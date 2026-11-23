"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api";
import { currentUser } from "@/lib/api/mock-db";
import { EmIncidentForOrg, EmDispatchStatus } from "@/types";
import { PageContainer } from "@/components/layout/AppShell";
import { Card, Button, PageHeader, Badge } from "@/components/ui";
import {
  ShieldAlert,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Radio,
  FileText,
  ChevronRight,
  Filter,
  Flame,
  Car,
  HeartPulse,
  HelpCircle,
  Waves,
  Building,
  Zap,
} from "lucide-react";

function OrgInboxContent() {
  const { locale, t, tx } = useLocale();
  const [user, setUser] = useState(currentUser());
  const [incidents, setIncidents] = useState<EmIncidentForOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ACTIVE" | "RESOLVED" | "DECLINED" | "ALL">("ACTIVE");
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    setUser(currentUser());
    loadDispatches();
    const interval = setInterval(() => {
      loadDispatches();
      setNowTime(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDispatches = async () => {
    try {
      const data = await api.em.orgInbox({ includeClosed: true });
      setIncidents(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

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

  // Filter according to tabs
  const filtered = incidents.filter((item) => {
    const isClosed = ["RESOLVED", "CANCELLED", "DUPLICATE"].includes(item.status);
    const isDispatchResolved = item.dispatch.status === "RESOLVED";
    const isDispatchDeclined = item.dispatch.status === "DECLINED";

    if (tab === "ACTIVE") {
      return !isDispatchResolved && !isDispatchDeclined && !isClosed;
    }
    if (tab === "RESOLVED") {
      return isDispatchResolved || item.status === "RESOLVED";
    }
    if (tab === "DECLINED") {
      return isDispatchDeclined;
    }
    return true;
  });

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "FIRE":
        return <Flame size={16} className="text-amber-600" />;
      case "ROAD_CRASH":
        return <Car size={16} className="text-sky-600" />;
      case "MEDICAL":
        return <HeartPulse size={16} className="text-danger" />;
      case "CRIME":
      case "VIOLENCE":
        return <ShieldAlert size={16} className="text-purple-600" />;
      case "FLOOD_DANGER":
        return <Waves size={16} className="text-teal-600" />;
      case "BUILDING_COLLAPSE":
        return <Building size={16} className="text-orange-600" />;
      case "ELECTRICAL_HAZARD":
        return <Zap size={16} className="text-yellow-600" />;
      default:
        return <HelpCircle size={16} className="text-ink-muted" />;
    }
  };

  const formatElapsed = (iso: string) => {
    const diffMin = Math.max(0, Math.floor((nowTime - new Date(iso).getTime()) / 60000));
    if (diffMin < 1) return locale === "km" ? "ទើបតែផ្ញើ" : "Just now";
    if (diffMin < 60) return `${diffMin} ${locale === "km" ? "នាទីមុន" : "min ago"}`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr} ${locale === "km" ? "ម៉ោងមុន" : "hr ago"}`;
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-6 pb-20">
        <PageHeader
          title={t.orgInboxTitle}
          subtitle={
            locale === "km"
              ? `អង្គភាព៖ ${user.fullName} (${user.organizationId || "Admin"})`
              : `Organization: ${user.fullName} (${user.organizationId || "Admin"})`
          }
          back="/emergency"
        />

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
          {[
            { key: "ACTIVE" as const, label: t.orgActiveDispatches, count: incidents.filter((i) => i.dispatch.status !== "RESOLVED" && i.dispatch.status !== "DECLINED" && !["RESOLVED", "CANCELLED", "DUPLICATE"].includes(i.status)).length },
            { key: "RESOLVED" as const, label: t.orgResolvedDispatches, count: incidents.filter((i) => i.dispatch.status === "RESOLVED" || i.status === "RESOLVED").length },
            { key: "DECLINED" as const, label: t.orgDeclinedDispatches, count: incidents.filter((i) => i.dispatch.status === "DECLINED").length },
            { key: "ALL" as const, label: t.orgAllDispatches, count: incidents.length },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-meta font-bold transition ${
                tab === item.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface text-ink-muted hover:bg-surface-alt border border-line"
              }`}
            >
              <span>{item.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[11px] ${tab === item.key ? "bg-white/20 text-white" : "bg-sand text-ink-muted"}`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {/* Dispatches List */}
        {loading ? (
          <div className="py-12 text-center text-ink-muted font-bold">
            {t.submitting}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h3 className="text-row font-bold text-ink">{t.noDispatchesInInbox}</h3>
            <p className="text-caption text-ink-muted">
              {locale === "km" ? "មិនមានការបញ្ជូនសង្គ្រោះដែលត្រូវចាត់ចែងក្នុងពេលនេះទេ។" : "No dispatches pending in this queue right now."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const isUnack = item.isUnacknowledgedStale;
              const isStandDown = item.standDownWarning;

              return (
                <Card
                  key={item.id}
                  className={`p-5 transition hover:shadow-card space-y-3 border-2 ${
                    item.kind === "SOS"
                      ? "border-danger/60 bg-danger-tint/20"
                      : isUnack
                      ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
                      : "border-line"
                  }`}
                >
                  {/* Urgent Warnings */}
                  {isStandDown && (
                    <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-caption font-bold text-danger">
                      <AlertTriangle size={18} className="flex-none animate-bounce" />
                      <span>{t.standDownAlert}</span>
                    </div>
                  )}

                  {isUnack && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-100 dark:bg-amber-950/60 p-2.5 text-caption font-bold text-amber-950 dark:text-amber-200">
                      <Clock size={16} className="flex-none animate-pulse text-amber-600" />
                      <span>{t.unacknowledgedWarning}</span>
                    </div>
                  )}

                  {/* Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-row font-black text-ink">
                        {item.code || item.id}
                      </span>
                      {item.kind === "SOS" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-0.5 text-caption font-black text-white animate-pulse">
                          <Radio size={12} />
                          <span>SOS</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-0.5 text-caption font-bold text-ink">
                        {getCategoryIcon(item.type)}
                        <span>{item.type}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Closed by user flag */}
                      {item.status === "CLOSED_BY_USER" && (
                        <Badge variant="warning">
                          {t.statusClosedByUser}
                        </Badge>
                      )}
                      {/* Authoritative Severity */}
                      <Badge
                        variant={
                          item.severity === "CRITICAL"
                            ? "danger"
                            : item.severity === "HIGH"
                            ? "warning"
                            : "default"
                        }
                      >
                        {item.severity}
                      </Badge>
                      {/* Dispatch Status */}
                      <Badge
                        variant={
                          item.dispatch.status === "RESPONDING"
                            ? "success"
                            : item.dispatch.status === "ACKNOWLEDGED"
                            ? "info"
                            : item.dispatch.status === "RECEIVED"
                            ? "default"
                            : item.dispatch.status === "DECLINED" || item.dispatch.status === "CANNOT_CONTINUE"
                            ? "danger"
                            : "secondary"
                        }
                      >
                        {item.dispatch.status === "CANNOT_CONTINUE" ? t.statusCannotContinue : item.dispatch.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Description / Summary */}
                  <p className="text-body text-ink font-medium line-clamp-2">
                    {item.description}
                  </p>

                  {/* Location & Time Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-ink-muted pt-1 border-t border-line">
                    <div className="flex items-center gap-1.5 max-w-md truncate">
                      <MapPin size={15} className="flex-none text-primary" />
                      <span>
                        {item.landmark ? `${item.landmark}, ` : ""}
                        {item.cityId}, {item.provinceId}
                      </span>
                      {!item.locationConfirmed && (
                        <span className="ml-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-1.5 py-0.2 text-[10px] font-bold">
                          {locale === "km" ? "ទីតាំងមិនទាន់បញ្ជាក់" : "Unconfirmed"}
                        </span>
                      )}
                      {item.isPossibleDuplicate && (
                        <span className="ml-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 px-1.5 py-0.2 text-[10px] font-bold">
                          {locale === "km" ? "សង្ស័យស្ទួន" : "Possible Dup"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatElapsed(item.dispatch.sentAt)}</span>
                      </span>

                      <Link href={`/org/incidents/${item.id}`}>
                        <Button variant="secondary" size="sm" className="gap-1 font-bold">
                          <span>{locale === "km" ? "មើលព័ត៌មានលម្អិត" : "Open Details"}</span>
                          <ChevronRight size={14} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function OrgInboxPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-ink-muted">Loading...</div>}>
      <OrgInboxContent />
    </Suspense>
  );
}
