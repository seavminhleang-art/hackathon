"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { ArrowLeft, Check, CircleAlert, Info, Landmark, Mail, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { toast } from "react-toastify";
import { Controller, useForm, useWatch, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, PasswordField, SelectField, Sheet, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { CodeSent } from "@/lib/api/mock-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt, type Dictionary } from "@/lib/i18n/dictionary";
import type { City, GoogleProfile, Province, RegisterInput } from "@/types";
import { loginSchema, registerSchema, toCodeDigits, type LoginValues, type RegisterValues } from "./schemas";

/**
 * Login / register.
 *
 * Login:    Google · email/phone/username + password · or a one-time code by email or Telegram.
 * Register: 1 account → 2 area → 3 confirm with a code by email or Telegram.
 *           Google sign-up skips the password and the code (Google already verified the email).
 *
 * Validation: React Hook Form + zod (`./schemas.ts`). Each step validates only its own fields
 * with `trigger([...], { shouldFocus: true })`. API errors land on the matching field via
 * `setError`; errors without a field (wrong password) show in one banner.
 * The mock API returns codes as `demoCode` (shown on screen) and offers sample Google accounts.
 */

const GOOGLE_HANDOFF = "cityvoice.googleSignup";

function postLoginPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

/** Turn an ApiError from the auth API into [form field, plain-words message]. */
function explain(cause: unknown, t: Dictionary): [string | undefined, string] {
  if (!(cause instanceof ApiError)) return [undefined, t.errGeneric];
  const conflict = cause.code === "CONFLICT";
  switch (cause.field) {
    case "username":
      return ["username", conflict ? t.authUsernameTaken : t.authUsernameChars];
    case "email":
      return ["email", conflict ? t.authEmailTaken : t.authEmailRequired];
    case "phone":
      return ["phone", conflict ? t.authPhoneTaken : t.authPhoneInvalid];
    case "password":
      return ["password", t.authPasswordShort8];
    case "firstName":
      return ["firstName", t.authFirstNameRequired];
    case "lastName":
      return ["lastName", t.authLastNameRequired];
    case "provinceId":
    case "cityId":
      return ["cityId", t.authChooseLocation];
    case "channel":
      return ["channel", t.authTelegramNoPhone];
    case "identifier":
      return ["identifier", t.authNoAccountIdentifier];
    case "code":
      if (cause.code === "LIMIT") return ["code", t.authCodeTooMany];
      return ["code", cause.message.toLowerCase().includes("expired") ? t.authCodeExpired : t.authCodeWrong];
  }
  if (cause.code === "UNAUTHORIZED") return [undefined, t.authWrongCredentials];
  return [undefined, t.errGeneric];
}

/** Shared async runner: busy flag, field errors via setError, other errors in a banner. */
function useSubmit<T extends FieldValues>(form: UseFormReturn<T>, beforeFieldError?: (field: string) => void) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  async function run(f: () => Promise<void>) {
    setBusy(true);
    setBanner(null);
    try {
      await f();
    } catch (cause) {
      const [field, message] = explain(cause, t);
      if (!field) return setBanner(message);
      beforeFieldError?.(field);
      form.setError(field as FieldPath<T>, { type: "server", message });
      // The field may only mount after a step change, so focus on the next frame.
      requestAnimationFrame(() => form.setFocus(field as FieldPath<T>));
    } finally {
      setBusy(false);
    }
  }
  return { busy, banner, setBanner, run };
}

