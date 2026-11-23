// Lost & Found seed data. All people, items and phone numbers are fake.
// "Today" in the demo is around 2026-11-21.

import type { AppNotification, LfCategoryMeta, LfClaim, LfComment, LfPost } from "@/types";
import { LF_RULES } from "@/types";

export const LF_CATEGORIES: LfCategoryMeta[] = [
  { id: "NATIONAL_ID", icon: "🪪", sensitive: true, label: { km: "អត្តសញ្ញាណប័ណ្ណ", en: "National ID card" } },
  { id: "PASSPORT", icon: "📘", sensitive: true, label: { km: "លិខិតឆ្លងដែន", en: "Passport" } },
  { id: "DRIVING_LICENSE", icon: "🚗", sensitive: true, label: { km: "ប័ណ្ណបើកបរ", en: "Driving license" } },
  { id: "BANK_CARD", icon: "💳", sensitive: true, label: { km: "កាតធនាគារ", en: "Bank card" } },
  { id: "PHONE", icon: "📱", sensitive: false, label: { km: "ទូរស័ព្ទ", en: "Phone" } },
  { id: "WALLET", icon: "👛", sensitive: false, label: { km: "កាបូប", en: "Wallet" } },
  { id: "KEYS", icon: "🔑", sensitive: false, label: { km: "កូនសោ", en: "Keys" } },
  { id: "MOTO_PLATE", icon: "🏍️", sensitive: false, label: { km: "ស្លាកលេខម៉ូតូ", en: "Moto plate" } },
  { id: "BAG", icon: "🎒", sensitive: false, label: { km: "កាបូបស្ពាយ", en: "Bag" } },
  { id: "ELECTRONICS", icon: "💻", sensitive: false, label: { km: "គ្រឿងអេឡិចត្រូនិច", en: "Electronics" } },
  { id: "JEWELRY", icon: "💍", sensitive: false, label: { km: "គ្រឿងអលង្ការ", en: "Jewelry" } },
  { id: "DOCUMENTS", icon: "📄", sensitive: true, label: { km: "ឯកសារ", en: "Documents" } },
  { id: "PET", icon: "🐕", sensitive: false, label: { km: "សត្វចិញ្ចឹម", en: "Pet" } },
  { id: "OTHER", icon: "📦", sensitive: false, label: { km: "ផ្សេងៗ", en: "Other" } },
];

const DAY = 86_400_000;
export const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString();

function post(p: Omit<LfPost, "expiresAt" | "updatedAt" | "reportedBy" | "hidden"> & Partial<LfPost>): LfPost {
  return {
    reportedBy: [],
    hidden: false,
    updatedAt: p.createdAt,
    expiresAt: addDays(p.createdAt, LF_RULES.expiryDays),
    ...p,
  };
}

