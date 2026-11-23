"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  Clock,
  Landmark,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Recycle,
  Search,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageContainer } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  EmptyState,
  IconTile,
  ListRow,
  SelectField,
  Sheet,
  SkeletonRows,
  TextArea,
  TextField,
  Toggle,
  buttonClass,
} from "@/components/ui";
import { fmt } from "@/lib/i18n/dictionary";
import type { I18nText } from "@/types";
import type { CsEditField, CsGuideView, CsPlaceType, CsPlaceTypeMeta, CsPlaceView, CsWasteSchedule, OpeningHours, Weekday } from "@/types/community";
import { useCs, type CsDict } from "./i18n";
import { distanceLabel, mapsUrl, useAreas, useCommunityHref } from "./shared";

const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const ORDER: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const PLACE_ICON: Partial<Record<CsPlaceType, LucideIcon>> = {
  SANGKAT_OFFICE: Landmark,
  KHAN_OFFICE: Landmark,
  PROVINCIAL_HALL: Landmark,
  ONE_WINDOW_OFFICE: Building2,
  WASTE_POINT: Recycle,
  PUBLIC_LIBRARY: BookOpen,
};

/** "Open · until 17:00" / "Closed · opens 07:30 tomorrow", in Cambodia time. */
export function openStatus(hours: OpeningHours, c: CsDict): { open: boolean; text: string } {
  const { day, time } = api.cs.cambodiaClock();
  const today = hours[day];
  const now = today.find((r) => time >= r.open && time < r.close);
  if (now) return { open: true, text: fmt(c.openUntil, { time: now.close }) };
  const later = today.find((r) => r.open > time);
  if (later) return { open: false, text: fmt(c.closedOpens, { time: later.open, when: c.today }) };
  const idx = ORDER.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const d = ORDER[(idx + i) % 7];
    if (hours[d].length) {
      const when = i === 1 ? c.tomorrow : c[`d${d}` as keyof CsDict];
      return { open: false, text: fmt(c.closedOpens, { time: hours[d][0].open, when }) };
    }
  }
  return { open: false, text: c.closed };
}

