"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  HeartPulse,
  LogIn,
  LogOut,
  MapPin,
  Phone,
  Shield,
  User as UserIcon,
  Users,
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
  PageHeader,
  Section,
} from "@/components/ui";
import type { EmTrustedContact } from "@/types";
import { EM_RULES } from "@/types";

export default function ProfilePage() {
  const { t } = useLocale();
  const { user, ready, login, logout } = useAuth();
  const [contacts, setContacts] = useState<EmTrustedContact[]>([]);

  useEffect(() => {
    if (user) {
      api.em
        .listTrustedContacts()
        .then(setContacts)
        .catch(() => {});
    }
  }, [user]);

  if (!ready) {
    return (
      <PageContainer>
        <div className="flex min-h-64 items-center justify-center text-ink-muted">
          {t.submitting}
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-tint text-primary">
            <UserIcon size={32} />
          </div>
          <h1 className="text-display font-bold">{t.myProfile}</h1>
          <p className="mt-2 text-body text-ink-muted">{t.accountNeeded}</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => login({ phone: "012000001", password: "demo1234" })}
            >
              ចូលគណនីគំរូ (Quick Login: 012000001)
            </Button>
            <Link
              href="/login?next=/me"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface px-6 text-body font-bold text-ink shadow-card hover:bg-sand"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const activeContacts = contacts.filter((c) =>
    ["PENDING", "CONFIRMED", "MUTED"].includes(c.status)
  );
  const confirmedCount = contacts.filter((c) => c.status === "CONFIRMED").length;

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <PageHeader title={t.myProfile} back="/" />

        {/* Profile Info Card */}
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 flex-none items-center justify-center rounded-2xl bg-primary text-title font-extrabold text-white shadow-card">
              {user.fullName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-title font-bold text-ink">{user.fullName}</h2>
                <span className="rounded-md bg-primary-tint px-2 py-0.5 text-caption font-semibold text-primary">
                  {user.role}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-meta text-ink-muted">
                <Phone size={14} />
                <span className="font-mono">{user.phone}</span>
              </p>
              {user.sangkat && (
                <p className="flex items-center gap-1.5 text-meta text-ink-muted">
                  <MapPin size={14} />
                  <span>{user.sangkat}</span>
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Emergency Contacts Entry Card */}
        <Section
          title={t.emergencyContactsTitle}
          action={
            <Link
              href="/me/contacts"
              className="text-meta font-bold text-primary hover:underline"
            >
              {t.manageContacts}
            </Link>
          }
        >
          <Link
            href="/me/contacts"
            className="group block rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-raised"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-12 flex-none items-center justify-center rounded-xl bg-danger-tint text-danger group-hover:scale-105 transition-transform">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-row font-bold text-ink">
                      {t.emergencyContactsTitle}
                    </h3>
                    <CountBadge count={activeContacts.length} />
                  </div>
                  <p className="mt-1 text-meta text-ink-muted">
                    {t.emergencyContactsDesc}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-sand px-2.5 py-1 text-caption font-semibold text-ink">
                      <Users size={14} />
                      {fmt(t.contactsConfirmedBadge, {
                        confirmed: confirmedCount,
                        total: activeContacts.length,
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-sand px-2.5 py-1 text-caption font-semibold text-ink-muted">
                      {fmt(t.activeContactsCount, {
                        count: activeContacts.length,
                        max: EM_RULES.maxTrustedContacts,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight
                size={22}
                className="flex-none text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-primary"
              />
            </div>
          </Link>
        </Section>

        {/* Medical Info Section */}
        <Section title={t.medicalInfoTitle}>
          <Card className="divide-y divide-line p-0">
            <div className="flex items-center justify-between p-4">
              <span className="text-body text-ink-muted">{t.bloodType}</span>
              <span className="text-body font-bold text-ink">
                {user.medicalInfo?.bloodType || t.notSpecified}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-body text-ink-muted">{t.allergies}</span>
              <span className="text-body font-semibold text-ink">
                {user.medicalInfo?.allergies || t.notSpecified}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-body text-ink-muted">{t.medicalConditions}</span>
              <span className="text-body font-semibold text-ink">
                {user.medicalInfo?.medications || t.notSpecified}
              </span>
            </div>
            <div className="p-4">
              <span className="block text-body text-ink-muted">{t.emergencyNotes}</span>
              <p className="mt-1 text-body text-ink">
                {user.medicalInfo?.notes || t.notSpecified}
              </p>
            </div>
            <div className="bg-sand-tint p-4 text-caption text-ink-muted">
              <div className="flex items-center gap-1.5 font-medium">
                <HeartPulse size={14} className="text-danger" />
                <span>{t.shareMedicalInfoHint}</span>
              </div>
            </div>
          </Card>
        </Section>

        {/* Account actions */}
        <div className="pt-4">
          <Button
            variant="secondary"
            className="w-full text-danger hover:bg-danger-tint border-danger/30"
            onClick={logout}
          >
            <LogOut size={18} />
            {t.logout}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
