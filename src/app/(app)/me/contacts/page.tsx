"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, HeartPulse, Phone, Plus, RefreshCw, Send, Shield, Trash2, UserPlus, Users, XCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { Button, Card, EmptyState, PageHeader, Section, SelectField, Sheet, TextField } from "@/components/ui";
import type { EmTrustedContact } from "@/types";
import { EM_RULES } from "@/types";

export default function EmergencyContactsPage() {
  const { t, locale } = useLocale();
  const { user, ready, login } = useAuth();
  const [contacts, setContacts] = useState<EmTrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmTrustedContact | null>(null);
  const [isTestAlertOpen, setIsTestAlertOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Family");
  const [priority, setPriority] = useState(1);
  const [shareMedical, setShareMedical] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadContacts() {
    try {
      setLoading(true);
      setError(null);
      const list = await api.em.listTrustedContacts();
      setContacts(list);
    } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
      setError(err?.message || t.errGeneric);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const deferred = setTimeout(() => {
    if (ready && user) {
      loadContacts();
    } else if (ready && !user) {
      setLoading(false);
    }
      }, 0);
    return () => clearTimeout(deferred);
  }, [ready, user]);

  const activeContacts = contacts.filter((c) =>
    ["PENDING", "CONFIRMED", "MUTED"].includes(c.status)
  );
  const confirmedContacts = contacts.filter((c) => c.status === "CONFIRMED");
  const canAdd = activeContacts.length < EM_RULES.maxTrustedContacts;

  const handleOpenAdd = () => {
    setName("");
    setPhone("");
    setRelation("Family");
    setPriority(activeContacts.length + 1);
    setShareMedical(true);
    setFormError(null);
    setEditingContact(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (c: EmTrustedContact) => {
    setEditingContact(c);
    setName(c.name);
    setPhone(c.phone);
    setRelation(c.relation || "Family");
    setPriority(c.priority);
    setShareMedical(c.shareMedicalInfo);
    setFormError(null);
    setIsAddOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      try {
        if (editingContact) {
          await api.em.updateTrustedContact(editingContact.id, {
            name,
            relation,
            priority: Number(priority),
            shareMedicalInfo: shareMedical,
          });
          setSuccessMsg(locale === "km" ? "បានធ្វើបច្ចុប្បន្នភាពទំនាក់ទំនងដោយជោគជ័យ" : "Contact updated successfully");
        } else {
          await api.em.addTrustedContact({
            name,
            phone,
            relation,
            priority: Number(priority),
            shareMedicalInfo: shareMedical,
          });
          setSuccessMsg(locale === "km" ? "បានបន្ថែមទំនាក់ទំនង និងផ្ញើការអញ្ជើញរួចរាល់" : "Contact added and invite sent via SMS");
        }
        setIsAddOpen(false);
        await loadContacts();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        setFormError(err?.message || t.errGeneric);
      }
    });
  };

  const handleDeleteContact = (id: string) => {
    const confirmText = locale === "km" ? "តើអ្នកប្រាកដជាចង់លុបទំនាក់ទំនងនេះមែនទេ?" : "Are you sure you want to remove this contact?";
    if (!window.confirm(confirmText)) return;
    startTransition(async () => {
      try {
        await api.em.removeTrustedContact(id);
        setSuccessMsg(locale === "km" ? "បានលុបទំនាក់ទំនង" : "Contact removed");
        await loadContacts();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        setError(err?.message || t.errGeneric);
      }
    });
  };

  const handleResendInvite = (id: string) => {
    startTransition(async () => {
      try {
        await api.em.resendContactInvite(id);
        setSuccessMsg(locale === "km" ? "បានផ្ញើការអញ្ជើញឡើងវិញ" : "Invite re-sent");
        await loadContacts();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        setError(err?.message || t.errGeneric);
      }
    });
  };

  const handleDevReply = (id: string, reply: "YES" | "NO") => {
    startTransition(async () => {
      try {
        await api.em.devSimulateContactReply(id, reply);
        setSuccessMsg(reply === "YES" ? "Simulated YES: Contact is now CONFIRMED" : "Simulated NO: Contact DECLINED");
        await loadContacts();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        setError(err?.message || t.errGeneric);
      }
    });
  };

  const handleDevLeave = (id: string) => {
    startTransition(async () => {
      try {
        await api.em.devSimulateContactLeave(id);
        setSuccessMsg("Simulated: Contact marked LEFT");
        await loadContacts();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        setError(err?.message || t.errGeneric);
      }
    });
  };

  const handleDevExpire = (id: string) => {
    startTransition(async () => {
      try {
        await api.em.devSimulateExpireInvite(id);
        setSuccessMsg("Simulated: Invite marked EXPIRED");
        await loadContacts();
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        setError(err?.message || t.errGeneric);
      }
    });
  };

  const handleSendTestAlert = () => {
    startTransition(async () => {
      try {
        const res = await api.em.sendTestAlert();
        setTestResult(fmt(t.testAlertSuccess, { count: res.notifiedCount }));
        setIsTestAlertOpen(false);
        setSuccessMsg(fmt(t.testAlertSuccess, { count: res.notifiedCount }));
      } catch (caught) {
      const err = caught as Error & { code?: string; field?: string };
        setFormError(err?.message || t.errGeneric);
      }
    });
  };

  if (!ready || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card className="text-center p-8">
          <Shield className="mx-auto mb-4 text-primary" size={48} />
          <h1 className="text-title font-bold">{t.emergencyContactsTitle}</h1>
          <p className="mt-2 text-body text-ink-muted">
            {locale === "km"
              ? "សូមចូលគណនីដើម្បីគ្រប់គ្រងទំនាក់ទំនងសង្គ្រោះបន្ទាន់របស់អ្នក"
              : "Please sign in to manage your trusted emergency contacts."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => login({ identifier: "012000001", password: "demo1234" })}
            >
              {t.quickDemoLogin}
            </Button>
            <Link
              href="/login?next=/me/contacts"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface px-6 text-body font-bold text-ink shadow-card hover:bg-sand"
            >
              {t.login}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Header with back button */}
      <div className="mb-4">
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-1.5 text-body font-medium text-ink-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span>{t.previous}</span>
        </Link>
      </div>

      <PageHeader
        title={t.emergencyContactsTitle}
        subtitle={t.emergencyContactsSubtitle}
      />

      {/* Notifications / Alerts Banner */}
      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-fixed-tint px-4 py-3 text-fixed-ink ring-1 ring-fixed/30">
          <span className="text-body font-medium">{successMsg}</span>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setSuccessMsg(null)}
            className="text-fixed-ink hover:text-fixed-ink"
          >
            <X aria-hidden size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-danger/10 px-4 py-3 text-danger ring-1 ring-danger/20">
          <span className="text-body font-medium">{error}</span>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setError(null)}
            className="text-danger hover:underline"
          >
            <X aria-hidden size={18} />
          </button>
        </div>
      )}

      {/* Status summary banner */}
      <Card className="mb-6 bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-3 rounded-full bg-fixed animate-pulse" />
              <span className="text-row font-bold text-ink">
                {fmt(t.contactsConfirmedBadge, {
                  confirmed: confirmedContacts.length,
                  total: contacts.length,
                })}
              </span>
            </div>
            <p className="mt-1 text-meta text-ink-muted">
              {fmt(t.activeContactsCount, {
                count: activeContacts.length,
                max: EM_RULES.maxTrustedContacts,
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTestAlertOpen(true)}
              disabled={confirmedContacts.length === 0}
              className="gap-1.5"
            >
              <Send size={16} />
              <span>{t.sendTestAlertBtn}</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              disabled={!canAdd}
              className="gap-1.5"
            >
              <Plus size={16} />
              <span>{t.addContact}</span>
            </Button>
          </div>
        </div>

        {/* Warning if no confirmed contacts */}
        {contacts.length > 0 && confirmedContacts.length === 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-reported-tint p-3 text-reported-ink ring-1 ring-reported/30">
            <AlertTriangle size={18} className="mt-0.5 flex-none text-reported" />
            <p className="text-meta">
              {locale === "km"
                ? "អ្នកមិនទាន់មានទំនាក់ទំនងដែលបានបញ្ជាក់ នៅឡើយទេ។ ទំនាក់ទំនងដែលស្ថិតក្នុងស្ថានភាព 'រង់ចាំ' នឹងមិនទទួលបានការជូនដំណឹងពេលអ្នកចុច SOS ឡើយ។"
                : "No contacts have confirmed yet. Contacts in 'Pending' status will NOT receive emergency alerts during SOS until they reply YES."}
            </p>
          </div>
        )}
      </Card>

      {/* Contacts List */}
      <Section
        title={t.emergencyContactsTitle}
        hint={fmt(t.activeContactsCount, {
          count: activeContacts.length,
          max: EM_RULES.maxTrustedContacts,
        })}
      >
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t.emptyContactsTitle}
            body={t.emptyContactsBody}
            action={
              <Button variant="primary" onClick={handleOpenAdd} className="gap-2">
                <UserPlus size={18} />
                <span>{t.addContact}</span>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {contacts.map((c) => {
              const isConfirmed = c.status === "CONFIRMED";
              const isPendingStatus = c.status === "PENDING";
              const isExpired = c.status === "EXPIRED";
              const isDeclined = c.status === "DECLINED";

              return (
                <Card key={c.id} className="p-4 transition-all hover:shadow-raised">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Contact Info */}
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 flex-none items-center justify-center rounded-xl bg-primary-tint text-primary font-bold">
                        #{c.priority}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-title font-bold text-ink">{c.name}</h3>
                          {c.relation && (
                            <span className="rounded-md bg-sand px-2 py-0.5 text-caption font-semibold text-ink-muted">
                              {c.relation}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-body text-ink-muted">
                          <Phone size={15} />
                          <span className="font-mono text-meta font-medium">{c.phone}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-caption">
                          {/* Status Badge */}
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-fixed-tint px-2.5 py-0.5 font-bold text-fixed-ink ring-1 ring-fixed/30">
                              <CheckCircle2 size={13} />
                              <span>{t.contactStatusCONFIRMED}</span>
                            </span>
                          )}

                          {isPendingStatus && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-reported-tint px-2.5 py-0.5 font-bold text-reported-ink ring-1 ring-reported/30">
                              <Clock size={13} />
                              <span>{t.contactStatusPENDING}</span>
                            </span>
                          )}

                          {isExpired && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger-tint px-2.5 py-0.5 font-bold text-danger ring-1 ring-danger/30">
                              <XCircle size={13} />
                              <span>{t.contactStatusEXPIRED}</span>
                            </span>
                          )}

                          {isDeclined && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-0.5 font-bold text-ink ring-1 ring-line-strong">
                              <span>{t.contactStatusDECLINED}</span>
                            </span>
                          )}

                          {/* Medical Info Indicator */}
                          {c.shareMedicalInfo && (
                            <span className="inline-flex items-center gap-1 text-ink-muted">
                              <HeartPulse size={13} className="text-danger" />
                              <span>{t.shareMedicalInfo}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-start">
                      {(isPendingStatus || isExpired) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvite(c.id)}
                          title={t.resendInvite}
                          className="text-primary hover:bg-primary-tint"
                        >
                          <RefreshCw size={16} />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(c)}
                        className="text-ink-muted hover:text-ink"
                      >
                        {t.editContact}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContact(c.id)}
                        className="text-danger hover:bg-danger/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  {/* Dev-only simulation controls */}
                  <div className="mt-3.5 border-t border-dashed border-reported/30 bg-reported-tint p-2.5 rounded-lg">
                    <p className="text-caption font-bold text-reported-ink uppercase tracking-wider">
                      {t.devControlsTitle}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDevReply(c.id, "YES")}
                        className="rounded bg-fixed px-2.5 py-1 text-caption font-bold text-white hover:bg-fixed shadow-card transition-colors"
                      >
                        {t.devSimulateConfirm}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDevReply(c.id, "NO")}
                        className="rounded bg-danger px-2.5 py-1 text-caption font-bold text-white hover:bg-danger shadow-card transition-colors"
                      >
                        {t.devSimulateDecline}
                      </button>

                      {isPendingStatus && (
                        <button
                          type="button"
                          onClick={() => handleDevExpire(c.id)}
                          className="rounded bg-ink px-2.5 py-1 text-caption font-bold text-white hover:bg-ink shadow-card transition-colors"
                        >
                          {t.devSimulateExpire}
                        </button>
                      )}

                      {c.status !== "LEFT" && (
                        <button
                          type="button"
                          onClick={() => handleDevLeave(c.id)}
                          className="rounded bg-ink px-2.5 py-1 text-caption font-bold text-white hover:bg-ink shadow-card transition-colors"
                        >
                          {locale === "km" ? "ក្លែងបន្លំចាកចេញ" : "Simulate Leave (LEFT)"}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {/* Message Preview Box */}
      <Section title={t.messagePreviewTitle} hint={t.messagePreviewHint} className="mt-8">
        <Card className="bg-sand/60 p-4 border border-line">
          <div className="space-y-3 font-mono text-meta">
            <div className="rounded-xl bg-surface p-3 shadow-card ring-1 ring-line">
              <span className="block text-caption font-bold text-primary mb-1">
                [1] Invite SMS ({t.contactStatusPENDING})
              </span>
              <p className="text-ink">
                &ldquo;[Smart Phnom Penh] {user.fullName} added you as an emergency contact. Reply YES to confirm. (Expires in 7 days)&rdquo;
              </p>
            </div>

            <div className="rounded-xl bg-surface p-3 shadow-card ring-1 ring-line">
              <span className="block text-caption font-bold text-danger mb-1">
                [2] Emergency SOS Alert ({t.contactStatusCONFIRMED})
              </span>
              <p className="text-ink">
                &ldquo;SOS from {user.fullName}. Location: https://maps.google.com/?q=11.5564,104.9282&rdquo;
              </p>
            </div>
          </div>
        </Card>
      </Section>

      {/* Add / Edit Contact Modal Sheet */}
      {isAddOpen && (
        <Sheet
          title={editingContact ? t.editContact : t.addContact}
          onClose={() => setIsAddOpen(false)}
        >
          <form onSubmit={handleSaveContact} className="space-y-4">
            {formError && (
              <div className="rounded-xl bg-danger/10 p-3 text-body text-danger">
                {formError}
              </div>
            )}

            <TextField
              label={t.contactName}
              placeholder="e.g. Sok Piseth"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {!editingContact && (
              <TextField
                label={t.contactPhone}
                placeholder="012 345 678 or +855 12 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hint={t.contactPhoneHint}
                required
              />
            )}

            <SelectField
              label={t.contactRelation}
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
            >
              <option value="Family">Family / គ្រួសារ</option>
              <option value="Parent">Parent / ឪពុកម្តាយ</option>
              <option value="Spouse">Spouse / ប្តី-ប្រពន្ធ</option>
              <option value="Sibling">Sibling / បងប្អូន</option>
              <option value="Friend">Friend / មិត្តភក្តិ</option>
              <option value="Colleague">Colleague / រួមការងារ</option>
              <option value="Other">Other / ផ្សេងៗ</option>
            </SelectField>

            <SelectField
              label={t.contactPriority}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={1}>#1 (Highest priority / អាទិភាពខ្ពស់បំផុត)</option>
              <option value={2}>#2</option>
              <option value={3}>#3</option>
              <option value={4}>#4</option>
              <option value={5}>#5</option>
            </SelectField>

            <div className="rounded-xl border border-line bg-surface p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareMedical}
                  onChange={(e) => setShareMedical(e.target.checked)}
                  className="mt-1 size-4 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="block text-body font-bold text-ink">
                    {t.shareMedicalInfo}
                  </span>
                  <span className="block text-meta text-ink-muted">
                    {t.shareMedicalInfoHint}
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddOpen(false)}
              >
                {t.close}
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? t.submitting : editingContact ? t.editContact : t.addContact}
              </Button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Send Test Alert Modal */}
      {isTestAlertOpen && (
        <Sheet
          title={t.sendTestAlertConfirmTitle}
          onClose={() => setIsTestAlertOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-body text-ink">
              {t.sendTestAlertConfirmBody}
            </p>

            <div className="rounded-xl bg-reported-tint p-3 text-reported-ink ring-1 ring-reported/30">
              <p className="text-meta font-medium">
                {locale === "km"
                  ? `នឹងផ្ញើទៅកាន់ទំនាក់ទំនង ${confirmedContacts.length} នាក់ដែលបានបញ្ជាក់។`
                  : `Will be delivered to ${confirmedContacts.length} confirmed contact(s).`}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsTestAlertOpen(false)}
              >
                {t.close}
              </Button>
              <Button
                variant="primary"
                onClick={handleSendTestAlert}
                disabled={isPending}
                className="gap-2"
              >
                <Send size={16} />
                <span>{isPending ? t.submitting : t.sendTestAlertBtn}</span>
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
