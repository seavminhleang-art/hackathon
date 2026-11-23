"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { Card, ListRow } from "@/components/ui";
import { EM_RULES, type EmTrustedContact } from "@/types";

/**
 * Emergency part of the "Me" profile: trusted contacts (link to /me/contacts) and the
 * medical info responders may see. Shown on /dashboard/profile (formerly the /me page).
 */
export function EmergencyProfileCard() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmTrustedContact[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.em
      .listTrustedContacts()
      .then((rows) => alive && setContacts(rows))
      .catch(() => alive && setContacts([]));
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return null;
  const active = (contacts ?? []).filter((c) => ["PENDING", "CONFIRMED", "MUTED"].includes(c.status));
  const confirmed = active.filter((c) => c.status === "CONFIRMED").length;
  const medical: [string, string | undefined][] = [
    [t.bloodType, user.medicalInfo?.bloodType],
    [t.allergies, user.medicalInfo?.allergies],
    [t.medicalConditions, user.medicalInfo?.medications],
    [t.emergencyNotes, user.medicalInfo?.notes],
  ];

  return (
    <Card className="mt-4 flex flex-col gap-4">
      <h2 className="text-title font-bold">{t.emergencyContactsTitle}</h2>
      <ul>
        <ListRow
          icon={Users}
          accent="danger"
          href="/me/contacts"
          title={t.manageContacts}
          subtitle={
            contacts
              ? `${fmt(t.contactsConfirmedBadge, { confirmed, total: active.length })} · ${fmt(t.activeContactsCount, { count: active.length, max: EM_RULES.maxTrustedContacts })}`
              : t.emergencyContactsDesc
          }
        />
      </ul>
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-row font-bold">
          <HeartPulse aria-hidden size={20} className="text-danger" />
          {t.medicalInfoTitle}
        </h3>
        <dl className="divide-y divide-line rounded-xl ring-1 ring-line ring-inset">
          {medical.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-4 py-3">
              <dt className="text-body text-ink-muted">{label}</dt>
              <dd className="text-right text-body font-semibold text-ink">{value || t.notSpecified}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-meta text-ink-muted">{t.shareMedicalInfoHint}</p>
      </div>
    </Card>
  );
}