export const LF_POSTS: LfPost[] = [
  post({
    id: "lf-1", kind: "FOUND", category: "NATIONAL_ID", ownerId: "u-citizen-3",
    title: "National ID card found", description: "Found on the ground near the east gate. Handed nothing to anyone yet.",
    photoUrls: ["/mock/private/lf-id-1.jpg"], provinceId: "phnom-penh", cityId: "doun-penh",
    place: "Psar Thmei (Central Market), east gate", approxLocation: { lat: 11.57, lng: 104.921 },
    eventDate: "2026-11-19", status: "CLAIM_PENDING", createdAt: "2026-11-19T12:00:00+07:00",
    secret: { question: "What name and date of birth are on the card?", answer: "សុខ ដារ៉ា, 14 April 2001" },
  }),
  post({
    id: "lf-2", kind: "FOUND", category: "KEYS", ownerId: "u-citizen-2",
    title: "Honda moto key with keychain", description: "Moto key left in the parking lot, level 2.",
    photoUrls: ["/mock/lf/moto-key.webp"], provinceId: "phnom-penh", cityId: "sen-sok",
    place: "Aeon Mall Sen Sok, parking level 2", approxLocation: { lat: 11.592, lng: 104.874 },
    eventDate: "2026-11-20", status: "POSTED", createdAt: "2026-11-20T18:30:00+07:00",
    secret: { question: "Describe the keychain.", answer: "Red Angkor Wat keychain with a small bell" },
  }),
  post({
    id: "lf-3", kind: "LOST", category: "KEYS", ownerId: "u-citizen-5",
    title: "Lost my moto key at Aeon Sen Sok", description: "Honda Dream key. Red keychain. Lost in the evening.",
    photoUrls: ["/mock/lf/key-red-keychain.webp"], provinceId: "phnom-penh", cityId: "sen-sok",
    place: "Aeon Mall Sen Sok", approxLocation: { lat: 11.591, lng: 104.873 },
    eventDate: "2026-11-20", status: "POSTED", createdAt: "2026-11-20T21:00:00+07:00",
  }),
  post({
    id: "lf-4", kind: "LOST", category: "WALLET", ownerId: "u-citizen-1",
    title: "Brown leather wallet lost", description: "Brown leather wallet, has a photo of a white cat inside.",
    photoUrls: ["/mock/lf/wallet-lost.webp"], provinceId: "phnom-penh", cityId: "chamkar-mon",
    place: "Russian Market (Psar Toul Tompoung)", approxLocation: { lat: 11.538, lng: 104.918 },
    eventDate: "2026-11-18", status: "POSTED", createdAt: "2026-11-18T10:00:00+07:00",
  }),
  post({
    id: "lf-5", kind: "FOUND", category: "PHONE", ownerId: "u-citizen-1",
    title: "Smartphone found in a tuk-tuk", description: "Black phone in a clear case, battery dead.",
    photoUrls: ["/mock/lf/phone-black.webp"], provinceId: "phnom-penh", cityId: "tuol-kouk",
    place: "Toul Kork, near St. 315", approxLocation: { lat: 11.581, lng: 104.902 },
    eventDate: "2026-11-17", status: "APPROVED", createdAt: "2026-11-17T21:15:00+07:00", updatedAt: "2026-11-18T09:00:00+07:00",
    secret: { question: "What is the lock screen picture?", answer: "A beach at sunset" },
  }),
  post({
    id: "lf-6", kind: "FOUND", category: "WALLET", ownerId: "u-citizen-3",
    title: "Brown wallet found", description: "Brown wallet found on a market bench. Some cash inside.",
    photoUrls: ["/mock/lf/wallet-found.webp"], provinceId: "phnom-penh", cityId: "chamkar-mon",
    place: "Russian Market, food court", approxLocation: { lat: 11.539, lng: 104.918 },
    eventDate: "2026-11-18", status: "POSTED", createdAt: "2026-11-18T15:20:00+07:00",
    secret: { question: "What photo is inside the wallet?", answer: "A white cat" },
  }),
  post({
    id: "lf-7", kind: "FOUND", category: "BAG", ownerId: "u-citizen-sr",
    title: "Black backpack left at a cafe", description: "Black backpack with a laptop sleeve.",
    photoUrls: ["/mock/lf/backpack-black.webp"], provinceId: "siem-reap", cityId: "siem-reap-city",
    place: "Pub Street, Siem Reap", approxLocation: { lat: 13.355, lng: 103.855 },
    eventDate: "2026-11-16", status: "POSTED", createdAt: "2026-11-16T22:00:00+07:00",
    secret: { question: "What is written on the inside label?", answer: "Initials K.S. in blue marker" },
  }),
  post({
    id: "lf-8", kind: "LOST", category: "PASSPORT", ownerId: "u-citizen-bb",
    title: "Passport lost at bus station", description: "Cambodian passport in a green cover.",
    photoUrls: [], provinceId: "battambang", cityId: "battambang-city",
    place: "Battambang bus station", approxLocation: { lat: 13.096, lng: 103.199 },
    eventDate: "2026-11-15", status: "POSTED", createdAt: "2026-11-15T08:30:00+07:00",
  }),
  post({
    id: "lf-9", kind: "FOUND", category: "MOTO_PLATE", ownerId: "u-citizen-2",
    title: "Moto plate found after flood", description: "Plate came off during the flood.",
    photoUrls: [], provinceId: "phnom-penh", cityId: "mean-chey",
    place: "Near Stung Meanchey bridge", approxLocation: { lat: 11.521, lng: 104.93 },
    eventDate: "2026-11-12", status: "RETURNED", createdAt: "2026-11-12T07:30:00+07:00", updatedAt: "2026-11-14T17:00:00+07:00",
    secret: { answer: "Phnom Penh 1AB-2345" },
  }),
  post({
    id: "lf-10", kind: "LOST", category: "PET", ownerId: "u-citizen-sr",
    title: "Lost dog: brown, answers to 'Lucky'", description: "Small brown dog with a red collar. Very friendly.",
    photoUrls: ["/mock/lf/dog-brown.webp"], provinceId: "preah-sihanouk", cityId: "sihanoukville",
    place: "Otres Beach road", approxLocation: { lat: 10.574, lng: 103.555 },
    eventDate: "2026-11-14", status: "POSTED", createdAt: "2026-11-14T18:00:00+07:00",
  }),
  post({
    id: "lf-11", kind: "FOUND", category: "PHONE", ownerId: "u-citizen-bb",
    title: "Phone found at the riverside", description: "Old Nokia phone.",
    photoUrls: ["/mock/lf/phone-nokia.webp"], provinceId: "kampot", cityId: "kampot-city",
    place: "Kampot riverside", eventDate: "2026-09-10", status: "EXPIRED", createdAt: "2026-09-10T09:00:00+07:00",
    secret: { answer: "Sticker of a durian on the back" },
  }),
  post({
    id: "lf-12", kind: "FOUND", category: "OTHER", ownerId: "u-citizen-5",
    title: "Cheap phones for sale, call now", description: "Spam post used to show auto-hide.",
    photoUrls: [], provinceId: "phnom-penh", cityId: "tuol-kouk", place: "Toul Kork",
    eventDate: "2026-11-20", status: "POSTED", createdAt: "2026-11-20T10:00:00+07:00",
    secret: { answer: "n/a" }, reportedBy: ["u-citizen-1", "u-citizen-2", "u-citizen-3"], hidden: true,
  }),
];

