"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, HeartHandshake, Landmark, LockKeyhole, ShieldCheck, type LucideIcon } from "lucide-react";
import { toast } from "react-toastify";
import { z } from "zod";
import { LanguageToggle } from "@/components/layout/AppShell";
import { Button, Card, SelectField, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { City, Province } from "@/types";

function postLoginPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const { login, register, user, ready } = useAuth();
  const { t, tx, locale } = useLocale();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(postLoginPath());
  }, [ready, user, router]);

  useEffect(() => {
    if (!isRegister) return;
    let alive = true;
    api.getProvinces().then((rows) => alive && setProvinces(rows));
    return () => { alive = false; };
  }, [isRegister]);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      setCityId("");
      return;
    }
    let alive = true;
    api.getCities(provinceId).then((rows) => alive && setCities(rows));
    return () => { alive = false; };
  }, [provinceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phoneSchema = z.string().trim().refine((value) => api.normalizePhone(value) !== null, t.authPhoneInvalid);
    const passwordSchema = z.string().min(6, t.authPasswordShort);
    let execute: () => Promise<void>;

    if (isRegister) {
      const parsed = z.object({
          fullName: z.string().trim().min(2, t.authNameRequired),
          phone: phoneSchema,
          email: z.string().trim().refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), t.authEmailInvalid),
          password: passwordSchema,
          confirmPassword: z.string(),
          provinceId: z.string().min(1, t.authChooseLocation),
          cityId: z.string().min(1, t.authChooseLocation),
        }).superRefine((value, context) => {
          if (value.password !== value.confirmPassword) {
            context.addIssue({ code: "custom", path: ["confirmPassword"], message: t.authPasswordMismatch });
          }
        }).safeParse({ fullName, phone, email, password, confirmPassword, provinceId, cityId });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? t.errGeneric);
        return;
      }
      execute = async () => {
        await register({ ...parsed.data, preferredLocale: locale });
        toast.success(t.authRegisterSuccess);
      };
    } else {
      const parsed = z.object({ phone: phoneSchema, password: passwordSchema }).safeParse({ phone, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? t.errGeneric);
        return;
      }
      execute = async () => {
        await login(parsed.data, postLoginPath());
        toast.success(t.authLoginSuccess);
      };
    }

    setBusy(true);
    try {
      await execute();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "CONFLICT") toast.error(t.authPhoneTaken);
      else if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") toast.error(t.errLogin);
      else if (cause instanceof ApiError && cause.code === "VALIDATION" && ["provinceId", "cityId"].includes(cause.field ?? "")) toast.error(t.authChooseLocation);
      else toast.error(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  const benefits: [LucideIcon, string][] = [
    [Landmark, t.reportProblem],
    [Building2, t.tileServices],
    [ShieldCheck, t.tileEmergency],
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5" aria-label={t.appName}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-meta font-extrabold text-white">CV</span>
            <span><b className="block text-row leading-tight text-ink">{t.appName}</b><span className="text-caption text-ink-muted">{t.appTagline}</span></span>
          </Link>
          <LanguageToggle compact />
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-14 lg:px-10 lg:py-12">
        <section className="rounded-3xl bg-primary p-6 text-white shadow-raised sm:p-8 lg:p-10">
          <span className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-white/15"><HeartHandshake aria-hidden size={30} /></span>
          <h1 className="max-w-xl text-page leading-tight font-bold sm:text-display">{t.authWelcome}</h1>
          <p className="mt-3 max-w-lg text-body leading-relaxed text-white/80">{isRegister ? t.authRegisterHint : t.authLoginHint}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {benefits.map(([Icon, label]) => (
              <div key={label} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/10 px-4">
                <Icon aria-hidden size={20} className="text-gold" />
                <span className="text-meta font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <Card className="mx-auto w-full max-w-xl border border-line p-5 sm:p-8 lg:p-9">
          <div className="mb-6">
            <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary-tint text-primary"><LockKeyhole aria-hidden size={22} /></span>
            <h2 className="text-page font-bold text-ink">{isRegister ? t.authCreateAccount : t.login}</h2>
            <p className="mt-1 text-meta text-ink-muted">{isRegister ? t.authRegisterHint : t.authLoginHint}</p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            {isRegister && <TextField label={t.authFullName} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />}
            <TextField label={t.authPhone} type="tel" inputMode="tel" autoComplete="tel" placeholder="012 345 678" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            {isRegister && <TextField label={t.authEmail} type="email" autoComplete="email" optional={t.optional} value={email} onChange={(event) => setEmail(event.target.value)} />}
            <TextField label={t.authPassword} type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
            {isRegister && <TextField label={t.authConfirmPassword} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />}
            {isRegister && (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label={t.province} value={provinceId} onChange={(event) => { setProvinceId(event.target.value); setCityId(""); }} required>
                  <option value="">{t.province}</option>
                  {provinces.map((province) => <option key={province.id} value={province.id}>{tx(province.name)}</option>)}
                </SelectField>
                <SelectField label={t.city} value={cityId} onChange={(event) => setCityId(event.target.value)} disabled={!provinceId} required>
                  <option value="">{t.city}</option>
                  {cities.map((city) => <option key={city.id} value={city.id}>{tx(city.name)}</option>)}
                </SelectField>
              </div>
            )}
            <Button type="submit" size="lg" block disabled={busy} trailingIcon={ArrowRight}>
              {busy ? t.submitting : isRegister ? t.authCreateAccount : t.login}
            </Button>
          </form>

          <p className="mt-6 text-center text-meta text-ink-muted">
            {isRegister ? t.authHasAccount : t.authNoAccount}{" "}
            <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-primary hover:underline">
              {isRegister ? t.login : t.register}
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
