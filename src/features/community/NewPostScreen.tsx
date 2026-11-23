"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Info, MapPin, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageContainer } from "@/components/layout/AppShell";
import { Button, Card, ChoiceCard, IconTile, SelectField, TextArea, TextField } from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import type { CsCreatePostInput, CsGroupView, CsPostType, CsScope } from "@/types/community";
import { CS_RULES } from "@/types/community";
import { useCs, type CsDict } from "./i18n";
import { POST_ICON, typeLabel } from "./PostCard";
import { scopeLabel, useAreas, useCommunityHref } from "./shared";

const TYPES: CsPostType[] = ["EVENT", "QUESTION", "POLL", "DISCUSSION"];

/** Cambodia time (UTC+7) ISO string from form date + time. */
const toIso = (date: string, time: string) => `${date}T${time}:00+07:00`;

/** /community/new · pick a type, then a form that only asks for what that type needs (wireframes 5a–5e). */
export function NewPostScreen() {
  const { c, tx, locale } = useCs();
  const href = useCommunityHref();
  const { user } = useAuth();
  const areas = useAreas();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<CsPostType | null>(null);
  const [groups, setGroups] = useState<CsGroupView[]>([]);

  // Form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const [capacity, setCapacity] = useState("");
  const [groupId, setGroupId] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [closes, setCloses] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.cs.listGroups({ mine: true }).then(setGroups).catch(() => setGroups([]));
  }, [user]);

  const scope: CsScope | null = user
    ? user.sangkat
      ? { level: "SANGKAT", provinceId: user.provinceId, cityId: user.cityId, sangkat: user.sangkat }
      : { level: "CITY", provinceId: user.provinceId, cityId: user.cityId }
    : null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = c.errTitle;
    if (!body.trim()) e.body = c.errBody;
    if (type === "EVENT") {
      if (!date || !start) e.date = c.errDate;
      if (!place.trim()) e.place = c.errPlace;
      if (end && start && end <= start) e.end = c.errEnd;
    }
    if (type === "POLL") {
      if (options.filter((o) => o.trim()).length < CS_RULES.pollMinOptions) e.options = c.errOptions;
      if (!closes) e.closes = c.errDate;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function publish(ev: React.FormEvent) {
    ev.preventDefault();
    if (!type || !scope || !validate()) return;
    setBusy(true);
    setApiError(null);
    const input: CsCreatePostInput = { type, title: title.trim(), body: body.trim(), scope, groupId: groupId || undefined };
    if (type === "EVENT") {
      const endTime = end || addHour(start);
      input.event = { start: toIso(date, start), end: toIso(date, endTime), place: place.trim(), capacity: capacity ? Number(capacity) : undefined };
    }
    if (type === "POLL") input.poll = { options: options.map((o) => o.trim()).filter(Boolean), closesAt: toIso(closes, "23:59") };
    try {
      const post = await api.cs.createPost(input);
      router.push(href(`/community/posts/${post.id}`));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <PageContainer className="max-w-3xl">
      <button
        type="button"
        onClick={() => (step === 2 ? setStep(1) : router.push(href("/community")))}
        className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink"
      >
        <ArrowLeft aria-hidden size={20} />
        {step === 2 ? c.back : c.board}
      </button>
      <h1 className="text-page leading-tight font-bold">{c.newPostTitle}</h1>
      <p className="mt-1 text-meta font-semibold text-ink-muted">{step === 1 ? c.step1 : c.step2}</p>

      {scope && (
        <p className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-meta shadow-card">
          <MapPin aria-hidden size={16} className="text-primary-ink" />
          {c.postingIn}: <span className="font-semibold">{scopeLabel(scope, areas, locale, c)}</span>
        </p>
      )}

      {step === 1 ? (
        <div className="mt-6 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => (
              <ChoiceCard
                key={t}
                name="type"
                checked={type === t}
                onChange={() => setType(t)}
                label={typeLabel(t, c)}
                description={c[`desc${t}` as keyof CsDict]}
                icon={<IconTile icon={POST_ICON[t]} accent="reported" />}
              />
            ))}
          </div>
          <Button size="lg" className="mt-3" disabled={!type} onClick={() => requireAuth(() => setStep(2))} block>
            {c.continue}
          </Button>
        </div>
      ) : (
        <form onSubmit={publish} className="mt-6 flex flex-col gap-5" noValidate>
          <Card className="flex flex-col gap-5">
            <TextField label={c.title} hint={c.titleHint} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={CS_RULES.titleMax} error={errors.title} />

            {type === "EVENT" && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField label={c.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
                  <TextField label={c.start} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                  <TextField label={c.end} optional={c.optional} type="time" value={end} onChange={(e) => setEnd(e.target.value)} error={errors.end} />
                </div>
                <TextField label={c.place} hint={c.placeHint} value={place} onChange={(e) => setPlace(e.target.value)} error={errors.place} />
                <TextField label={c.capacity} optional={c.optional} type="number" inputMode="numeric" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </>
            )}

            {type === "POLL" && (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1.5 text-body font-semibold">{c.options}</legend>
                {options.map((o, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1">
                      <TextField
                        label={fmt(c.option, { n: i + 1 })}
                        value={o}
                        onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                    </div>
                    {options.length > CS_RULES.pollMinOptions && (
                      <Button variant="ghost" icon={Trash2} onClick={() => setOptions((list) => list.filter((_, j) => j !== i))}>
                        {c.remove}
                      </Button>
                    )}
                  </div>
                ))}
                {errors.options && <p className="text-meta font-medium text-danger">{errors.options}</p>}
                {options.length < CS_RULES.pollMaxOptions && (
                  <Button variant="secondary" size="sm" icon={Plus} className="self-start" onClick={() => setOptions((l) => [...l, ""])}>
                    {c.addOption}
                  </Button>
                )}
                <TextField label={c.closesAt} type="date" value={closes} onChange={(e) => setCloses(e.target.value)} error={errors.closes} />
                <p className="flex items-start gap-2 rounded-xl bg-primary-tint p-3 text-meta">
                  <Info aria-hidden size={18} className="mt-0.5 flex-none text-primary-ink" />
                  {c.pollRule}
                </p>
              </fieldset>
            )}

            <TextArea label={c.details} value={body} onChange={(e) => setBody(e.target.value)} maxLength={CS_RULES.bodyMax} error={errors.body} rows={5} />

            {groups.length > 0 && (
              <SelectField label={c.groups} optional={c.optional} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">—</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {tx(g.name)}
                  </option>
                ))}
              </SelectField>
            )}

            <p className="flex items-start gap-2 text-meta text-ink-muted">
              <ShieldCheck aria-hidden size={18} className="mt-0.5 flex-none text-fixed" />
              {c.privacyReminder}
            </p>
          </Card>

          {apiError && <p className="rounded-xl bg-danger-tint px-4 py-3 text-meta font-medium text-danger-ink">{apiError}</p>}

          {/* Sticky publish bar (above bottom tabs on phones). */}
          <div className="sticky bottom-[84px] z-10 -mx-4 bg-sand/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:px-0">
            <Button type="submit" size="lg" icon={Send} loading={busy} block>
              {c.publish}
            </Button>
          </div>
        </form>
      )}
    </PageContainer>
  );
}

function addHour(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