export const LF_CLAIMS: LfClaim[] = [
  {
    id: "lfc-1", postId: "lf-1", claimantId: "u-citizen-1", status: "PENDING",
    description: "It's my ID. I lost it at Psar Thmei on Wednesday.", answer: "Sok Dara, 14/04/2001",
    createdAt: "2026-11-20T08:00:00+07:00",
  },
  {
    id: "lfc-2", postId: "lf-5", claimantId: "u-citizen-2", status: "APPROVED",
    description: "Black phone, clear case, I left it in a tuk-tuk on St. 315.", answer: "Beach at sunset",
    createdAt: "2026-11-18T07:30:00+07:00", decidedAt: "2026-11-18T09:00:00+07:00",
    pickup: { place: "Boeng Kak 2 Sangkat office", time: "2026-11-22T10:00:00+07:00", note: "Bring your ID" },
  },
  {
    id: "lfc-3", postId: "lf-7", claimantId: "u-citizen-3", status: "REJECTED",
    description: "I lost a black bag in Siem Reap.", answer: "No label",
    rejectReason: "Label does not match", createdAt: "2026-11-17T10:00:00+07:00", decidedAt: "2026-11-17T12:00:00+07:00",
  },
  {
    id: "lfc-4", postId: "lf-9", claimantId: "u-citizen-3", status: "COMPLETED",
    description: "My plate, 1AB-2345, lost in the flood.", createdAt: "2026-11-13T08:00:00+07:00",
    decidedAt: "2026-11-13T12:00:00+07:00",
    pickup: { place: "Mean Chey police post", time: "2026-11-14T16:00:00+07:00" },
  },
];

export const LF_COMMENTS: LfComment[] = [
  {
    id: "lfm-1", postId: "lf-4", authorId: "u-citizen-3", type: "SIGHTING",
    body: "I saw a brown wallet on a bench at the food court. I posted it as found.",
    sightingPlace: "Russian Market food court", reportedBy: [], hidden: false, deleted: false,
    createdAt: "2026-11-18T15:30:00+07:00",
  },
  {
    id: "lfm-2", postId: "lf-10", authorId: "u-citizen-bb", type: "SIGHTING",
    body: "A small brown dog with a red collar was near the beach bars this morning.",
    sightingPlace: "Otres 1 beach bars", sightingLocation: { lat: 10.577, lng: 103.552 },
    reportedBy: [], hidden: false, deleted: false, createdAt: "2026-11-15T09:00:00+07:00",
  },
  {
    id: "lfm-3", postId: "lf-2", authorId: "u-citizen-1", type: "COMMENT",
    body: "Shared this in our Sen Sok Telegram group.", reportedBy: [], hidden: false, deleted: false,
    createdAt: "2026-11-20T19:00:00+07:00",
  },
];

export const LF_NOTIFICATIONS: AppNotification[] = [
  { id: "n-lf-1", userId: "u-citizen-3", type: "LF_CLAIM_RECEIVED", postId: "lf-1", claimId: "lfc-1", read: false,
    createdAt: "2026-11-20T08:00:00+07:00",
    message: { km: "មានអ្នកទាមទារ \"អត្តសញ្ញាណប័ណ្ណ\" ដែលអ្នករកឃើញ", en: "Someone claimed the National ID card you found" } },
  { id: "n-lf-2", userId: "u-citizen-2", type: "LF_PICKUP_SET", postId: "lf-5", claimId: "lfc-2", read: false,
    createdAt: "2026-11-18T09:05:00+07:00",
    message: { km: "ការទាមទាររបស់អ្នកត្រូវបានយល់ព្រម។ ទីកន្លែងទទួល៖ សាលាសង្កាត់បឹងកក់២", en: "Your claim was approved. Pickup: Boeng Kak 2 Sangkat office" } },
  { id: "n-lf-3", userId: "u-citizen-5", type: "LF_MATCH", postId: "lf-3", read: false,
    createdAt: "2026-11-20T21:00:00+07:00",
    message: { km: "យើងរកឃើញការប្រកាសដែលអាចត្រូវនឹង \"កូនសោ\" របស់អ្នក", en: "We found a post that may match your lost keys" } },
];
