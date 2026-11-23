"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleHelp,
  Info,
  Landmark,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { toast } from "react-toastify";
import { z } from "zod";
import { LanguageToggle, useSos } from "@/components/layout/AppShell";
import { Button, PasswordField, SelectField, Sheet, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { CodeSent } from "@/lib/api/mock-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt, type Dictionary } from "@/lib/i18n/dictionary";
import type { City, CodeChannel, GoogleProfile, Province, RegisterInput } from "@/types";

/**
 * Login / register (visual direction A "City-hall counter", Figma row A).
 *
 * Login:    Google · email/phone/username + password · or a one-time code by email or Telegram.
 * Register: 1 account (username, last + first name, email, phone optional, password) →
 *           2 area → 3 confirm with a code by email or Telegram. Google sign-up skips the
 *           password and the code (Google already verified the email).
 *
 * Errors show under each field plus one summary (role=alert). The mock API returns codes as
 * `demoCode` (shown on screen) and offers sample Google accounts until real services exist.
 */

type Field =
  | "identifier"
  | "password"
  | "username"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "provinceId"
  | "cityId"
  | "channel"
  | "code";
type Errors = Partial<Record<Field, string>>;
type LoginStage = "password" | "codeRequest" | "codeEnter";
type RegisterStep = "account" | "area" | "verify";

const ACCOUNT_FIELDS: Field[] = ["username", "firstName", "lastName", "email", "phone", "password"];
const GOOGLE_HANDOFF = "cityvoice.googleSignup";

function postLoginPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

/** Turn an ApiError from the auth API into [field, plain-words message]. */
function explain(cause: unknown, t: Dictionary): [Field | undefined, string] {
  if (!(cause instanceof ApiError)) return [undefined, t.errGeneric];
  const conflict = cause.code === "CONFLICT";
  switch (cause.field) {
    case "username":
      return ["username", conflict ? t.authUsernameTaken : t.authUsernameRequired];
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

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  // Unique per page: Next keeps the previous route mounted (hidden), so login and register can coexist in the DOM.
  const id = (f: Field) => `${mode}-${f}`;
  const SUMMARY_ID = `${mode}-summary`;
  const router = useRouter();
  const { login, register, loginWithCode, registerWithCode, loginWithGoogle, user, ready } = useAuth();
  const { t, tx, locale } = useLocale();

  // login
  const [stage, setStage] = useState<LoginStage>("password");
  const [identifier, setIdentifier] = useState("");
  // register
  const [step, setStep] = useState<RegisterStep>("account");
  const [google, setGoogle] = useState<GoogleProfile | null>(null);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  // shared
  const [password, setPassword] = useState("");
  const [channel, setChannel] = useState<CodeChannel>("EMAIL");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [resendLeft, setResendLeft] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState<ReactNode>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<"google" | "help" | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(postLoginPath());
  }, [ready, user, router]);

  // A Google sign-in from the login page with a new email hands the profile over here.
  useEffect(() => {
    if (!isRegister) return;
    const timer = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(GOOGLE_HANDOFF);
        if (!raw) return;
        sessionStorage.removeItem(GOOGLE_HANDOFF);
        startGoogleSignup(JSON.parse(raw) as GoogleProfile);
      } catch {
        /* storage blocked: the user can press the Google button again */
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [isRegister]);

  useEffect(() => {
    if (!isRegister) return;
    let alive = true;
    api.getProvinces().then((rows) => alive && setProvinces(rows));
    return () => {
      alive = false;
    };
  }, [isRegister]);

  useEffect(() => {
    if (!provinceId) return; // city is reset in the province onChange
    let alive = true;
    api.getCities(provinceId).then((rows) => alive && setCities(rows));
    return () => {
      alive = false;
    };
  }, [provinceId]);

  useEffect(() => {
    if (!sent) return;
    const timer = window.setInterval(() => setResendLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [sent]);

  // ---------- helpers ----------

  function fail(next: Errors, message: ReactNode) {
    setErrors(next);
    setSummary(message);
    const first = (Object.keys(next) as Field[])[0];
    requestAnimationFrame(() => document.getElementById(first ? id(first) : SUMMARY_ID)?.focus());
  }
  function failFrom(cause: unknown) {
    const [field, message] = explain(cause, t);
    if (isRegister && field && ACCOUNT_FIELDS.includes(field)) setStep("account");
    if (isRegister && (field === "cityId" || field === "provinceId")) setStep("area");
    fail(field ? { [field]: message } : {}, message);
  }
  const reset = () => {
    setErrors({});
    setSummary(null);
  };
  const clear = (key: Field) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const issuesToErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
    issues.reduce<Errors>((acc, i) => {
      const key = i.path[0] as Field;
      if (key && !acc[key]) acc[key] = i.message;
      return acc;
    }, {});
  async function run(f: () => Promise<void>) {
    setBusy(true);
    try {
      await f();
    } catch (cause) {
      failFrom(cause);
    } finally {
      setBusy(false);
    }
  }
  function codeSent(s: CodeSent) {
    setSent(s);
    setResendLeft(s.resendInSec);
    setCode("");
  }

  const registerInput = (): RegisterInput => ({
    username: username.trim().toLowerCase(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: (google?.email ?? email).trim(),
    phone: phone.trim() || undefined,
    password: google ? undefined : password,
    provinceId,
    cityId,
    preferredLocale: locale,
    provider: google ? "GOOGLE" : "PASSWORD",
  });

  // ---------- Google (mock chooser) ----------

  function startGoogleSignup(profile: GoogleProfile) {
    setGoogle(profile);
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
    setUsername((u) => u || profile.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20));
    setStep("account");
    reset();
  }

  async function chooseGoogle(profile: GoogleProfile) {
    setSheet(null);
    setBusy(true);
    try {
      await loginWithGoogle(profile, postLoginPath());
      toast.success(t.authLoginSuccess);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "NOT_FOUND") {
        if (isRegister) startGoogleSignup(profile);
        else {
          try {
            sessionStorage.setItem(GOOGLE_HANDOFF, JSON.stringify(profile));
          } catch {
            /* ignore */
          }
          router.push("/register");
        }
      } else failFrom(cause);
    } finally {
      setBusy(false);
    }
  }

  // ---------- login handlers ----------

  const identifierSchema = z.string().trim().min(1, t.authIdentifierRequired);

  async function onPasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = z.object({ identifier: identifierSchema, password: z.string().min(1, t.authPasswordRequired) }).safeParse({ identifier, password });
    if (!parsed.success) return fail(issuesToErrors(parsed.error.issues), t.authErrorSummary);
    await run(async () => {
      await login(parsed.data, postLoginPath());
      toast.success(t.authLoginSuccess);
    });
  }

  async function onRequestLoginCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = z.object({ identifier: identifierSchema }).safeParse({ identifier });
    if (!parsed.success) return fail(issuesToErrors(parsed.error.issues), t.authErrorSummary);
    await run(async () => {
      codeSent(await api.requestLoginCode(identifier, channel));
      reset();
      setStage("codeEnter");
    });
  }

  async function onLoginCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return fail({ code: t.authCodeIncomplete }, t.authCodeIncomplete);
    await run(async () => {
      await loginWithCode(identifier, code, postLoginPath());
      toast.success(t.authLoginSuccess);
    });
  }

  // ---------- register handlers ----------

  function onAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = z
      .object({
        username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,20}$/, t.authUsernameRequired),
        lastName: z.string().trim().min(1, t.authLastNameRequired),
        firstName: z.string().trim().min(1, t.authFirstNameRequired),
        email: z.string().trim().email(t.authEmailRequired),
        phone: z.string().trim().refine((v) => !v || api.normalizePhone(v) !== null, t.authPhoneInvalid),
        password: google ? z.string() : z.string().min(8, t.authPasswordShort8),
      })
      .safeParse({ username, lastName, firstName, email: google?.email ?? email, phone, password });
    if (!parsed.success) return fail(issuesToErrors(parsed.error.issues), t.authErrorSummary);
    if (!phone.trim()) setChannel("EMAIL");
    reset();
    setStep("area");
  }

  async function onArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = z
      .object({ provinceId: z.string().min(1, t.authChooseLocation), cityId: z.string().min(1, t.authChooseLocation) })
      .safeParse({ provinceId, cityId });
    if (!parsed.success) return fail(issuesToErrors(parsed.error.issues), t.authErrorSummary);
    reset();
    if (google) {
      // Google verified the email already: create the account now.
      await run(async () => {
        await register(registerInput(), postLoginPath());
        toast.success(t.authRegisterSuccess);
      });
    } else setStep("verify");
  }

  async function onSendSignupCode() {
    await run(async () => {
      codeSent(await api.requestSignupCode(registerInput(), channel));
      reset();
    });
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sent) return onSendSignupCode();
    if (code.length !== 6) return fail({ code: t.authCodeIncomplete }, t.authCodeIncomplete);
    await run(async () => {
      await registerWithCode({ ...registerInput(), code }, postLoginPath());
      toast.success(t.authRegisterSuccess);
    });
  }

  // ---------- reusable form parts ----------

  const summaryBox = summary && (
    <div
      id={SUMMARY_ID}
      tabIndex={-1}
      role="alert"
      className="flex items-start gap-3 rounded-xl bg-danger-tint px-4 py-3 text-meta font-medium text-danger-ink outline-none"
    >
      <CircleAlert aria-hidden size={20} className="mt-0.5 flex-none text-danger" />
      <span>{summary}</span>
    </div>
  );

  const identifierField = (
    <TextField
      id={id("identifier")}
      label={t.authIdentifier}
      hint={t.authIdentifierHint}
      autoComplete="username"
      inputMode="email"
      autoCapitalize="none"
      spellCheck={false}
      placeholder="you@example.com · 012 345 678"
      value={identifier}
      error={errors.identifier}
      onChange={(e) => {
        setIdentifier(e.target.value);
        clear("identifier");
      }}
    />
  );

  const channelPicker = (telegramAvailable: boolean) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-body font-semibold text-ink">{t.authSendVia}</legend>
      <div className="grid gap-2 sm:grid-cols-2" id={id("channel")} tabIndex={-1}>
        <ChannelOption icon={Mail} label={t.authViaEmail} desc={t.authViaEmailDesc} checked={channel === "EMAIL"} onChange={() => setChannel("EMAIL")} />
        <ChannelOption
          icon={Send}
          label={t.authViaTelegram}
          desc={telegramAvailable ? t.authViaTelegramDesc : t.authViaTelegramNeedsPhone}
          checked={channel === "TELEGRAM"}
          disabled={!telegramAvailable}
          onChange={() => setChannel("TELEGRAM")}
        />
      </div>
      {errors.channel && <p className="text-meta font-medium text-danger">{errors.channel}</p>}
    </fieldset>
  );

  const codeBlock = (purpose: "LOGIN" | "SIGNUP") =>
    sent && (
      <>
        <p className="flex items-center gap-2 text-meta font-semibold text-fixed-ink" aria-live="polite">
          <Check aria-hidden size={18} />
          {fmt(t.authCodeSentVia, { to: sent.sentTo })}
        </p>
        <CodeInput
          id={id("code")}
          label={t.authCodeLabel}
          value={code}
          error={errors.code}
          onChange={(v) => {
            setCode(v);
            clear("code");
          }}
        />
        <p className="flex items-start gap-2 rounded-xl bg-gold-tint px-4 py-3 text-meta text-ink">
          <Info aria-hidden size={18} className="mt-0.5 flex-none text-gold-ink" />
          {fmt(t.authDemoCode, { code: sent.demoCode })}
        </p>
        {resendLeft > 0 ? (
          <p className="text-meta font-medium text-ink-muted">{fmt(t.authResendIn, { s: resendLeft })}</p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => codeSent(purpose === "LOGIN" ? await api.requestLoginCode(identifier, channel) : await api.requestSignupCode(registerInput(), channel)))
            }
            className="-ml-2 min-h-11 self-start rounded-lg px-2 text-meta font-bold text-primary hover:bg-primary-tint"
          >
            {t.authResend}
          </button>
        )}
      </>
    );

  // ---------- screens ----------

  let body: ReactNode;

  if (!isRegister && stage === "password") {
    body = (
      <form onSubmit={onPasswordLogin} noValidate className="flex flex-col gap-5">
        <Heading title={t.login} lead={t.authLoginLeadPw} />
        <GoogleButton label={t.authGoogle} onClick={() => setSheet("google")} disabled={busy} />
        <Divider label={t.authOr} />
        {summaryBox}
        {identifierField}
        <div className="flex flex-col gap-1">
          <PasswordField
            id={id("password")}
            label={t.authPassword}
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
          />
          <button
            type="button"
            onClick={() => {
              reset();
              setStage("codeRequest");
            }}
            className="-mr-2 min-h-11 self-end rounded-lg px-2 text-meta font-bold text-primary hover:bg-primary-tint"
          >
            {t.authForgot}
          </button>
        </div>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t.submitting : t.login}
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => {
            reset();
            setStage("codeRequest");
          }}
        >
          {t.authUseCodeInstead}
        </Button>
        <PrivacyPromise />
        <div className="flex flex-col gap-1">
          <SwitchLine lead={t.authNew} href="/register" label={t.authCreateAccount} />
          <HelpLine onClick={() => setSheet("help")} />
        </div>
      </form>
    );
  } else if (!isRegister && stage === "codeRequest") {
    body = (
      <form onSubmit={onRequestLoginCode} noValidate className="flex flex-col gap-5">
        <BackButton
          label={t.authBack}
          onClick={() => {
            reset();
            setStage("password");
          }}
        />
        <Heading title={t.authCodeLoginTitle} lead={t.authCodeLoginLead} />
        {summaryBox}
        {identifierField}
        {channelPicker(true)}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t.submitting : t.authSendCode}
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => {
            reset();
            setStage("password");
          }}
        >
          {t.authUsePasswordInstead}
        </Button>
        <PrivacyPromise />
      </form>
    );
  } else if (!isRegister) {
    body = (
      <form onSubmit={onLoginCode} noValidate className="flex flex-col gap-5">
        <BackButton
          label={t.authBack}
          onClick={() => {
            reset();
            setStage("codeRequest");
          }}
        />
        <Heading title={t.authEnterCode} />
        {summaryBox}
        {codeBlock("LOGIN")}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t.submitting : t.login}
        </Button>
        <PrivacyPromise />
      </form>
    );
  } else if (step === "account") {
    body = (
      <form onSubmit={onAccount} noValidate className="flex flex-col gap-5">
        <Progress step={1} label={`${fmt(t.authStepOf3, { n: 1 })} · ${t.authStepAccount}`} />
        <Heading title={t.authCreateAccount} />
        {google ? (
          <p className="flex items-center gap-3 rounded-xl bg-primary-tint px-4 py-3 text-meta text-ink">
            <GoogleMark />
            {fmt(t.authGoogleAs, { email: google.email })}
          </p>
        ) : (
          <>
            <GoogleButton label={t.authGoogleSignup} onClick={() => setSheet("google")} disabled={busy} />
            <Divider label={t.authOr} />
          </>
        )}
        {summaryBox}
        <TextField
          id={id("username")}
          label={t.authUsername}
          hint={t.authUsernameHint}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          error={errors.username}
          onChange={(e) => {
            setUsername(e.target.value);
            clear("username");
          }}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id={id("lastName")}
            label={t.authLastName}
            autoComplete="family-name"
            value={lastName}
            error={errors.lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clear("lastName");
            }}
          />
          <TextField
            id={id("firstName")}
            label={t.authFirstName}
            autoComplete="given-name"
            value={firstName}
            error={errors.firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clear("firstName");
            }}
          />
        </div>
        <TextField
          id={id("email")}
          label={t.authEmail}
          hint={t.authEmailHint}
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={!!google}
          value={google?.email ?? email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
        />
        <TextField
          id={id("phone")}
          label={t.authPhone}
          optional={t.optional}
          hint={t.authPhoneOptional}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          prefix="+855"
          placeholder="012 345 678"
          value={phone}
          error={errors.phone}
          onChange={(e) => {
            setPhone(e.target.value);
            clear("phone");
          }}
        />
        {!google && (
          <PasswordField
            id={id("password")}
            label={t.authPassword}
            hint={t.authPasswordHint8}
            autoComplete="new-password"
            value={password}
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
          />
        )}
        <Button type="submit" size="lg" block>
          {t.authContinue}
        </Button>
        <PrivacyPromise />
        <SwitchLine lead={t.authHasAccount} href="/login" label={t.login} />
      </form>
    );
  } else if (step === "area") {
    body = (
      <form onSubmit={onArea} noValidate className="flex flex-col gap-5">
        <BackButton
          label={t.authBack}
          onClick={() => {
            reset();
            setStep("account");
          }}
        />
        <Progress step={2} label={`${fmt(t.authStepOf3, { n: 2 })} · ${t.authStepArea}`} />
        <Heading title={t.authWhereLive} />
        <p className="flex items-start gap-3 rounded-2xl bg-primary-tint p-4 text-meta text-ink">
          <MapPin aria-hidden size={22} className="mt-0.5 flex-none text-primary" />
          {t.authAreaWhy}
        </p>
        {summaryBox}
        <SelectField
          id={id("provinceId")}
          label={t.province}
          value={provinceId}
          error={errors.provinceId}
          onChange={(e) => {
            setProvinceId(e.target.value);
            setCityId("");
            clear("provinceId");
          }}
        >
          <option value="">{t.authChoose}</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {tx(p.name)}
            </option>
          ))}
        </SelectField>
        <SelectField
          id={id("cityId")}
          label={t.city}
          value={cityId}
          disabled={!provinceId}
          hint={provinceId ? undefined : t.authChooseProvinceFirst}
          error={errors.cityId}
          onChange={(e) => {
            setCityId(e.target.value);
            clear("cityId");
          }}
        >
          <option value="">{t.authChoose}</option>
          {(provinceId ? cities : []).map((c) => (
            <option key={c.id} value={c.id}>
              {tx(c.name)}
            </option>
          ))}
        </SelectField>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t.submitting : google ? t.authCreateAccount : t.authContinue}
        </Button>
        <p className="flex items-center gap-2 text-meta text-ink-muted">
          <ShieldCheck aria-hidden size={18} className="flex-none text-fixed" />
          {t.authAreaLater}
        </p>
      </form>
    );
  } else {
    body = (
      <form onSubmit={onVerify} noValidate className="flex flex-col gap-5">
        <BackButton
          label={t.authBack}
          onClick={() => {
            reset();
            setSent(null);
            setStep("area");
          }}
        />
        <Progress step={3} label={`${fmt(t.authStepOf3, { n: 3 })} · ${t.authStepVerify}`} />
        <Heading title={t.authVerifyTitle} lead={t.authVerifyLead} />
        {summaryBox}
        {channelPicker(!!phone.trim())}
        {codeBlock("SIGNUP")}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t.submitting : sent ? t.authCreateAccount : t.authSendCode}
        </Button>
        <PrivacyPromise />
      </form>
    );
  }

  // ---------- layout ----------

  return (
    <div className="min-h-dvh bg-sand lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <PromisePanel />
      <div className="relative flex min-h-dvh flex-col lg:min-h-0">
        <MobileHeader />
        <CornerActions />
        <main className="flex flex-1 justify-center px-5 pt-7 pb-12 sm:px-8 lg:items-center lg:px-12 lg:py-16">
          <div className="w-full max-w-md lg:rounded-2xl lg:bg-surface lg:p-9 lg:shadow-card">{body}</div>
        </main>
      </div>

      {sheet === "google" && (
        <Sheet title={t.authGoogleChoose} icon={<GoogleMark />} onClose={() => setSheet(null)}>
          <p className="text-meta text-ink-muted">{t.authGoogleDemo}</p>
          <ul className="flex flex-col gap-2">
            {api.DEMO_GOOGLE_ACCOUNTS.map((g) => (
              <li key={g.email}>
                <button
                  type="button"
                  onClick={() => chooseGoogle(g)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-surface px-4 text-left ring-1 ring-line-strong ring-inset hover:bg-primary-tint"
                >
                  <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-full bg-primary-tint text-body font-bold text-primary">
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
      {sheet === "help" && (
        <Sheet title={t.authHelp} icon={<CircleHelp aria-hidden size={22} />} onClose={() => setSheet(null)}>
          <p className="text-body text-ink-muted">{t.authForgotBody}</p>
          <Button onClick={() => setSheet(null)} block>
            {t.authOk}
          </Button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- pieces ----------

/** Round flag-blue mark with a gold ring: the "official counter" signature. */
function Mark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center rounded-full bg-primary font-bold text-white ring-gold ring-inset ${
        size === "lg" ? "size-16 text-page ring-4" : "size-10 text-row ring-[2.5px]"
      }`}
    >
      ស
    </span>
  );
}

function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const { t } = useLocale();
  return (
    <Link href="/" className="flex min-h-11 items-center gap-3" aria-label={`${t.appName} · ${t.navHome}`}>
      <Mark size={size} />
      <span className="flex flex-col">
        <span className={`font-bold text-ink ${size === "lg" ? "text-title" : "text-row"}`}>{t.appName}</span>
        <span className={size === "lg" ? "text-body text-ink-muted" : "text-caption text-ink-muted"}>{t.authTagline}</span>
      </span>
    </Link>
  );
}

function SosButton() {
  const { openSos } = useSos();
  return (
    <button type="button" onClick={openSos} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-danger px-3.5 text-meta font-bold text-white hover:bg-danger-ink">
      <Siren aria-hidden size={18} />
      SOS
    </button>
  );
}

/** Phones: white header with brand, language and SOS (the app navbar is hidden on auth pages). */
function MobileHeader() {
  return (
    <header className="flex items-center gap-2 border-b border-line bg-surface py-2.5 pr-3 pl-5 lg:hidden">
      <div className="flex-1">
        <Brand />
      </div>
      <LanguageToggle compact />
      <SosButton />
    </header>
  );
}

function CornerActions() {
  return (
    <div className="absolute top-6 right-8 hidden items-center gap-2 lg:flex">
      <LanguageToggle compact />
      <SosButton />
    </div>
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
            <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-primary-tint text-primary">
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

function PrivacyPromise() {
  const { t } = useLocale();
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-fixed-tint p-4">
      <ShieldCheck aria-hidden size={22} className="mt-0.5 flex-none text-fixed" />
      <span>
        <span className="block text-meta font-semibold text-ink">{t.authPrivacyTitle}</span>
        <span className="block text-meta text-ink-muted">{t.authPrivacyBody}</span>
      </span>
    </div>
  );
}

function HelpLine({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <button type="button" onClick={onClick} className="-ml-2 flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-left text-meta font-medium text-ink-muted hover:bg-sand-deep hover:text-ink">
      <CircleHelp aria-hidden size={18} className="flex-none" />
      {t.authHelp}
    </button>
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

function GoogleButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-surface px-5 text-body font-semibold text-ink ring-1 ring-line-strong ring-inset hover:bg-sand disabled:opacity-50"
    >
      <GoogleMark />
      {label}
    </button>
  );
}

function ChannelOption({
  icon: Icon,
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex min-h-16 items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-line-strong ring-inset has-checked:bg-primary-tint has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-3 has-focus-visible:outline-gold ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input type="radio" name="code-channel" className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary-tint text-primary">
        <Icon aria-hidden size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-body font-semibold text-ink">{label}</span>
        <span className="block text-meta text-ink-muted">{desc}</span>
      </span>
    </label>
  );
}

/**
 * One real input (so paste, one-time-code autofill and screen readers work), drawn as 6 boxes.
 * Accepts Khmer digits and converts them.
 */
function CodeInput({ id: inputId, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-body font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-msg` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const latin = e.target.value.replace(/[០-៩]/g, (d) => String(d.charCodeAt(0) - 0x17e0));
            onChange(latin.replace(/\D/g, "").slice(0, 6));
          }}
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
        <p id={`${inputId}-msg`} className="text-meta font-medium text-danger">
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

function Progress({ step, label }: { step: 1 | 2 | 3; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta font-semibold text-primary">{label}</p>
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
    <p className="text-meta text-ink-muted">
      {lead}{" "}
      <Link href={href} className="font-bold text-primary underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}