function OpenChip({ hours }: { hours: OpeningHours }) {
  const { c } = useCs();
  const s = openStatus(hours, c);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta font-semibold ring-1 ring-inset ${
        s.open ? "bg-fixed-tint text-fixed-ink ring-fixed/25" : "bg-sand-deep text-ink-muted ring-line-strong"
      }`}
    >
      <Clock aria-hidden size={15} />
      {s.text}
    </span>
  );
}

function WasteCard({ w }: { w: CsWasteSchedule }) {
  const { c, tx } = useCs();
  const days = w.days.length === 7 ? c.everyDay : w.days.map((d) => c[`d${d}` as keyof CsDict]).join(", ");
  return (
    <Card className="flex items-start gap-3 bg-fixed-tint/50 ring-1 ring-fixed/20">
      <IconTile icon={Recycle} accent="fixed" />
      <div className="min-w-0">
        <p className="text-meta font-semibold text-fixed-ink">{c.rubbish}</p>
        <p className="text-row font-bold">
          {days} · {w.timeWindow.from}–{w.timeWindow.to}
        </p>
        {w.note && <p className="mt-0.5 text-body text-ink-muted">{tx(w.note)}</p>}
      </div>
    </Card>
  );
}

// ---------- /services ----------

/** Civic offices nearest first, live open/closed, rubbish pickup on top (wireframe 7a). */
export function ServicesScreen() {
  const { c, tx } = useCs();
  const href = useCommunityHref();
  const { user, ready } = useAuth();
  const areas = useAreas();
  const [q, setQ] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [type, setType] = useState<CsPlaceType | "">("");
  const [types, setTypes] = useState<CsPlaceTypeMeta[]>([]);
  const [places, setPlaces] = useState<CsPlaceView[] | null>(null);
  const [waste, setWaste] = useState<CsWasteSchedule | null>(null);

  const center = areas?.cities.find((x) => x.id === user?.cityId)?.center;

  useEffect(() => {
    api.cs.getPlaceTypes().then(setTypes);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.cs.getWasteSchedules({ cityId: user.cityId }).then((w) => setWaste(w[0] ?? null));
  }, [user]);

  useEffect(() => {
    if (!ready || (user && !areas)) return;
    let alive = true;
    const t = setTimeout(() => {
      api.cs
        .listPlaces({ q: q || undefined, type: type ? [type] : undefined, openNow, provinceId: user?.provinceId, near: center })
        .then((p) => alive && setPlaces(p));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [ready, user, areas, q, type, openNow, center]);

  const typeLabel = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t.label])) as Record<string, I18nText>, [types]);

  return (
    <PageContainer>
      <header className="pb-5">
        <h1 className="text-page leading-tight font-bold lg:text-display">{c.servicesTitle}</h1>
        <p className="mt-1 text-body text-ink-muted">{c.servicesHint}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="relative">
            <Search aria-hidden size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.searchServices}
              aria-label={c.searchServices}
              className="min-h-13 w-full rounded-xl bg-surface pr-4 pl-12 text-body shadow-card ring-1 ring-line ring-inset focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Toggle checked={openNow} onChange={setOpenNow} label={c.openNow} />
            <div className="w-full sm:w-64">
              <SelectField label={c.officeType} value={type} onChange={(e) => setType(e.target.value as CsPlaceType | "")}>
                <option value="">{c.allTypes}</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tx(t.label)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {waste && !q && <WasteCard w={waste} />}

          {!places ? (
            <SkeletonRows rows={4} />
          ) : places.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={c.noOffices}
              body={c.noOfficesBody}
              action={
                openNow ? (
                  <Button variant="secondary" size="sm" onClick={() => setOpenNow(false)}>
                    {c.includeClosed}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {places.map((p) => (
                <OfficeCard key={p.id} p={p} typeName={typeLabel[p.type] ? tx(typeLabel[p.type]) : ""} />
              ))}
              <p className="py-4 text-center text-meta text-ink-muted">{fmt(c.officesCount, { n: places.length })}</p>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex items-start gap-3">
            <IconTile icon={ShieldAlert} accent="danger" />
            <p className="text-body">{c.emergencyNote}</p>
          </Card>
          <Card padded={false} as="ul">
            <ListRow icon={BookOpen} accent="fixed" href={href("/guides")} title={c.guidesTitle} subtitle={c.guidesHint} />
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}

function OfficeCard({ p, typeName }: { p: CsPlaceView; typeName: string }) {
  const { c, tx } = useCs();
  const href = useCommunityHref();
  const Icon = PLACE_ICON[p.type] ?? Building2;
  const dist = distanceLabel(p.distanceKm, c);
  return (
    <Card className="flex flex-col gap-3">
      <Link href={href(`/services/${p.id}`)} className="flex items-start gap-3 [&:hover_.t]:underline">
        <IconTile icon={Icon} accent="fixed" />
        <span className="min-w-0 flex-1">
          <span className="t block text-row leading-snug font-bold">{tx(p.name)}</span>
          <span className="mt-0.5 block text-meta text-ink-muted">{[typeName, p.address, dist].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
      <div>
        <OpenChip hours={p.hours} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {p.phone ? (
          <a href={`tel:${p.phone.replace(/\s/g, "")}`} className={buttonClass("secondary", "md")}>
            <Phone aria-hidden size={18} />
            {c.call}
          </a>
        ) : (
          <span />
        )}
        <a href={mapsUrl(p.location.lat, p.location.lng)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md")}>
          <Navigation aria-hidden size={18} />
          {c.directions}
        </a>
      </div>
    </Card>
  );
}

// ---------- /services/[id] ----------

const EDIT_FIELDS: CsEditField[] = ["PHONE", "HOURS", "ADDRESS", "LOCATION", "CLOSED", "OTHER"];

/** Office detail: call, directions, week hours with today highlighted, guides handled here (7e). */
export function OfficeScreen() {
  const { id } = useParams<{ id: string }>();
  const { c, tx } = useCs();
  const href = useCommunityHref();
  const { ready } = useAuth();
  const requireAuth = useRequireAuth();
  const [p, setP] = useState<CsPlaceView | null>(null);
  const [guides, setGuides] = useState<CsGuideView[]>([]);
  const [error, setError] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.cs
      .getPlace(id)
      .then(async (place) => {
        if (!alive) return;
        setP(place);
        const all = await api.cs.listGuides();
        if (alive) setGuides(all.filter((g) => place.guideIds.includes(g.id) || g.whereTypes.includes(place.type)));
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id, ready]);

  const back = (
    <Link href={href("/services")} className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-body font-semibold text-ink-muted hover:bg-sand-deep hover:text-ink">
      <ArrowLeft aria-hidden size={20} />
      {c.servicesTitle}
    </Link>
  );
  if (error)
    return (
      <PageContainer>
        {back}
        <EmptyState icon={ShieldAlert} title={c.notFound} body={c.notFoundBody} />
      </PageContainer>
    );
  if (!p)
    return (
      <PageContainer>
        {back}
        <SkeletonRows rows={4} />
      </PageContainer>
    );

  const today = api.cs.cambodiaClock().day;
  const Icon = PLACE_ICON[p.type] ?? Building2;

  return (
    <PageContainer className="max-w-4xl">
      {back}
      <header className="flex items-start gap-4">
        <IconTile icon={Icon} accent="fixed" size="lg" />
        <div className="min-w-0">
          <h1 className="text-page leading-tight font-bold">{tx(p.name)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-meta text-ink-muted">
            {p.verified && (
              <span className="inline-flex items-center gap-1 font-semibold text-fixed-ink">
                <BadgeCheck aria-hidden size={15} />
                {c.verified}
              </span>
            )}
            {p.address}
          </p>
          <div className="mt-2">
            <OpenChip hours={p.hours} />
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-md">
        {p.phone && (
          <a href={`tel:${p.phone.replace(/\s/g, "")}`} className={buttonClass("primary", "lg")}>
            <Phone aria-hidden size={20} />
            {c.call}
          </a>
        )}
        <a href={mapsUrl(p.location.lat, p.location.lng)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg")}>
          <Navigation aria-hidden size={20} />
          {c.directions}
        </a>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-title font-bold">{c.hours}</h2>
          <Card padded={false} as="ul">
            {WEEK.map((d) => {
              const isToday = d === today;
              const ranges = p.hours[d];
              return (
                <li
                  key={d}
                  className={`flex list-none items-center justify-between gap-3 border-b border-line px-4 py-3 text-body last:border-b-0 ${
                    isToday ? "bg-primary-tint font-bold" : ""
                  }`}
                >
                  <span>
                    {c[`d${d}` as keyof CsDict]}
                    {isToday && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-caption text-white">{c.today}</span>}
                  </span>
                  <span className={ranges.length ? "tabular-nums" : "text-ink-muted"}>
                    {ranges.length ? ranges.map((r) => `${r.open}–${r.close}`).join(", ") : c.closed}
                  </span>
                </li>
              );
            })}
          </Card>
          <p className="mt-2 text-meta text-ink-muted">{c.holidayNote}</p>
        </section>

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-title font-bold">{c.address}</h2>
            <Card padded={false} as="ul">
              <ListRow icon={MapPin} accent="neutral" title={p.address} subtitle={p.note ? tx(p.note) : undefined} />
              {p.phone && (
                <li className="list-none border-b border-line last:border-b-0">
                  <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 px-4 py-4 hover:bg-sand">
                    <IconTile icon={Phone} accent="neutral" />
                    <span>
                      <span className="block text-meta text-ink-muted">{c.phone}</span>
                      <span className="block text-row font-semibold tabular-nums">{p.phone}</span>
                    </span>
                  </a>
                </li>
              )}
            </Card>
          </section>

          {guides.length > 0 && (
            <section>
              <h2 className="mb-3 text-title font-bold">{c.servicesHere}</h2>
              <Card padded={false} as="ul">
                {guides.map((g) => (
                  <ListRow key={g.id} icon={BookOpen} accent="fixed" href={`/guides/${g.id}`} title={tx(g.title)} />
                ))}
              </Card>
            </section>
          )}

          <div className="flex flex-col items-start gap-1">
            <Button variant="secondary" icon={Pencil} onClick={() => requireAuth(() => setEditOpen(true))}>
              {c.suggestEdit}
            </Button>
            <p className="text-meta text-ink-muted">{fmt(c.lastChecked, { date: p.updatedAt.slice(0, 10) })}</p>
          </div>
        </div>
      </div>

      {editOpen && <SuggestEditSheet placeId={p.id} onClose={() => setEditOpen(false)} />}
    </PageContainer>
  );
}

function SuggestEditSheet({ placeId, onClose }: { placeId: string; onClose: () => void }) {
  const { c } = useCs();
  const [field, setField] = useState<CsEditField>("PHONE");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.cs.suggestEdit(placeId, { field, value: value || "-", note: note || undefined });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={c.suggestEdit} icon={<Pencil aria-hidden size={22} />} onClose={onClose}>
      {done ? (
        <>
          <p className="text-body font-semibold text-fixed-ink">{c.suggestionSent}</p>
          <Button onClick={onClose} block>
            OK
          </Button>
        </>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-4">
          <SelectField label={c.whatsWrong} value={field} onChange={(e) => setField(e.target.value as CsEditField)}>
            {EDIT_FIELDS.map((f) => (
              <option key={f} value={f}>
                {c[`f${f}` as keyof CsDict]}
              </option>
            ))}
          </SelectField>
          {field !== "CLOSED" && <TextField label={c.correctValue} value={value} onChange={(e) => setValue(e.target.value)} />}
          <TextArea label={c.note} optional={c.optional} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <p className="text-meta text-ink-muted">{c.suggestBody}</p>
          {error && <p className="text-meta font-medium text-danger">{error}</p>}
          <Button type="submit" loading={busy} disabled={busy || (field !== "CLOSED" && !value.trim())} block>
            {c.sendSuggestion}
          </Button>
        </form>
      )}
    </Sheet>
  );
}

