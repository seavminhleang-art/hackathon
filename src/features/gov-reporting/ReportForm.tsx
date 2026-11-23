"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, Check, ImagePlus, Info, LocateFixed, MapPin, Send, ShieldCheck, Siren, ThumbsUp } from "lucide-react";
import send from "react-useanimations/lib/send";
import { api } from "@/lib/api";
import { useGuestRedirect } from "@/lib/auth/useRequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fmt } from "@/lib/i18n/dictionary";
import { PageContainer, useSos } from "@/components/layout/AppShell";
import { PageSkeleton, Button, Card, ChoiceCard, IconTile, LinkButton, ListRow, PageHeader, SelectField, StatusChip, TextArea, TextField, buttonClass, type ChipStatus } from "@/components/ui";
import type { City, LatLng } from "@/types";
import type { GrCategory, GrCategoryMeta, GrDuplicateCandidate } from "@/types/gov-reporting";
import { CATEGORY_ICON, metres } from "./meta";

type Step = "form" | "duplicates";

/**
 * /report/new · one page: category → title & details → photos → location.
 * Before submitting, nearby similar reports are offered (support instead of duplicating).
 */
export function ReportForm() {
  const { t, tx } = useLocale();
  const { user } = useAuth();
  const redirecting = useGuestRedirect();
  const router = useRouter();
  const { openSos } = useSos();

  const [cats, setCats] = useState<GrCategoryMeta[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [category, setCategory] = useState<GrCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState(0);
  const [cityId, setCityId] = useState("");
  const [landmark, setLandmark] = useState("");
  const [gps, setGps] = useState<LatLng | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "busy" | "ok" | "failed">("idle");
  const [errors, setErrors] = useState<Partial<Record<"category" | "title" | "description" | "city", string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [dupes, setDupes] = useState<GrDuplicateCandidate[]>([]);
  const [supported, setSupported] = useState<string[]>([]);

  useEffect(() => {
    api.gr.listCategories().then(setCats);
  }, []);
  useEffect(() => {
    if (!user) return;
    api.getCities(user.provinceId).then(setCities);
  }, [user]);

  // Default to the user's khan until they pick one.
  const area = cityId || user?.cityId || "";
  const city = useMemo(() => cities.find((c) => c.id === area), [cities, area]);
  const location: LatLng | null = gps ?? city?.center ?? null;

  function useGps() {
    if (!navigator.geolocation) return setGpsState("failed");
    setGpsState("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState("ok");
      },
      () => setGpsState("failed"),
      { timeout: 8000 },
    );
  }

  function validate() {
    const e: typeof errors = {};
    if (!category) e.category = t.chooseOne;
    if (title.trim().length < 5) e.title = t.reportErrTitle;
    if (description.trim().length < 10) e.description = t.reportErrDesc;
    if (!area) e.city = t.reportArea;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate() || !category || !location) return;
    setBusy(true);
    try {
      const found = await api.gr.findPossibleDuplicates({ category, location, title, description });
      if (found.length) {
        setDupes(found);
        setStep("duplicates");
        window.scrollTo({ top: 0 });
      } else await submit();
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!category || !location || !user) return;
    setBusy(true);
    setApiError(null);
    try {
      const r = await api.gr.createReport({
        category,
        title,
        description,
        location,
        locationSource: gps ? "GPS" : "MAP",
        addressHint: landmark || undefined,
        provinceId: user.provinceId,
        cityId: area,
      });
      router.push(`/report/submitted?code=${encodeURIComponent(r.code)}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t.errGeneric);
      setStep("form");
      setBusy(false);
    }
  }

  if (redirecting) {
    return (
      <PageContainer className="max-w-3xl">
        <PageSkeleton rows={3} />
      </PageContainer>
    );
  }

  // ---------- Step 2: similar reports ----------
  if (step === "duplicates") {
    return (
      <PageContainer className="max-w-3xl">
        <button
          type="button"
          onClick={() => setStep("form")}
          className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink"
        >
          <ArrowLeft aria-hidden size={20} />
          {t.backAndEdit}
        </button>
        <PageHeader title={t.potentialMatches} subtitle={t.duplicateIntro} />
        <Card padded={false} as="ul">
          {dupes.map((d) => {
            const r = d.report;
            const done = supported.includes(r.id) || r.mySupport;
            return (
              <ListRow
                key={r.id}
                icon={CATEGORY_ICON[r.category]}
                accent="primary"
                href={`/reports/${r.code}`}
                title={r.title}
                subtitle={`${r.code} · ${metres(d.distanceM, t)} ${t.away}`}
                meta={
                  <>
                    <StatusChip status={r.status as ChipStatus} />
                    <span className="text-meta text-ink-muted">{fmt(t.supports, { n: r.supportCount + (supported.includes(r.id) ? 1 : 0) })}</span>
                  </>
                }
              >
                <div>
                  <Button
                    size="sm"
                    variant={done ? "secondary" : "primary"}
                    icon={done ? Check : ThumbsUp}
                    disabled={done || !r.can.support}
                    onClick={async () => {
                      await api.gr.supportReport(r.id);
                      setSupported((s) => [...s, r.id]);
                    }}
                  >
                    {done ? t.supported : t.supportReport}
                  </Button>
                </div>
              </ListRow>
            );
          })}
        </Card>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-primary-tint p-4 text-meta">
          <Info aria-hidden size={18} className="mt-0.5 flex-none text-primary-ink" />
          {t.duplicateTip}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" icon={send} onClick={submit} loading={busy}>
            {t.differentProblem}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setStep("form")}>
            {t.backAndEdit}
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ---------- Step 1: form ----------
  return (
    <PageContainer>
      <PageHeader title={t.newReport} subtitle={t.reportIntro} back="/" />

      {/* Emergencies don't belong here. */}
      <button
        type="button"
        onClick={openSos}
        className="mb-6 flex w-full items-center gap-3 rounded-2xl bg-danger-tint p-4 text-left ring-1 ring-danger/20 ring-inset hover:bg-danger/10"
      >
        <Siren aria-hidden size={22} className="flex-none text-danger" />
        <span className="flex-1 text-body">
          <b className="text-danger">117 · 118 · 119</b> · {t.sosCallFirstHint}
        </span>
      </button>

      <form onSubmit={next} noValidate className="grid items-start gap-6 lg:grid-cols-3 lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="text-title font-bold">{t.stepCategory}</h2>
              <p className={`text-meta ${errors.category ? "font-medium text-danger" : "text-ink-muted"}`}>{errors.category ?? t.chooseOne}</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {cats.map((c) => (
                <ChoiceCard
                  key={c.id}
                  name="category"
                  checked={category === c.id}
                  onChange={() => setCategory(c.id)}
                  label={tx(c.label)}
                  description={tx(c.examples)}
                  icon={<IconTile icon={CATEGORY_ICON[c.id]} accent="primary" />}
                />
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-5">
            <h2 className="text-title font-bold">{t.stepDetails}</h2>
            <TextField label={t.reportTitle} placeholder={t.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} error={errors.title} />
            <TextArea
              label={t.reportDescription}
              placeholder={t.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              error={errors.description}
              hint={`${description.length} / 2000`}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-title font-bold">{t.stepPhotos}</h2>
                <p className="text-meta text-ink-muted">{t.upToFivePhotos}</p>
              </div>
              <span className="text-body font-semibold text-ink-muted tabular-nums">{photos} / 5</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {Array.from({ length: photos }, (_, i) => (
                <div key={i} className="flex aspect-square items-center justify-center rounded-xl bg-sand-deep text-ink-muted" aria-label={`${t.stepPhotos} ${i + 1}`}>
                  <ImagePlus aria-hidden size={24} />
                </div>
              ))}
              {photos < 5 && (
                <>
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl bg-primary-tint text-center text-meta font-semibold border-2 border-dashed border-primary/40 text-primary-ink hover:bg-primary-tint/70">
                    <ImagePlus aria-hidden size={24} />
                    {t.fromGallery}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => setPhotos((n) => Math.min(5, n + (e.target.files?.length ?? 0)))} />
                  </label>
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl text-center text-meta font-semibold text-primary-ink ring-1 ring-primary/30 ring-inset hover:bg-primary-tint">
                    <Camera aria-hidden size={24} />
                    {t.takePhoto}
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhotos((n) => Math.min(5, n + (e.target.files?.length ?? 0)))} />
                  </label>
                </>
              )}
            </div>
            <p className="text-meta text-ink-muted">
              {t.photoHint} · {t.photosMockNote}
            </p>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Card className="flex flex-col gap-4">
            <h2 className="text-title font-bold">{t.stepLocation}</h2>
            <SelectField label={t.reportArea} value={area} onChange={(e) => setCityId(e.target.value)} error={errors.city}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {tx(c.name)}
                </option>
              ))}
            </SelectField>
            <TextField label={t.landmark} hint={t.landmarkHint} optional={t.optional} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            <div className="flex items-start gap-3 rounded-xl bg-sand p-3">
              <MapPin aria-hidden size={20} className="mt-0.5 flex-none text-primary-ink" />
              <p className="text-meta">
                {gpsState === "ok" ? t.usingGps : gpsState === "failed" ? t.gpsFailed : fmt(t.usingArea, { area: city ? tx(city.name) : "…" })}
              </p>
            </div>
            <Button variant="secondary" icon={LocateFixed} onClick={useGps} disabled={gpsState === "busy"}>
              {gpsState === "busy" ? t.checking : t.useGps}
            </Button>
          </Card>

          <p className="flex items-start gap-2 rounded-2xl bg-primary-tint p-4 text-meta">
            <ShieldCheck aria-hidden size={18} className="mt-0.5 flex-none text-primary-ink" />
            {t.privacyHint}
          </p>

          {apiError && <p className="rounded-xl bg-danger-tint px-4 py-3 text-meta font-medium text-danger-ink">{apiError}</p>}

          {/* Sticky on phones, above the bottom tabs. */}
          <div className="sticky bottom-[84px] z-10 -mx-4 bg-sand/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0">
            <button type="submit" disabled={busy} className={buttonClass("primary", "lg", "w-full")}>
              <Send aria-hidden size={20} />
              {busy ? t.checking : t.submitReport}
            </button>
          </div>
        </aside>
      </form>
    </PageContainer>
  );
}

/** /report/submitted?code=RPT-… */
export function ReportSubmitted() {
  const { t } = useLocale();
  const code = useSearchParams().get("code") ?? "";
  const [copied, setCopied] = useState(false);
  return (
    <PageContainer className="max-w-2xl">
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-fixed-tint text-fixed">
          <Check aria-hidden size={36} strokeWidth={3} />
        </span>
        <h1 className="text-page leading-tight font-bold">{t.submittedTitle}</h1>
        <p className="text-body text-ink-muted">{t.queuedForReview}</p>
      </div>

      {code && (
        <Card className="mt-6 flex items-center justify-between gap-3">
          <span>
            <span className="block text-meta text-ink-muted">{t.reportCode}</span>
            <span className="block text-title font-bold tabular-nums">{code}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? <Check aria-hidden size={16} /> : null}
            {t.copy}
          </Button>
        </Card>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-title font-bold">{t.nextSteps}</h2>
        <Card padded={false} as="ol">
          {[t.adminChecks, t.departmentAssign, t.updatesNotify].map((s, i) => (
            <li key={i} className="flex list-none items-center gap-3 border-b border-line px-4 py-4 last:border-b-0">
              <span className="flex size-9 flex-none items-center justify-center rounded-full bg-primary text-body font-bold text-white">{i + 1}</span>
              <span className="text-body">{s}</span>
            </li>
          ))}
        </Card>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {code && (
          <LinkButton href={`/reports/${code}`} size="lg">
            {t.trackReport}
          </LinkButton>
        )}
        <LinkButton href="/" variant="secondary" size="lg">
          {t.backHome}
        </LinkButton>
      </div>
    </PageContainer>
  );
}
