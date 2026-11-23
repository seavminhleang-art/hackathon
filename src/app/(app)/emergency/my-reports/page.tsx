"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { IncidentIcon, useIncidentTypes } from "@/features/emergency/meta";
import { api } from "@/lib/api";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, PageHeader } from "@/components/ui";
import type { EmIncidentForReporter } from "@/types";

export default function MyEmergencyReportsPage() {
  const { t, tx, locale } = useLocale();
  const EM_INCIDENT_TYPES = useIncidentTypes();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<EmIncidentForReporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deferred = setTimeout(() => {
    if (user) {
      api.em.myIncidents()
        .then(setIncidents)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
      }, 0);
    return () => clearTimeout(deferred);
  }, [user]);

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageHeader
            title={t.emMyReportsTitle}
            subtitle={t.emMyReportsSubtitle}
            back="/emergency"
          />
          <Link href="/emergency/report">
            <Button variant="primary" size="sm" className="gap-1.5 font-bold">
              <Plus size={16} />
              <span>{t.reportIncidentTitle}</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="size-8 animate-spin text-primary" />
          </div>
        ) : incidents.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <ShieldAlert size={48} className="mx-auto text-ink-muted" />
            <h3 className="text-title font-bold text-ink">{t.noReportsYet}</h3>
            <p className="text-meta text-ink-muted">
              {locale === "km"
                ? "អ្នកមិនទាន់បានដាក់ស្នើរបាយការណ៍គ្រោះអាសន្នណាមួយនៅឡើយទេ។"
                : "You haven't submitted any emergency reports or SOS alerts yet."}
            </p>
            <div className="pt-2">
              <Link href="/emergency/report">
                <Button variant="primary">{t.reportIncidentTitle}</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => {
              const meta = EM_INCIDENT_TYPES.find((m) => m.id === inc.type);
              return (
                <Link key={inc.id} href={`/emergency/${inc.id}`} className="block group">
                  <Card className="p-4 transition-all hover:border-primary/40 hover:shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <IncidentIcon type={inc.type} className="mt-0.5 flex-none text-danger" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-meta font-bold text-primary group-hover:underline">
                              {inc.code || inc.id}
                            </span>
                            <span className="text-meta font-semibold text-ink">
                              {meta ? tx(meta.label) : inc.type}
                            </span>
                          </div>
                          <p className="text-caption text-ink-muted line-clamp-1 mt-0.5">
                            {inc.description || (meta ? tx(meta.label) : "Emergency incident")}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-caption text-ink-muted">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{inc.createdAt.slice(0, 10)} {inc.createdAt.slice(11, 16)}</span>
                            </span>
                            {inc.addressHint && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                <span>{inc.addressHint}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-caption font-bold ${
                            inc.status === "RESOLVED"
                              ? "bg-fixed-tint text-fixed-ink "
                              : inc.status === "RESPONDING"
                              ? "bg-fixed text-white animate-pulse"
                              : inc.status === "REJECTED" || inc.status === "CANCELLED"
                              ? "bg-sand text-ink-muted"
                              : "bg-danger-tint text-danger border border-danger/30"
                          }`}
                        >
                          {inc.status}
                        </span>
                        {inc.isPossibleDuplicate && (
                          <span className="text-caption text-reported-ink bg-reported-tint px-1.5 py-0.2 rounded font-semibold">
                            Duplicate Flagged
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
