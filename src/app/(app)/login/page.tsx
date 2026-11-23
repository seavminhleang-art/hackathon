"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Shield, User as UserIcon, Building2, Siren, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, PageHeader, TextField } from "@/components/ui";
import { DEMO_PASSWORD } from "@/lib/mock/data";

function LoginForm() {
  const { t } = useLocale();
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/me";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (loginPhone: string, loginPass: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await login({ phone: loginPhone, password: loginPass });
        router.push(nextUrl);
      } catch (err: any) {
        setError(err?.message || t.errLogin);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError(t.errLogin);
      return;
    }
    handleLogin(phone, password);
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-md py-8">
        <PageHeader title={t.login} back="/" />

        {user && (
          <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
            <p className="font-semibold">
              ✓ Logged in as: {user.fullName} ({user.role})
            </p>
            <Link
              href={nextUrl}
              className="mt-2 inline-block font-bold text-primary hover:underline"
            >
              Continue to {nextUrl} →
            </Link>
          </div>
        )}

        {/* Quick 1-Click Demo Accounts (Dev-Only) */}
        <Card className="mb-6 p-5 border-2 border-amber-200 bg-amber-50/20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-row font-bold text-ink">
              {t.quickDemoLogin}
            </h2>
            <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-caption font-bold border border-amber-300">
              DEV-ONLY / សម្រាប់តែអ្នកអភិវឌ្ឍន៍
            </span>
          </div>
          <p className="mb-4 text-meta text-ink-muted">
            ⚠️ {t.devOnlyBanner}: Click any account below to sign in instantly (password: {DEMO_PASSWORD})
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleLogin("012000001", DEMO_PASSWORD)}
              className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-primary-tint"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-tint text-primary">
                  <UserIcon size={18} />
                </span>
                <div>
                  <span className="block font-bold text-ink">{t.demoCitizen}</span>
                  <span className="block text-caption text-ink-muted">Boeng Kak 2, Tuol Kouk</span>
                </div>
              </div>
              <span className="text-meta font-bold text-primary">Sign In →</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleLogin("012000003", DEMO_PASSWORD)}
              className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-primary-tint"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-gold/20 text-ink">
                  <Shield size={18} />
                </span>
                <div>
                  <span className="block font-bold text-ink">{t.demoAdmin}</span>
                  <span className="block text-caption text-ink-muted">Super Admin</span>
                </div>
              </div>
              <span className="text-meta font-bold text-primary">Sign In →</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleLogin("012000010", DEMO_PASSWORD)}
              className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-primary-tint"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-danger-tint text-danger">
                  <Siren size={18} />
                </span>
                <div>
                  <span className="block font-bold text-ink">{t.demoPolice}</span>
                  <span className="block text-caption text-ink-muted">Phnom Penh Police Org</span>
                </div>
              </div>
              <span className="text-meta font-bold text-primary">Sign In →</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleLogin("012000014", DEMO_PASSWORD)}
              className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-primary-tint"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-danger-tint text-danger">
                  <Siren size={18} />
                </span>
                <div>
                  <span className="block font-bold text-ink">{t.demoAmbulance}</span>
                  <span className="block text-caption text-ink-muted">119 Dispatch</span>
                </div>
              </div>
              <span className="text-meta font-bold text-primary">Sign In →</span>
            </button>
          </div>
        </Card>

        {/* Standard Form */}
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl bg-danger/10 p-3 text-meta font-medium text-danger">
                {error}
              </div>
            )}

            <TextField
              label={t.contactPhone}
              placeholder="012000001"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
            />

            <TextField
              type="password"
              label={t.passwordLabel}
              placeholder="demo1234"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
            />

            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="mt-2"
            >
              <LogIn size={18} />
              {isPending ? t.submitting : t.login}
            </Button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageContainer><div className="py-12 text-center text-ink-muted">Loading...</div></PageContainer>}>
      <LoginForm />
    </Suspense>
  );
}