/** Code sent + resend countdown. */
function useCodeSent() {
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [resendLeft, setResendLeft] = useState(0);
  useEffect(() => {
    if (!sent) return;
    const timer = window.setInterval(() => setResendLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [sent]);
  return {
    sent,
    resendLeft,
    clear: () => setSent(null),
    got: (s: CodeSent) => {
      setSent(s);
      setResendLeft(s.resendInSec);
    },
  };
}

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { loginWithGoogle, user, ready } = useAuth();
  const { t } = useLocale();
  const [chooser, setChooser] = useState(false);
  const [google, setGoogle] = useState<GoogleProfile | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(postLoginPath());
  }, [ready, user, router]);

  // A Google sign-in from the login page with a new email hands the profile over to /register.
  useEffect(() => {
    if (mode !== "register") return;
    const timer = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(GOOGLE_HANDOFF);
        if (!raw) return;
        sessionStorage.removeItem(GOOGLE_HANDOFF);
        setGoogle(JSON.parse(raw) as GoogleProfile);
      } catch {
        /* storage blocked: the user can press the Google button again */
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [mode]);

  async function chooseGoogle(profile: GoogleProfile) {
    setChooser(false);
    try {
      await loginWithGoogle(profile, postLoginPath());
      toast.success(t.authLoginSuccess);
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.code === "NOT_FOUND")) return toast.error(t.errGeneric);
      if (mode === "register") return setGoogle(profile);
      try {
        sessionStorage.setItem(GOOGLE_HANDOFF, JSON.stringify(profile));
      } catch {
        /* ignore */
      }
      router.push("/register");
    }
  }

  return (
    <div className="min-h-dvh bg-sand lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <PromisePanel />

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:justify-end lg:py-6">
          <span className="lg:hidden">
            <Brand />
          </span>
          <LangSwitch />
        </header>
        <main className="flex flex-1 justify-center px-5 pt-4 pb-12 sm:px-8 lg:items-center">
          <div className="w-full max-w-md lg:rounded-2xl lg:bg-surface lg:p-9 lg:shadow-card">
            {mode === "login" ? (
              <LoginFlow onGoogle={() => setChooser(true)} />
            ) : (
              <RegisterFlow google={google} onGoogle={() => setChooser(true)} />
            )}
          </div>
        </main>
      </div>

      {chooser && (
        <Sheet title={t.authGoogleChoose} icon={<GoogleMark />} onClose={() => setChooser(false)}>
          <p className="text-meta text-ink-muted">{t.authGoogleDemo}</p>
          <ul className="flex flex-col gap-2">
            {api.DEMO_GOOGLE_ACCOUNTS.map((g) => (
              <li key={g.email}>
                <button
                  type="button"
                  onClick={() => chooseGoogle(g)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-surface px-4 text-left ring-1 ring-line-strong ring-inset hover:bg-primary-tint"
                >
                  <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-full bg-primary-tint text-body font-bold text-primary-ink">
                    {g.firstName.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-ink">
                      {g.lastName} {g.firstName}
                    </span>
                    <span className="block truncate text-meta text-ink-muted">{g.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
}

// ---------- login ----------

type LoginStage = "password" | "codeRequest" | "codeEnter";

function LoginFlow({ onGoogle }: { onGoogle: () => void }) {
  const { t } = useLocale();
  const { login, loginWithCode } = useAuth();
  const [stage, setStage] = useState<LoginStage>("password");
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: { identifier: "", password: "", channel: "EMAIL", code: "" },
    mode: "onTouched",
  });
  const { register, control, trigger, getValues, clearErrors, formState } = form;
  const { busy, banner, setBanner, run } = useSubmit(form);
  const code = useCodeSent();
  const id = (f: string) => `login-${f}`;

  const go = (next: LoginStage) => {
    clearErrors();
    setBanner(null);
    setStage(next);
  };
  const sendCode = () =>
    run(async () => {
      const { identifier, channel } = getValues();
      code.got(await api.requestLoginCode(identifier.trim(), channel));
      form.setValue("code", "");
      go("codeEnter");
    });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const fields = stage === "password" ? (["identifier", "password"] as const) : stage === "codeRequest" ? (["identifier", "channel"] as const) : (["code"] as const);
    if (!(await trigger(fields, { shouldFocus: true }))) return;
    const v = getValues();
    if (stage === "codeRequest") return sendCode();
    await run(async () => {
      if (stage === "password") await login({ identifier: v.identifier.trim(), password: v.password }, postLoginPath());
      else await loginWithCode(v.identifier.trim(), v.code, postLoginPath());
      toast.success(t.authLoginSuccess);
    });
  }

  const err = formState.errors;
  const identifierField = (
    <TextField
      id={id("identifier")}
      label={t.authIdentifier}
      autoComplete="username"
      inputMode="email"
      autoCapitalize="none"
      spellCheck={false}
      error={err.identifier?.message}
      {...register("identifier")}
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {stage === "password" && (
        <>
          <Heading title={t.login} />
          <GoogleButton label={t.authGoogle} onClick={onGoogle} />
          <Divider label={t.authOr} />
          <Banner text={banner} />
          {identifierField}
          <div className="flex flex-col gap-1">
            <PasswordField id={id("password")} label={t.authPassword} autoComplete="current-password" error={err.password?.message} {...register("password")} />
            <TextButton className="self-end" onClick={() => go("codeRequest")}>
              {t.authForgot}
            </TextButton>
          </div>
          <Button type="submit" size="lg" block loading={busy}>
            {busy ? t.submitting : t.login}
          </Button>
          <SwitchLine lead={t.authNew} href="/register" label={t.authCreateAccount} />
        </>
      )}

      {stage === "codeRequest" && (
        <>
          <BackButton label={t.authBack} onClick={() => go("password")} />
          <Heading title={t.authCodeLoginTitle} lead={t.authCodeLoginLead} />
          <Banner text={banner} />
          {identifierField}
          <ChannelPicker id={id("channel")} telegram field={register("channel")} error={err.channel?.message} />
          <Button type="submit" size="lg" block loading={busy}>
            {busy ? t.submitting : t.authSendCode}
          </Button>
        </>
      )}

      {stage === "codeEnter" && (
        <>
          <BackButton label={t.authBack} onClick={() => go("codeRequest")} />
          <Heading title={t.authEnterCode} />
          <Banner text={banner} />
          <Controller
            control={control}
            name="code"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <CodeBlock id={id("code")} sent={code.sent} resendLeft={code.resendLeft} busy={busy} onResend={sendCode} field={{ value, onChange, onBlur }} error={fieldState.error?.message} />
            )}
          />
          <Button type="submit" size="lg" block loading={busy}>
            {busy ? t.submitting : t.login}
          </Button>
        </>
      )}
    </form>
  );
}

// ---------- register ----------

type RegisterStep = "account" | "area" | "verify";
const STEP_FIELDS = {
  account: ["username", "lastName", "firstName", "email", "phone", "password"],
  area: ["provinceId", "cityId"],
  verify: ["channel", "code"],
} as const satisfies Record<RegisterStep, readonly (keyof RegisterValues)[]>;

function stepOf(field: string): RegisterStep {
  return (Object.keys(STEP_FIELDS) as RegisterStep[]).find((s) => (STEP_FIELDS[s] as readonly string[]).includes(field)) ?? "verify";
}

function RegisterFlow({ google, onGoogle }: { google: GoogleProfile | null; onGoogle: () => void }) {
  const { t, tx, locale } = useLocale();
  const { register: signUp, registerWithCode } = useAuth();
  const [step, setStep] = useState<RegisterStep>("account");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema(t)),
    defaultValues: { provider: "PASSWORD", username: "", lastName: "", firstName: "", email: "", phone: "", password: "", provinceId: "", cityId: "", channel: "EMAIL", code: "" },
    mode: "onTouched",
  });
  const { register, control, trigger, getValues, setValue, clearErrors, formState } = form;
  const { busy, banner, setBanner, run } = useSubmit(form, (field) => setStep(stepOf(field)));
  const code = useCodeSent();
  const id = (f: string) => `register-${f}`;
  const [provinceId, phone, provider] = useWatch({ control, name: ["provinceId", "phone", "provider"] });
  const hasPhone = !!phone.trim();
  const isGoogle = provider === "GOOGLE";

  useEffect(() => {
    let alive = true;
    api.getProvinces().then((rows) => alive && setProvinces(rows));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!provinceId) return;
    let alive = true;
    api.getCities(provinceId).then((rows) => alive && setCities(rows));
    return () => {
      alive = false;
    };
  }, [provinceId]);

  // Google picked (here or handed over from /login): fill the form, skip password and code.
  useEffect(() => {
    if (!google) return;
    setValue("provider", "GOOGLE");
    setValue("firstName", google.firstName);
    setValue("lastName", google.lastName);
    setValue("email", google.email);
    if (!getValues("username")) setValue("username", google.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20));
    clearErrors();
  }, [google, setValue, getValues, clearErrors]);

  const input = (): RegisterInput => {
    const v = getValues();
    return {
      username: v.username.trim().toLowerCase(),
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim(),
      phone: v.phone.trim() || undefined,
      password: v.provider === "GOOGLE" ? undefined : v.password,
      provinceId: v.provinceId,
      cityId: v.cityId,
      preferredLocale: locale,
      provider: v.provider,
    };
  };

  const go = (next: RegisterStep) => {
    clearErrors();
    setBanner(null);
    setStep(next);
  };
  const sendCode = () =>
    run(async () => {
      code.got(await api.requestSignupCode(input(), getValues("channel")));
      setValue("code", "");
    });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step === "account") {
      if (!(await trigger(STEP_FIELDS.account, { shouldFocus: true }))) return;
      if (!hasPhone) setValue("channel", "EMAIL");
      return go("area");
    }
    if (step === "area") {
      if (!(await trigger(STEP_FIELDS.area, { shouldFocus: true }))) return;
      if (!isGoogle) return go("verify");
      return run(async () => {
        await signUp(input(), postLoginPath());
        toast.success(t.authRegisterSuccess);
      });
    }
    if (!code.sent) return sendCode();
    if (!(await trigger("code", { shouldFocus: true }))) return;
    await run(async () => {
      await registerWithCode({ ...input(), code: getValues("code") }, postLoginPath());
      toast.success(t.authRegisterSuccess);
    });
  }

  const err = formState.errors;
  const n = step === "account" ? 1 : step === "area" ? 2 : 3;
  const stepName = step === "account" ? t.authStepAccount : step === "area" ? t.authStepArea : t.authStepVerify;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {step !== "account" && (
        <BackButton
          label={t.authBack}
          onClick={() => {
            code.clear();
            go(step === "verify" ? "area" : "account");
          }}
        />
      )}
      <Progress step={n} label={`${fmt(t.authStepOf3, { n })} · ${stepName}`} />

      {step === "account" && (
        <>
          <Heading title={t.authCreateAccount} />
          {isGoogle ? (
            <p className="flex items-center gap-3 rounded-xl bg-primary-tint px-4 py-3 text-meta text-ink">
              <GoogleMark />
              {fmt(t.authGoogleAs, { email: getValues("email") })}
            </p>
          ) : (
            <>
              <GoogleButton label={t.authGoogleSignup} onClick={onGoogle} />
              <Divider label={t.authOr} />
            </>
          )}
          <Banner text={banner} />
          <TextField id={id("username")} label={t.authUsername} autoComplete="username" autoCapitalize="none" spellCheck={false} error={err.username?.message} {...register("username")} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id={id("lastName")} label={t.authLastName} autoComplete="family-name" error={err.lastName?.message} {...register("lastName")} />
            <TextField id={id("firstName")} label={t.authFirstName} autoComplete="given-name" error={err.firstName?.message} {...register("firstName")} />
          </div>
          <TextField
            id={id("email")}
            label={t.authEmail}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            readOnly={isGoogle}
            error={err.email?.message}
            {...register("email")}
          />
          <TextField
            id={id("phone")}
            label={t.authPhone}
            optional={t.optional}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            prefix="+855"
            placeholder="012 345 678"
            error={err.phone?.message}
            {...register("phone")}
          />
          {!isGoogle && <PasswordField id={id("password")} label={t.authPassword} autoComplete="new-password" error={err.password?.message} {...register("password")} />}
          <Button type="submit" size="lg" block>
            {t.authContinue}
          </Button>
          <SwitchLine lead={t.authHasAccount} href="/login" label={t.login} />
        </>
      )}

      {step === "area" && (
        <>
          <Heading title={t.authWhereLive} />
          <Banner text={banner} />
          <SelectField id={id("provinceId")} label={t.province} error={err.provinceId?.message} {...register("provinceId", { onChange: () => setValue("cityId", "") })}>
            <option value="">{t.authChoose}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {tx(p.name)}
              </option>
            ))}
          </SelectField>
          <SelectField id={id("cityId")} label={t.city} disabled={!provinceId} error={err.cityId?.message} {...register("cityId")}>
            <option value="">{t.authChoose}</option>
            {(provinceId ? cities : []).map((c) => (
              <option key={c.id} value={c.id}>
                {tx(c.name)}
              </option>
            ))}
          </SelectField>
          <Button type="submit" size="lg" block loading={busy}>
            {busy ? t.submitting : isGoogle ? t.authCreateAccount : t.authContinue}
          </Button>
        </>
      )}

      {step === "verify" && (
        <>
          <Heading title={t.authVerifyTitle} lead={t.authVerifyLead} />
          <Banner text={banner} />
          <ChannelPicker id={id("channel")} telegram={hasPhone} field={register("channel")} error={err.channel?.message} />
          {code.sent && (
            <Controller
              control={control}
              name="code"
              render={({ field: { value, onChange, onBlur }, fieldState }) => (
                <CodeBlock id={id("code")} sent={code.sent} resendLeft={code.resendLeft} busy={busy} onResend={sendCode} field={{ value, onChange, onBlur }} error={fieldState.error?.message} />
              )}
            />
          )}
          <Button type="submit" size="lg" block loading={busy}>
            {busy ? t.submitting : code.sent ? t.authCreateAccount : t.authSendCode}
          </Button>
        </>
      )}
    </form>
  );
}

