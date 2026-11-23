"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Bell, Check, ChevronRight, CreditCard, LockKeyhole, MapPin, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { PageContainer } from "@/components/layout/AppShell";
import { EmergencyProfileCard } from "@/features/emergency/EmergencyProfileCard";
import { Button, Card, PageSkeleton, SelectField, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useGuestRedirect } from "@/lib/auth/useRequireAuth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AppNotification, City, Province } from "@/types";
import type { ProfileUpdate } from "@/lib/api/mock-api";

type Tab = "account" | "notifications" | "bills" | "password";

export function ProfileScreen() {
  const { user, ready, updateProfile } = useAuth();
  useGuestRedirect();
  const { t, tx, locale, setLocale } = useLocale();
  const [tab, setTab] = useState<Tab>("account");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [sangkat, setSangkat] = useState("");
  const [preferredLocale, setPreferredLocale] = useState<"km" | "en">(locale);

  useEffect(() => {
    api.getProvinces().then(setProvinces);
  }, []);

  // Fill the form once per signed-in user (React's "adjust state when a prop changes" pattern).
  const [filledFor, setFilledFor] = useState<string | null>(null);
  if (user && filledFor !== user.id) {
    setFilledFor(user.id);
    setFullName(user.fullName);
    setPhone(user.phone ?? "");
    setEmail(user.email ?? "");
    setProvinceId(user.provinceId);
    setCityId(user.cityId);
    setSangkat(user.sangkat ?? "");
    setPreferredLocale(user.preferredLocale);
  }

  useEffect(() => {
    if (!user) return;
    api.getCities(user.provinceId).then(setCities);
  }, [user]);

  useEffect(() => {
    if (!ready || tab !== "notifications" || !user) return;
    api.myNotifications().then(setNotifications).catch(() => setNotifications([]));
  }, [ready, tab, user]);


  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!provinceId || !cityId) return;
    setBusy(true);
    try {
      const input: ProfileUpdate = { fullName, phone, email: email || undefined, provinceId, cityId, sangkat: sangkat || undefined, preferredLocale };
      await updateProfile(input);
      setLocale(preferredLocale);
      toast.success(t.profileSaved);
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFLICT") toast.error(t.authPhoneTaken);
      else if (error instanceof ApiError && error.code === "VALIDATION") toast.error(error.message);
      else toast.error(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return <PageSkeleton rows={3} />;
  const roleLabel = user.role === "CITIZEN" ? t.roleCITIZEN : user.role === "OFFICER" ? t.roleOFFICER : user.role;
  const province = provinces.find((item) => item.id === user.provinceId);
  const city = cities.find((item) => item.id === user.cityId);

  return <PageContainer className="max-w-5xl pb-10">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div><h2 className="text-title font-bold leading-tight">{t.profileTitle}</h2><p className="mt-1 text-meta text-ink-muted">{t.profileHint}</p></div>
      <div className="flex items-center gap-1 text-caption text-ink-muted"><Link href="/" className="text-primary-ink hover:underline">{t.navHome}</Link><ChevronRight aria-hidden size={14} /><span>{t.profileTitle}</span></div>
    </div>

    <div className="mb-4 flex gap-2 overflow-x-auto border-b border-line" role="tablist" aria-label={t.profileTitle}>
      <ProfileTab active={tab === "account"} onClick={() => setTab("account")} icon={UserRound}>{t.profileAccountTab}</ProfileTab>
      <ProfileTab active={tab === "notifications"} onClick={() => setTab("notifications")} icon={Bell}>{t.notifications}</ProfileTab>
      <ProfileTab active={tab === "bills"} onClick={() => setTab("bills")} icon={CreditCard}>{t.profileBillsTab}</ProfileTab>
      <ProfileTab active={tab === "password"} onClick={() => setTab("password")} icon={LockKeyhole}>{t.profilePasswordTab}</ProfileTab>
    </div>

    <div className="relative mb-4 h-28 overflow-hidden rounded-2xl bg-linear-to-r from-primary-tint via-primary-tint to-primary/20 sm:h-36">
      <span className="absolute -bottom-10 left-8 h-24 w-24 rounded-t-2xl bg-surface/35" /><span className="absolute -bottom-8 left-36 h-20 w-20 rounded-t-2xl bg-surface/35" /><span className="absolute -bottom-12 left-64 h-28 w-28 rounded-t-2xl bg-surface/35" /><span className="absolute -bottom-10 right-10 h-24 w-24 rounded-t-2xl bg-surface/35" />
    </div>

    <div className="mb-5 flex items-center gap-3 px-2">
      <span className="flex size-16 items-center justify-center rounded-full border-4 border-surface bg-primary text-title font-bold text-white shadow-card">{user.fullName.trim().slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0"><h2 className="text-title font-bold text-ink">{user.fullName}</h2><p className="text-caption text-ink-muted">{user.phone}</p><span className="mt-1 inline-flex rounded-full bg-fixed-tint px-2.5 py-0.5 text-caption font-semibold text-fixed-ink">{roleLabel}</span></div>
    </div>

    {tab === "account" && <Card><div className="mb-5 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary-ink"><UserRound aria-hidden size={19} /></span><div><h2 className="text-title font-bold">{t.profilePersonalDetails}</h2><p className="text-caption text-ink-muted">{t.profileDetailsHint}</p></div></div>
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label={t.authFullName} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required minLength={2} />
          <TextField label={t.authPhone} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
          <TextField label={t.authEmail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" optional={t.optional} />
          <SelectField label={t.langSwitchShort === "EN" ? "Language" : "ភាសា"} value={preferredLocale} onChange={(event) => setPreferredLocale(event.target.value as "km" | "en")}><option value="km">ខ្មែរ</option><option value="en">English</option></SelectField>
          <SelectField label={t.province} value={provinceId} onChange={(event) => { setProvinceId(event.target.value); setCityId(""); api.getCities(event.target.value).then(setCities); }} required><option value="">{t.province}</option>{provinces.map((item) => <option key={item.id} value={item.id}>{tx(item.name)}</option>)}</SelectField>
          <SelectField label={t.city} value={cityId} onChange={(event) => setCityId(event.target.value)} required disabled={!provinceId}><option value="">{t.city}</option>{cities.map((item) => <option key={item.id} value={item.id}>{tx(item.name)}</option>)}</SelectField>
          <TextField label={t.profileSangkat} value={sangkat} onChange={(event) => setSangkat(event.target.value)} optional={t.optional} />
          <div className="flex items-end gap-2 text-meta text-ink-muted"><MapPin aria-hidden size={17} className="mb-3.5 text-primary-ink" />{[city && tx(city.name), province && tx(province.name)].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="secondary" onClick={() => { if (!user) return; setFullName(user.fullName); setPhone(user.phone ?? ""); setEmail(user.email ?? ""); setProvinceId(user.provinceId); setCityId(user.cityId); setSangkat(user.sangkat ?? ""); setPreferredLocale(user.preferredLocale); }}>{t.profileCancel}</Button><Button type="submit" loading={busy} disabled={busy || !provinceId || !cityId} icon={Check}>{busy ? t.submitting : t.profileSave}</Button></div>
      </form>
    </Card>}
    {tab === "account" && <EmergencyProfileCard />}

    {tab === "notifications" && <Card><h2 className="mb-3 text-title font-bold">{t.notifications}</h2>{notifications.length ? <ul className="divide-y divide-line">{notifications.map((item) => <li key={item.id} className="flex items-start gap-3 py-3"><span className={`mt-1 size-2.5 rounded-full ${item.read ? "bg-line-strong" : "bg-primary"}`} /><div className="min-w-0 flex-1"><p className="text-body font-semibold">{tx(item.message)}</p><p className="text-caption text-ink-muted">{new Date(item.createdAt).toLocaleDateString(locale === "km" ? "km-KH" : "en-US")}</p></div></li>)}</ul> : <p className="py-8 text-center text-meta text-ink-muted">{t.emptyActivityTitle}</p>}</Card>}
    {tab === "bills" && <Card><div className="flex flex-col items-center gap-2 py-10 text-center"><CreditCard aria-hidden size={28} className="text-ink-muted" /><h2 className="text-title font-bold">{t.profileBillsTab}</h2><p className="text-meta text-ink-muted">{t.profileBillsEmpty}</p></div></Card>}
    {tab === "password" && <Card><div className="flex flex-col items-center gap-2 py-10 text-center"><LockKeyhole aria-hidden size={28} className="text-ink-muted" /><h2 className="text-title font-bold">{t.profilePasswordTab}</h2><p className="text-meta text-ink-muted">{t.profilePasswordHint}</p></div></Card>}
  </PageContainer>;
}

function ProfileTab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof UserRound; children: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex min-h-11 flex-none items-center gap-2 border-b-2 px-3 text-meta font-semibold ${active ? "border-primary text-primary-ink" : "border-transparent text-ink-muted hover:text-ink"}`}><Icon aria-hidden size={16} />{children}</button>;
}
