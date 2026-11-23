"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Camera, Crosshair, KeyRound, Search, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { z } from "zod";
import { Button, SelectField, Sheet, TextArea, TextField } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { City, Province, User } from "@/types";
import type { LfCategoryMeta, LfCreatePostInput, LfKind } from "@/types/lost-found";

function localToday() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function photoDataUrl(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Photo could not be read"));
    reader.onerror = () => reject(new Error("Photo could not be read"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Photo could not be opened"));
    element.src = source;
  });
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo could not be processed");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function PostFormSheet({
  kind,
  user,
  categories,
  provinces,
  cities,
  onClose,
  onSubmit,
}: {
  kind: LfKind;
  user: User;
  categories: LfCategoryMeta[];
  provinces: Province[];
  cities: City[];
  onClose: () => void;
  onSubmit: (input: LfCreatePostInput) => Promise<void>;
}) {
  const { t, tx } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<LfCategoryMeta["id"] | "">("");
  const [provinceId, setProvinceId] = useState(user.provinceId);
  const [cityId, setCityId] = useState(user.cityId);
  const [place, setPlace] = useState("");
  const [eventDate, setEventDate] = useState(localToday);
  const [secretQuestion, setSecretQuestion] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");
  const [approxLocation, setApproxLocation] = useState<{ lat: number; lng: number }>();
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const today = useMemo(localToday, []);
  const cityOptions = cities.filter((city) => city.provinceId === provinceId);
  const isFound = kind === "FOUND";

  async function attachLocation() {
    if (!navigator.geolocation) {
      toast.error(t.errGeneric);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setApproxLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast.success(t.lfLocationAttached);
      },
      () => toast.error(t.errGeneric),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function choosePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t.errGeneric);
      return;
    }
    try {
      setPhoto(await photoDataUrl(file));
    } catch {
      toast.error(t.errGeneric);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const schema = z.object({
      title: z.string().trim().min(2, t.lfTitleRequired),
      description: z.string().trim().min(8, t.lfDescriptionRequired),
      category: z.string().min(1, t.lfAllCategories),
      provinceId: z.string().min(1, t.authChooseLocation),
      cityId: z.string().min(1, t.authChooseLocation),
      place: z.string().trim().min(2, t.lfPlaceRequired),
      eventDate: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today, t.lfDateInvalid),
      secretQuestion: isFound ? z.string().trim().min(3, t.lfSecretRequired) : z.string().optional(),
      secretAnswer: isFound ? z.string().trim().min(2, t.lfSecretRequired) : z.string().optional(),
    });
    const parsed = schema.safeParse({ title, description, category, provinceId, cityId, place, eventDate, secretQuestion, secretAnswer });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t.errGeneric);
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        kind,
        category: parsed.data.category as LfCategoryMeta["id"],
        title: parsed.data.title,
        description: parsed.data.description,
        photoUrls: photo ? [photo] : [],
        provinceId: parsed.data.provinceId,
        cityId: parsed.data.cityId,
        place: parsed.data.place,
        eventDate: parsed.data.eventDate,
        approxLocation,
        secret: isFound ? { question: parsed.data.secretQuestion, answer: parsed.data.secretAnswer! } : undefined,
      });
      toast.success(t.lfPostSuccess);
      onClose();
    } catch {
      toast.error(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={isFound ? t.lfReportFoundTitle : t.lfReportLostTitle}
      icon={isFound ? <KeyRound aria-hidden size={20} /> : <Search aria-hidden size={20} />}
      onClose={onClose}
    >
      <p className="text-meta leading-relaxed text-ink-muted">{t.lfReportFormHint}</p>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <TextField label={t.lfItemTitle} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required />
        <SelectField label={t.lfCategory} value={category} onChange={(event) => setCategory(event.target.value as LfCategoryMeta["id"] | "")} required>
          <option value="">{t.lfAllCategories}</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{tx(item.label)}</option>)}
        </SelectField>
        <TextArea label={t.lfItemDescription} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={600} required />
        {isFound && (
          <div className="rounded-xl bg-gold-tint/70 p-3.5">
            <div className="flex gap-2 text-meta font-semibold text-gold-ink"><ShieldCheck aria-hidden size={17} />{t.lfSecretQuestion}</div>
            <p className="mt-1 text-caption leading-relaxed text-ink-muted">{t.lfSecretHint}</p>
            <div className="mt-3 flex flex-col gap-3">
              <TextField label={t.lfSecretQuestion} value={secretQuestion} onChange={(event) => setSecretQuestion(event.target.value)} maxLength={100} required />
              <TextField label={t.lfSecretAnswer} value={secretAnswer} onChange={(event) => setSecretAnswer(event.target.value)} maxLength={100} required />
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={t.province} value={provinceId} onChange={(event) => { setProvinceId(event.target.value); setCityId(""); }} required>
            <option value="">{t.province}</option>
            {provinces.map((province) => <option key={province.id} value={province.id}>{tx(province.name)}</option>)}
          </SelectField>
          <SelectField label={t.city} value={cityId} onChange={(event) => setCityId(event.target.value)} disabled={!provinceId} required>
            <option value="">{t.city}</option>
            {cityOptions.map((city) => <option key={city.id} value={city.id}>{tx(city.name)}</option>)}
          </SelectField>
        </div>
        <TextField label={t.lfPlaceLabel} value={place} onChange={(event) => setPlace(event.target.value)} placeholder={t.lfPlacePlaceholder} maxLength={160} required />
        <TextField label={t.lfEventDate} type="date" value={eventDate} max={today} onChange={(event) => setEventDate(event.target.value)} required />
        <div>
          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-surface px-3.5 text-meta font-semibold text-primary ring-1 ring-line-strong ring-inset hover:bg-primary-tint">
            <Camera aria-hidden size={18} />
            {t.lfChoosePhoto}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void choosePhoto(event.target.files?.[0])} />
          </label>
          <p className="mt-1.5 text-caption text-ink-muted">{t.lfPhotoHint}</p>
          {photo && <img src={photo} alt={t.lfChoosePhoto} className="mt-2 h-28 w-28 rounded-xl object-cover" />}
        </div>
        <Button type="button" variant="secondary" onClick={attachLocation} icon={Crosshair}>
          {approxLocation ? t.lfLocationAttached : t.lfUseCurrentLocation}
        </Button>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t.lfPosting : t.lfSubmitPost}
        </Button>
      </form>
    </Sheet>
  );
}