// ---------- pieces ----------

function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const { t } = useLocale();
  return (
    <Link href="/" className="flex min-h-11 items-center gap-3" aria-label={`${t.appName} · ${t.navHome}`}>
      <span
        aria-hidden
        className={`flex flex-none items-center justify-center rounded-full bg-primary font-bold text-white ring-gold ring-inset ${
          size === "lg" ? "size-16 text-page ring-4" : "size-10 text-row ring-[2.5px]"
        }`}
      >
        ស
      </span>
      <span className="flex flex-col">
        <span className={`font-bold text-ink ${size === "lg" ? "text-title" : "text-row"}`}>{t.appName}</span>
        <span className={size === "lg" ? "text-body text-ink-muted" : "text-caption text-ink-muted"}>{t.authTagline}</span>
      </span>
    </Link>
  );
}

/** Desktop left panel: who we are and three promises. */
function PromisePanel() {
  const { t } = useLocale();
  const promises: [LucideIcon, string, string][] = [
    [ShieldCheck, t.authPromise1Title, t.authPromise1Body],
    [Landmark, t.authPromise2Title, t.authPromise2Body],
    [Check, t.authPromise3Title, t.authPromise3Body],
  ];
  return (
    <aside className="hidden flex-col justify-center gap-10 border-r border-line bg-surface px-16 py-16 lg:sticky lg:top-0 lg:flex lg:h-dvh xl:px-24">
      <Brand size="lg" />
      <p className="max-w-xl text-display font-bold text-balance text-ink">{t.authPanelTitle}</p>
      <ul className="flex max-w-lg flex-col gap-6">
        {promises.map(([Icon, title, text]) => (
          <li key={title} className="flex items-start gap-4">
            <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-primary-tint text-primary-ink">
              <Icon aria-hidden size={24} />
            </span>
            <span>
              <span className="block text-row font-semibold text-ink">{title}</span>
              <span className="block text-body text-ink-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Two-option language switch: both languages visible, the current one highlighted. */
function LangSwitch() {
  const { locale, setLocale } = useLocale();
  const options = [
    ["km", "ខ្មែរ"],
    ["en", "EN"],
  ] as const;
  return (
    <div role="group" aria-label="Language / ភាសា" className="flex rounded-full bg-sand-deep p-1">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          className="min-h-9 min-w-12 rounded-full px-3 text-meta font-semibold text-ink-muted aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-card"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Banner({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger-tint px-4 py-3 text-meta font-medium text-danger-ink">
      <CircleAlert aria-hidden size={20} className="mt-0.5 flex-none text-danger" />
      <span>{text}</span>
    </div>
  );
}

/** Google's "G", in its four brand colours (Google's sign-in branding requires them). */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 flex-none">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-surface px-5 text-body font-semibold text-ink ring-1 ring-line-strong ring-inset hover:bg-sand"
    >
      <GoogleMark />
      {label}
    </button>
  );
}

/** Email / Telegram radio cards, registered with React Hook Form. */
function ChannelPicker({ id, telegram, field, error }: { id: string; telegram: boolean; field: ComponentProps<"input">; error?: string }) {
  const { t } = useLocale();
  const options: [string, LucideIcon, string, string, boolean][] = [
    ["EMAIL", Mail, t.authViaEmail, t.authViaEmailDesc, false],
    ["TELEGRAM", Send, t.authViaTelegram, telegram ? t.authViaTelegramDesc : t.authViaTelegramNeedsPhone, !telegram],
  ];
  return (
    <fieldset id={id} className="flex flex-col gap-2">
      <legend className="mb-1.5 text-body font-semibold text-ink">{t.authSendVia}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map(([value, Icon, label, desc, disabled]) => (
          <label
            key={value}
            className={`flex min-h-16 items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-line-strong ring-inset has-checked:bg-primary-tint has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-3 has-focus-visible:outline-gold ${
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            <input type="radio" className="sr-only" value={value} disabled={disabled} {...field} />
            <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary-tint text-primary-ink">
              <Icon aria-hidden size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-ink">{label}</span>
              <span className="block text-meta text-ink-muted">{desc}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-meta font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

/** Value + handlers from a Controller (no ref: the input autofocuses itself). */
type CodeField = { value: string; onChange: (v: string) => void; onBlur: () => void };

/** "Code sent to …", the 6-box input, the demo code note and resend. */
function CodeBlock({
  id,
  sent,
  resendLeft,
  busy,
  onResend,
  field,
  error,
}: {
  id: string;
  sent: CodeSent | null;
  resendLeft: number;
  busy: boolean;
  onResend: () => void;
  field: CodeField;
  error?: string;
}) {
  const { t } = useLocale();
  if (!sent) return null;
  return (
    <>
      <p className="flex items-center gap-2 text-meta font-semibold text-fixed-ink" aria-live="polite">
        <Check aria-hidden size={18} />
        {fmt(t.authCodeSentVia, { to: sent.sentTo })}
      </p>
      <CodeInput id={id} label={t.authCodeLabel} field={field} error={error} />
      <p className="flex items-start gap-2 rounded-xl bg-gold-tint px-4 py-3 text-meta text-ink">
        <Info aria-hidden size={18} className="mt-0.5 flex-none text-gold-ink" />
        {fmt(t.authDemoCode, { code: sent.demoCode })}
      </p>
      {resendLeft > 0 ? (
        <p className="text-meta font-medium text-ink-muted">{fmt(t.authResendIn, { s: resendLeft })}</p>
      ) : (
        <TextButton className="self-start" disabled={busy} onClick={onResend}>
          {t.authResend}
        </TextButton>
      )}
    </>
  );
}

/**
 * One real input (so paste, one-time-code autofill and screen readers work), drawn as 6 boxes.
 * Khmer digits are converted.
 */
function CodeInput({ id, label, field, error }: { id: string; label: string; field: CodeField; error?: string }) {
  const [focused, setFocused] = useState(false);
  const value = field.value ?? "";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-msg` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            field.onBlur();
          }}
          onChange={(e) => field.onChange(toCodeDigits(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div aria-hidden className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => {
            const active = focused && (i === value.length || (value.length === 6 && i === 5));
            return (
              <span
                key={i}
                className={`flex h-15 items-center justify-center rounded-xl bg-surface text-title font-bold tabular-nums text-ink ring-inset ${
                  error ? "ring-2 ring-danger" : active ? "ring-2 ring-primary" : "ring-1 ring-line-strong"
                }`}
              >
                {value[i] ?? ""}
              </span>
            );
          })}
        </div>
      </div>
      {error && (
        <p id={`${id}-msg`} className="text-meta font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Heading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-page font-bold text-balance text-ink">{title}</h1>
      {lead && <p className="text-body text-ink-muted">{lead}</p>}
    </div>
  );
}

function Progress({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta font-semibold text-primary-ink">{label}</p>
      <div className="grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 rounded-full ${n <= step ? "bg-primary" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-ml-2 flex min-h-11 items-center gap-1.5 self-start rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
      <ArrowLeft aria-hidden size={20} />
      {label}
    </button>
  );
}

function TextButton({ className = "", ...rest }: ComponentProps<"button">) {
  return <button type="button" className={`-mx-2 min-h-11 rounded-lg px-2 text-meta font-bold text-primary-ink hover:bg-primary-tint disabled:opacity-50 ${className}`} {...rest} />;
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-meta font-medium text-ink-muted">
      <span className="h-px flex-1 bg-line-strong" />
      {label}
      <span className="h-px flex-1 bg-line-strong" />
    </div>
  );
}

function SwitchLine({ lead, href, label }: { lead: string; href: string; label: ReactNode }) {
  return (
    <p className="text-center text-meta text-ink-muted">
      {lead}{" "}
      <Link href={href} className="font-bold text-primary-ink underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}
