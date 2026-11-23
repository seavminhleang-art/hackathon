// Community & Services seed data. All people, phone numbers and posts are fake.
// Guide steps and fees are ILLUSTRATIVE ONLY: verify with the official source
// before showing them to real users. "Today" in the demo is around 2026-11-21.

import type {
  AppNotification,
  CsAnnouncement,
  CsComment,
  CsEditSuggestion,
  CsGroup,
  CsGuide,
  CsMember,
  CsPlace,
  CsPlaceTypeMeta,
  CsPost,
  CsReaction,
  CsWasteSchedule,
  OpeningHours,
} from "@/types";
import { CITIES } from "./locations";

// ---------- helpers ----------

const GOV_HOURS: OpeningHours = {
  mon: [{ open: "07:30", close: "11:30" }, { open: "14:00", close: "17:00" }],
  tue: [{ open: "07:30", close: "11:30" }, { open: "14:00", close: "17:00" }],
  wed: [{ open: "07:30", close: "11:30" }, { open: "14:00", close: "17:00" }],
  thu: [{ open: "07:30", close: "11:30" }, { open: "14:00", close: "17:00" }],
  fri: [{ open: "07:30", close: "11:30" }, { open: "14:00", close: "17:00" }],
  sat: [],
  sun: [],
};

const SERVICE_HOURS: OpeningHours = {
  ...GOV_HOURS,
  mon: [{ open: "07:30", close: "17:00" }],
  tue: [{ open: "07:30", close: "17:00" }],
  wed: [{ open: "07:30", close: "17:00" }],
  thu: [{ open: "07:30", close: "17:00" }],
  fri: [{ open: "07:30", close: "17:00" }],
  sat: [{ open: "07:30", close: "11:30" }],
};

const ALWAYS_OPEN: OpeningHours = {
  mon: [{ open: "00:00", close: "24:00" }],
  tue: [{ open: "00:00", close: "24:00" }],
  wed: [{ open: "00:00", close: "24:00" }],
  thu: [{ open: "00:00", close: "24:00" }],
  fri: [{ open: "00:00", close: "24:00" }],
  sat: [{ open: "00:00", close: "24:00" }],
  sun: [{ open: "00:00", close: "24:00" }],
};

export const noReactions = (): Record<CsReaction, string[]> => ({ LIKE: [], HELPFUL: [] });

// ---------- A. Service directory ----------

export const CS_PLACE_TYPES: CsPlaceTypeMeta[] = [
  { id: "SANGKAT_OFFICE", icon: "🏛️", label: { km: "សាលាសង្កាត់/ឃុំ", en: "Sangkat / commune office" } },
  { id: "KHAN_OFFICE", icon: "🏢", label: { km: "សាលាខណ្ឌ/ស្រុក", en: "Khan / district hall" } },
  { id: "PROVINCIAL_HALL", icon: "🏯", label: { km: "សាលារាជធានី/ខេត្ត", en: "City / provincial hall" } },
  { id: "ONE_WINDOW_OFFICE", icon: "🪟", label: { km: "ការិយាល័យច្រកចេញចូលតែមួយ", en: "One Window Service Office" } },
  { id: "WATER_OFFICE", icon: "🚰", label: { km: "ការិយាល័យផ្គត់ផ្គង់ទឹក", en: "Water utility office" } },
  { id: "ELECTRICITY_OFFICE", icon: "⚡", label: { km: "ការិយាល័យអគ្គិសនី", en: "Electricity office" } },
  { id: "POST_OFFICE", icon: "📮", label: { km: "ប្រៃសណីយ៍", en: "Post office" } },
  { id: "WASTE_POINT", icon: "♻️", label: { km: "ចំណុចប្រមូលសំរាម", en: "Waste collection point" } },
  { id: "PUBLIC_LIBRARY", icon: "📚", label: { km: "បណ្ណាល័យសាធារណៈ", en: "Public library" } },
  { id: "COMMUNITY_CENTER", icon: "🏘️", label: { km: "មណ្ឌលសហគមន៍", en: "Community center" } },
  { id: "OTHER", icon: "📍", label: { km: "ផ្សេងៗ", en: "Other" } },
];

const U = "2026-11-01T08:00:00+07:00";

export const CS_PLACES: CsPlace[] = [
  { id: "pl-1", type: "SANGKAT_OFFICE", name: { km: "សាលាសង្កាត់បឹងកក់២", en: "Boeng Kak 2 Sangkat office" },
    provinceId: "phnom-penh", cityId: "tuol-kouk", sangkat: "Boeng Kak 2", address: "St. 289, Tuol Kouk",
    location: { lat: 11.579, lng: 104.901 }, phone: "023 000 101", hours: GOV_HOURS,
    guideIds: ["g-birth", "g-residence"], verified: true, updatedAt: U },
  { id: "pl-2", type: "KHAN_OFFICE", name: { km: "សាលាខណ្ឌទួលគោក", en: "Tuol Kouk Khan hall" },
    provinceId: "phnom-penh", cityId: "tuol-kouk", address: "Tuol Kouk", location: { lat: 11.5825, lng: 104.8985 },
    phone: "023 000 102", hours: GOV_HOURS, guideIds: ["g-national-id", "g-residence"], verified: true, updatedAt: U },
  { id: "pl-3", type: "SANGKAT_OFFICE", name: { km: "សាលាសង្កាត់ទន្លេបាសាក់", en: "Tonle Bassac Sangkat office" },
    provinceId: "phnom-penh", cityId: "chamkar-mon", sangkat: "Tonle Bassac", address: "Chamkar Mon",
    location: { lat: 11.547, lng: 104.929 }, phone: "023 000 103", hours: GOV_HOURS,
    guideIds: ["g-birth", "g-residence"], verified: true, updatedAt: U },
  { id: "pl-4", type: "PROVINCIAL_HALL", name: { km: "សាលារាជធានីភ្នំពេញ", en: "Phnom Penh City Hall" },
    provinceId: "phnom-penh", cityId: "doun-penh", address: "Doun Penh", location: { lat: 11.5696, lng: 104.9214 },
    phone: "023 000 104", hours: GOV_HOURS, guideIds: [], verified: true, updatedAt: U },
  { id: "pl-5", type: "ONE_WINDOW_OFFICE", name: { km: "ការិយាល័យច្រកចេញចូលតែមួយ រាជធានីភ្នំពេញ", en: "Phnom Penh One Window Service Office" },
    provinceId: "phnom-penh", cityId: "doun-penh", address: "Doun Penh", location: { lat: 11.5701, lng: 104.9221 },
    phone: "023 000 105", hours: SERVICE_HOURS, guideIds: ["g-business"], verified: true, updatedAt: U },
  { id: "pl-6", type: "WATER_OFFICE", name: { km: "ការិយាល័យអតិថិជនទឹក", en: "Water utility customer office" },
    provinceId: "phnom-penh", cityId: "doun-penh", address: "Doun Penh", location: { lat: 11.5755, lng: 104.9168 },
    phone: "023 000 106", hours: SERVICE_HOURS, guideIds: ["g-water"], verified: true, updatedAt: U },
  { id: "pl-7", type: "ELECTRICITY_OFFICE", name: { km: "ការិយាល័យអតិថិជនអគ្គិសនី សែនសុខ", en: "Electricity customer office, Sen Sok" },
    provinceId: "phnom-penh", cityId: "sen-sok", address: "Sen Sok", location: { lat: 11.5935, lng: 104.8761 },
    phone: "023 000 107", hours: SERVICE_HOURS, guideIds: [], verified: false, updatedAt: U },
  { id: "pl-8", type: "POST_OFFICE", name: { km: "ប្រៃសណីយ៍កណ្ដាល", en: "Central Post Office" },
    provinceId: "phnom-penh", cityId: "doun-penh", address: "Near Wat Phnom", location: { lat: 11.5745, lng: 104.9245 },
    phone: "023 000 108", hours: SERVICE_HOURS, guideIds: [], verified: true, updatedAt: U },
  { id: "pl-9", type: "WASTE_POINT", name: { km: "ចំណុចប្រមូលសំរាម សែនសុខ", en: "Sen Sok waste drop-off point" },
    provinceId: "phnom-penh", cityId: "sen-sok", address: "Sen Sok", location: { lat: 11.5899, lng: 104.8701 },
    hours: ALWAYS_OPEN, guideIds: [], note: { km: "សូមចងថង់ឲ្យជាប់", en: "Tie bags closed" }, verified: true, updatedAt: U },
  { id: "pl-10", type: "PROVINCIAL_HALL", name: { km: "សាលាខេត្តសៀមរាប", en: "Siem Reap Provincial Hall" },
    provinceId: "siem-reap", cityId: "siem-reap-city", address: "Siem Reap City", location: { lat: 13.3615, lng: 103.8597 },
    phone: "063 000 110", hours: GOV_HOURS, guideIds: ["g-national-id"], verified: true, updatedAt: U },
  { id: "pl-11", type: "ONE_WINDOW_OFFICE", name: { km: "ការិយាល័យច្រកចេញចូលតែមួយ ខេត្តបាត់ដំបង", en: "Battambang One Window Service Office" },
    provinceId: "battambang", cityId: "battambang-city", address: "Battambang City", location: { lat: 13.0957, lng: 103.2022 },
    phone: "053 000 111", hours: SERVICE_HOURS, guideIds: ["g-business"], verified: true, updatedAt: U },
  { id: "pl-12", type: "PUBLIC_LIBRARY", name: { km: "បណ្ណាល័យសាធារណៈកំពត", en: "Kampot public library" },
    provinceId: "kampot", cityId: "kampot-city", address: "Kampot riverside", location: { lat: 10.6104, lng: 104.1801 },
    hours: SERVICE_HOURS, guideIds: [], verified: false, updatedAt: U },
];

export const CS_WASTE_SCHEDULES: CsWasteSchedule[] = [
  { id: "ws-1", provinceId: "phnom-penh", cityId: "tuol-kouk", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    timeWindow: { from: "18:00", to: "22:00" }, collectorPhone: "023 000 201",
    note: { km: "ដាក់សំរាមមុនម៉ោង ១៨:០០", en: "Put bags out before 18:00" } },
  { id: "ws-2", provinceId: "phnom-penh", cityId: "chamkar-mon", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    timeWindow: { from: "19:00", to: "23:00" }, collectorPhone: "023 000 202" },
  { id: "ws-3", provinceId: "phnom-penh", cityId: "sen-sok", days: ["mon", "wed", "fri"],
    timeWindow: { from: "06:00", to: "09:00" }, collectorPhone: "023 000 203",
    note: { km: "ប្រមូលពេលព្រឹក", en: "Morning pickup" } },
  { id: "ws-4", provinceId: "siem-reap", cityId: "siem-reap-city", days: ["tue", "thu", "sat"],
    timeWindow: { from: "07:00", to: "10:00" } },
];

export const CS_EDITS: CsEditSuggestion[] = [
  { id: "ed-1", placeId: "pl-7", userId: "u-citizen-3", field: "HOURS", value: "Mon–Sat 07:30–17:00",
    note: "Open on Saturday morning too", status: "PENDING", createdAt: "2026-11-19T09:00:00+07:00" },
  { id: "ed-2", placeId: "pl-1", userId: "u-citizen-1", field: "PHONE", value: "023 000 199",
    note: "The old number does not answer", status: "PENDING", createdAt: "2026-11-20T10:00:00+07:00" },
];

// ---------- B. Government service guides (ILLUSTRATIVE) ----------

const FEE_NOTE = { km: "តម្លៃអាចប្រែប្រួល សូមផ្ទៀងផ្ទាត់នៅការិយាល័យ", en: "Fees can change. Check at the office." };
const V = "2026-11-01";

export const CS_GUIDES: CsGuide[] = [
  {
    id: "g-national-id", category: "IDENTITY",
    title: { km: "ធ្វើ ឬប្តូរអត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ", en: "Get or renew a Khmer National ID card" },
    summary: { km: "សម្រាប់ពលរដ្ឋអាយុ ១៥ឆ្នាំឡើង ឬប័ណ្ណផុតកំណត់/បាត់", en: "For citizens 15+ or when a card has expired or been lost." },
    steps: [
      { title: { km: "រៀបចំឯកសារ", en: "Prepare documents" } },
      { title: { km: "ទៅប៉ុស្តិ៍ ឬការិយាល័យដែលទទួលធ្វើអត្តសញ្ញាណប័ណ្ណ", en: "Go to the office that handles ID cards" } },
      { title: { km: "ថតរូប និងស្កេនស្នាមម្រាមដៃ", en: "Photo and fingerprints are taken" } },
      { title: { km: "មកយកប័ណ្ណតាមកាលបរិច្ឆេទដែលបានប្រាប់", en: "Collect the card on the given date" } },
    ],
    requiredDocuments: [
      { km: "សៀវភៅស្នាក់នៅ ឬសៀវភៅគ្រួសារ", en: "Residence book or family book" },
      { km: "សំបុត្រកំណើត", en: "Birth certificate" },
      { km: "អត្តសញ្ញាណប័ណ្ណចាស់ (បើមាន)", en: "Old ID card (if any)" },
      { km: "លិខិតបញ្ជាក់បាត់ (បើបាត់)", en: "Loss report (if lost)" },
    ],
    feeRiel: null, feeNote: FEE_NOTE,
    processingTime: { km: "ប្រហែល ២–៤ សប្តាហ៍", en: "About 2–4 weeks" },
    whereTypes: ["KHAN_OFFICE", "PROVINCIAL_HALL"], sourceName: "Ministry of Interior",
    lastVerified: V, helpfulBy: ["u-citizen-1", "u-citizen-2", "u-citizen-3"], updatedAt: U,
  },
  {
    id: "g-birth", category: "CIVIL_REGISTRATION",
    title: { km: "ចុះបញ្ជីកំណើត និងសុំសំបុត្រកំណើត", en: "Register a birth and get a birth certificate" },
    summary: { km: "គួរចុះបញ្ជីក្នុងរយៈពេល ៣០ថ្ងៃ បន្ទាប់ពីកំណើត", en: "Register soon after the birth (ask your sangkat about the deadline)." },
    steps: [
      { title: { km: "យកលិខិតបញ្ជាក់កំណើតពីមន្ទីរពេទ្យ ឬឆ្មប", en: "Get the birth notice from the hospital or midwife" } },
      { title: { km: "ទៅសាលាសង្កាត់/ឃុំ ដែលរស់នៅ", en: "Go to your sangkat / commune office" } },
      { title: { km: "បំពេញពាក្យសុំ", en: "Fill in the application" } },
      { title: { km: "ទទួលសំបុត្រកំណើត", en: "Receive the birth certificate" } },
    ],
    requiredDocuments: [
      { km: "លិខិតបញ្ជាក់កំណើត", en: "Birth notice from hospital or midwife" },
      { km: "អត្តសញ្ញាណប័ណ្ណឪពុកម្តាយ", en: "Parents' ID cards" },
      { km: "សៀវភៅគ្រួសារ", en: "Family book" },
    ],
    feeRiel: null, feeNote: FEE_NOTE,
    processingTime: { km: "ជាធម្មតាថ្ងៃតែមួយ", en: "Usually the same day" },
    whereTypes: ["SANGKAT_OFFICE"], sourceName: "Ministry of Interior (civil registration)",
    lastVerified: V, helpfulBy: ["u-citizen-2"], updatedAt: U,
  },
  {
    id: "g-residence", category: "CIVIL_REGISTRATION",
    title: { km: "សុំសៀវភៅស្នាក់នៅ / សៀវភៅគ្រួសារ", en: "Get a residence book / family book" },
    summary: { km: "ចាំបាច់សម្រាប់ធ្វើអត្តសញ្ញាណប័ណ្ណ និងសេវាផ្សេងៗ", en: "Needed for the ID card and many other services." },
    steps: [
      { title: { km: "ទៅសាលាសង្កាត់ដែលរស់នៅ", en: "Go to your sangkat office" } },
      { title: { km: "ផ្តល់ឯកសារ និងបំពេញពាក្យសុំ", en: "Hand in documents and the application" } },
      { title: { km: "មន្ត្រីពិនិត្យអាសយដ្ឋាន", en: "An official checks the address" } },
      { title: { km: "ទទួលសៀវភៅ", en: "Collect the book" } },
    ],
    requiredDocuments: [
      { km: "អត្តសញ្ញាណប័ណ្ណ ឬសំបុត្រកំណើតសមាជិកគ្រួសារ", en: "ID cards or birth certificates of family members" },
      { km: "ឯកសារបញ្ជាក់កម្មសិទ្ធិ ឬកិច្ចសន្យាជួលផ្ទះ", en: "Property document or rental contract" },
    ],
    feeRiel: null, feeNote: FEE_NOTE,
    processingTime: { km: "ប្រហែល ១–២ សប្តាហ៍", en: "About 1–2 weeks" },
    whereTypes: ["SANGKAT_OFFICE", "KHAN_OFFICE"], sourceName: "Ministry of Interior",
    lastVerified: V, helpfulBy: [], updatedAt: U,
  },
  {
    id: "g-moto-plate", category: "VEHICLE",
    title: { km: "ចុះបញ្ជី និងសុំស្លាកលេខម៉ូតូ", en: "Register a motorbike and get a plate" },
    summary: { km: "សម្រាប់ម៉ូតូថ្មី ឬម៉ូតូដែលទិញបន្ត", en: "For new or second-hand motorbikes." },
    steps: [
      { title: { km: "រៀបចំឯកសារទិញលក់ និងពន្ធ", en: "Prepare sale and tax documents" } },
      { title: { km: "ទៅការិយាល័យចុះបញ្ជីយានយន្ត", en: "Go to the vehicle registration office" } },
      { title: { km: "ត្រួតពិនិត្យម៉ូតូ", en: "Vehicle inspection" } },
      { title: { km: "ទទួលស្លាកលេខ និងកាតគ្រីក្រហម", en: "Receive the plate and registration card" } },
    ],
    requiredDocuments: [
      { km: "អត្តសញ្ញាណប័ណ្ណម្ចាស់", en: "Owner's ID card" },
      { km: "វិក្កយបត្រ ឬលិខិតទិញលក់", en: "Invoice or sale document" },
      { km: "បង្កាន់ដៃបង់ពន្ធ", en: "Tax payment receipt" },
    ],
    feeRiel: null, feeNote: FEE_NOTE,
    processingTime: { km: "ប្រហែល ១–២ សប្តាហ៍", en: "About 1–2 weeks" },
    whereTypes: ["PROVINCIAL_HALL"], sourceName: "Ministry of Public Works and Transport",
    lastVerified: V, helpfulBy: ["u-citizen-3"], updatedAt: U,
  },
  {
    id: "g-business", category: "BUSINESS",
    title: { km: "សុំអាជ្ញាប័ណ្ណអាជីវកម្មខ្នាតតូច", en: "Get a small business licence" },
    summary: { km: "សម្រាប់ហាងតូច និងសេវាកម្មក្នុងសហគមន៍", en: "For small shops and local services." },
    steps: [
      { title: { km: "ទៅការិយាល័យច្រកចេញចូលតែមួយ", en: "Go to the One Window Service Office" } },
      { title: { km: "សួរប្រភេទអាជ្ញាប័ណ្ណដែលត្រូវការ", en: "Ask which licence type you need" } },
      { title: { km: "ដាក់ពាក្យ និងឯកសារ", en: "Submit the application and documents" } },
      { title: { km: "បង់ថ្លៃ និងទទួលអាជ្ញាប័ណ្ណ", en: "Pay and receive the licence" } },
    ],
    requiredDocuments: [
      { km: "អត្តសញ្ញាណប័ណ្ណ", en: "ID card" },
      { km: "ឯកសារទីតាំងអាជីវកម្ម", en: "Business location document" },
    ],
    feeRiel: null, feeNote: FEE_NOTE,
    processingTime: { km: "អាស្រ័យលើប្រភេទ", en: "Depends on licence type" },
    whereTypes: ["ONE_WINDOW_OFFICE"], sourceName: "One Window Service Office",
    lastVerified: V, helpfulBy: [], updatedAt: U,
  },
  {
    id: "g-water", category: "UTILITIES",
    title: { km: "សុំតភ្ជាប់ទឹកស្អាតថ្មី", en: "Request a new water connection" },
    summary: { km: "សម្រាប់ផ្ទះ ឬហាងថ្មី", en: "For a new home or shop." },
    steps: [
      { title: { km: "ទៅការិយាល័យអតិថិជនទឹក", en: "Visit the water utility customer office" } },
      { title: { km: "បំពេញពាក្យសុំ", en: "Fill in the request form" } },
      { title: { km: "បុគ្គលិកមកវាស់វែងទីតាំង", en: "Staff survey the site" } },
      { title: { km: "បង់ថ្លៃ និងតភ្ជាប់", en: "Pay and get connected" } },
    ],
    requiredDocuments: [
      { km: "អត្តសញ្ញាណប័ណ្ណ", en: "ID card" },
      { km: "ឯកសារកម្មសិទ្ធិ ឬកិច្ចសន្យាជួល", en: "Property document or rental contract" },
    ],
    feeRiel: null, feeNote: FEE_NOTE,
    processingTime: { km: "ប្រហែល ១–៣ សប្តាហ៍", en: "About 1–3 weeks" },
    whereTypes: ["WATER_OFFICE"], sourceName: "Local water utility",
    lastVerified: V, helpfulBy: [], updatedAt: U,
  },
];

// ---------- C. Announcements and alerts ----------

export const CS_ANNOUNCEMENTS: CsAnnouncement[] = [
  {
    // Public alert published from emergency incident em-4 (feature 2).
    id: "an-7", level: "ALERT", category: "FIRE", authorId: "u-admin-1", pinned: true, commentsEnabled: false,
    incidentId: "em-4", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "russey-keo" },
    title: { km: "អគ្គិភ័យនៅផ្សារឫស្សីកែវ", en: "Fire at Russey Keo market" },
    body: { km: "សូមជៀសវាងតំបន់នេះ។ ក្រុមពន្លត់អគ្គិភ័យកំពុងធ្វើការ", en: "Avoid the area. Firefighters are on site." },
    validFrom: "2026-11-21T07:00:00+07:00", validTo: "2026-11-22T07:00:00+07:00", createdAt: "2026-11-21T07:00:00+07:00",
  },
  {
    id: "an-1", level: "ALERT", category: "FLOOD", authorId: "u-admin-1", pinned: true, commentsEnabled: false,
    scope: { level: "PROVINCE", provinceId: "phnom-penh" },
    title: { km: "ប្រកាសអាសន្ន៖ ភ្លៀងធ្លាក់ខ្លាំង", en: "Alert: heavy rain expected" },
    body: { km: "សូមជៀសវាងផ្លូវទាប និងរាយការណ៍លូស្ទះភ្លាមៗ", en: "Avoid low roads and report blocked drains right away." },
    validFrom: "2026-11-21T06:00:00+07:00", validTo: "2026-11-30T06:00:00+07:00", createdAt: "2026-11-21T06:00:00+07:00",
  },
  {
    id: "an-2", level: "WARNING", category: "ROAD_CLOSURE", authorId: "u-officer-1", pinned: false, commentsEnabled: true,
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" },
    title: { km: "បិទផ្លូវ ២៨៩ ជាបណ្ដោះអាសន្ន", en: "St. 289 partly closed" },
    body: { km: "ជួសជុលលូ ពីថ្ងៃទី២២ ដល់ ២៥ វិច្ឆិកា", en: "Drain repair from 22 to 25 November. Use St. 315 instead." },
    validFrom: "2026-11-20T08:00:00+07:00", validTo: "2026-11-25T18:00:00+07:00", createdAt: "2026-11-20T08:00:00+07:00",
  },
  {
    id: "an-3", level: "INFO", category: "WASTE", authorId: "u-officer-2", pinned: false, commentsEnabled: true,
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "chamkar-mon" },
    title: { km: "ប្តូរម៉ោងប្រមូលសំរាម", en: "Waste pickup time change" },
    body: { km: "ចាប់ពីថ្ងៃទី១ ធ្នូ ប្រមូលពីម៉ោង ១៩:០០", en: "From 1 December, pickup starts at 19:00." },
    validFrom: "2026-11-18T08:00:00+07:00", validTo: "2026-12-15T00:00:00+07:00", createdAt: "2026-11-18T08:00:00+07:00",
  },
  {
    id: "an-4", level: "INFO", category: "GENERAL", authorId: "u-admin-1", pinned: false, commentsEnabled: true,
    scope: { level: "NATIONAL" },
    title: { km: "កម្មវិធីសំឡេងក្រុង ឥឡូវមានទូទាំងប្រទេស", en: "CityVoice now covers every province" },
    body: { km: "រកមើលសេវា និងប្រកាសរបស់បាត់បាន ទូទាំង ២៥ ខេត្តក្រុង", en: "Find services and lost items across all 25 provinces." },
    validFrom: "2026-11-15T08:00:00+07:00", createdAt: "2026-11-15T08:00:00+07:00",
  },
  {
    id: "an-5", level: "INFO", category: "HEALTH", authorId: "u-officer-1", pinned: false, commentsEnabled: true,
    scope: { level: "SANGKAT", provinceId: "phnom-penh", cityId: "tuol-kouk", sangkat: "Boeng Kak 2" },
    title: { km: "ការពារជំងឺគ្រុនឈាម", en: "Dengue prevention week" },
    body: { km: "សូមសម្អាតទឹកដក់ជុំវិញផ្ទះ", en: "Please empty standing water around your home." },
    validFrom: "2026-11-17T08:00:00+07:00", validTo: "2026-11-30T00:00:00+07:00", createdAt: "2026-11-17T08:00:00+07:00",
  },
  {
    id: "an-6", level: "WARNING", category: "UTILITY_OUTAGE", authorId: "u-admin-1", pinned: false, commentsEnabled: false,
    scope: { level: "CITY", provinceId: "kampot", cityId: "kampot-city" },
    title: { km: "ផ្តាច់ចរន្តអគ្គិសនី", en: "Planned power cut" },
    body: { km: "ថែទាំខ្សែបណ្តាញ", en: "Grid maintenance." },
    validFrom: "2026-11-01T07:00:00+07:00", validTo: "2026-11-01T17:00:00+07:00", createdAt: "2026-10-30T08:00:00+07:00",
  },
];

// ---------- E. Community groups ----------

/** One AREA group per city / khan, created automatically. */
export const CS_AREA_GROUPS: CsGroup[] = CITIES.map((c) => ({
  id: `grp-area-${c.id}`,
  kind: "AREA",
  name: { km: `អ្នកជិតខាង ${c.name.km}`, en: `${c.name.en} neighbours` },
  description: { km: `ព័ត៌មាន និងការជួយគ្នាក្នុង ${c.name.km}`, en: `News and help between neighbours in ${c.name.en}.` },
  scope: { level: "CITY", provinceId: c.provinceId, cityId: c.id },
  createdAt: "2026-11-01T00:00:00+07:00",
}));

export const CS_INTEREST_GROUPS: CsGroup[] = [
  { id: "grp-cleanup-sensok", kind: "INTEREST", createdBy: "u-citizen-3", createdAt: "2026-11-02T09:00:00+07:00",
    name: { km: "ក្រុមស្ម័គ្រចិត្តសម្អាតសែនសុខ", en: "Sen Sok clean-up volunteers" },
    description: { km: "សម្អាតសហគមន៍រៀងរាល់ចុងសប្តាហ៍", en: "Weekend clean-ups around Sen Sok." },
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "sen-sok" }, rules: "Be kind. No selling." },
  { id: "grp-parents-tk", kind: "INTEREST", createdBy: "u-citizen-1", createdAt: "2026-11-03T09:00:00+07:00",
    name: { km: "មាតាបិតាទួលគោក", en: "Tuol Kouk parents" },
    description: { km: "សុវត្ថិភាពចរាចរណ៍ជុំវិញសាលារៀន", en: "School safety and traffic around schools." },
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" } },
  { id: "grp-vendors-psar-thmei", kind: "INTEREST", createdBy: "u-citizen-2", createdAt: "2026-11-04T09:00:00+07:00",
    name: { km: "អាជីវករផ្សារធំថ្មី", en: "Psar Thmei vendors" },
    description: { km: "ព័ត៌មានសម្រាប់អាជីវករផ្សារ", en: "News and tips for market vendors." },
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "doun-penh" } },
  { id: "grp-sr-volunteers", kind: "INTEREST", createdBy: "u-citizen-sr", createdAt: "2026-11-05T09:00:00+07:00",
    name: { km: "ស្ម័គ្រចិត្តសៀមរាប", en: "Siem Reap volunteers" },
    description: { km: "ជួយសហគមន៍ និងភ្ញៀវទេសចរ", en: "Helping the community and visitors." },
    scope: { level: "PROVINCE", provinceId: "siem-reap" } },
];

const J = "2026-11-05T10:00:00+07:00";

export const CS_MEMBERS: CsMember[] = [
  { groupId: "grp-cleanup-sensok", userId: "u-citizen-3", role: "OWNER", joinedAt: J },
  { groupId: "grp-cleanup-sensok", userId: "u-citizen-5", role: "MODERATOR", joinedAt: J },
  { groupId: "grp-cleanup-sensok", userId: "u-citizen-1", role: "MEMBER", joinedAt: J },
  { groupId: "grp-parents-tk", userId: "u-citizen-1", role: "OWNER", joinedAt: J },
  { groupId: "grp-parents-tk", userId: "u-officer-1", role: "MEMBER", joinedAt: J },
  { groupId: "grp-vendors-psar-thmei", userId: "u-citizen-2", role: "OWNER", joinedAt: J },
  { groupId: "grp-sr-volunteers", userId: "u-citizen-sr", role: "OWNER", joinedAt: J },
  { groupId: "grp-sr-volunteers", userId: "u-citizen-bb", role: "MEMBER", joinedAt: J },
  { groupId: "grp-area-tuol-kouk", userId: "u-citizen-1", role: "MEMBER", joinedAt: J },
  { groupId: "grp-area-tuol-kouk", userId: "u-officer-1", role: "MODERATOR", joinedAt: J },
  { groupId: "grp-area-chamkar-mon", userId: "u-citizen-2", role: "MEMBER", joinedAt: J },
  { groupId: "grp-area-sen-sok", userId: "u-citizen-3", role: "MEMBER", joinedAt: J },
  { groupId: "grp-area-sen-sok", userId: "u-citizen-5", role: "MEMBER", joinedAt: J },
];

// ---------- D. Community board ----------

function post(p: Omit<CsPost, "reactions" | "reportedBy" | "hidden" | "updatedAt" | "photoUrls" | "pinned"> & Partial<CsPost>): CsPost {
  return { photoUrls: [], pinned: false, reactions: noReactions(), reportedBy: [], hidden: false, updatedAt: p.createdAt, ...p };
}

export const CS_POSTS: CsPost[] = [
  post({
    id: "cp-1", type: "EVENT", authorId: "u-citizen-3", groupId: "grp-cleanup-sensok",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "sen-sok" },
    title: "Sunday clean-up at the Sen Sok canal", body: "Gloves and bags provided. Meet at the pagoda gate.",
    event: { start: "2026-11-29T07:00:00+07:00", end: "2026-11-29T10:00:00+07:00", place: "Sen Sok pagoda gate",
      location: { lat: 11.591, lng: 104.871 }, capacity: 30, going: ["u-citizen-3", "u-citizen-5"], interested: ["u-citizen-1"] },
    reactions: { LIKE: ["u-citizen-1", "u-citizen-5"], HELPFUL: [] }, createdAt: "2026-11-18T09:00:00+07:00",
  }),
  post({
    id: "cp-2", type: "POLL", authorId: "u-citizen-1", groupId: "grp-area-tuol-kouk",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" },
    title: "Best day for the monthly market clean-up?", body: "Vote so we can pick a day with the sangkat.",
    poll: { closesAt: "2026-11-28T20:00:00+07:00", options: [
      { id: "o1", label: "Saturday morning", voterIds: ["u-citizen-1", "u-officer-1"] },
      { id: "o2", label: "Sunday morning", voterIds: [] },
      { id: "o3", label: "Weekday evening", voterIds: [] },
    ] },
    createdAt: "2026-11-19T19:00:00+07:00",
  }),
  post({
    id: "cp-3", type: "QUESTION", authorId: "u-citizen-2", groupId: "grp-area-chamkar-mon",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "chamkar-mon" },
    title: "Where do I renew my National ID in Chamkar Mon?", body: "My card expires next month.",
    acceptedCommentId: "cc-3", createdAt: "2026-11-16T08:00:00+07:00",
  }),
  post({
    id: "cp-4", type: "DISCUSSION", authorId: "u-citizen-1", groupId: "grp-parents-tk",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" },
    title: "Traffic at the school gate at 7am", body: "Can we ask for a traffic officer at the gate in the morning?",
    reactions: { LIKE: ["u-officer-1"], HELPFUL: [] }, createdAt: "2026-11-17T07:30:00+07:00",
  }),
  post({
    id: "cp-5", type: "EVENT", authorId: "u-officer-1", pinned: true,
    scope: { level: "SANGKAT", provinceId: "phnom-penh", cityId: "tuol-kouk", sangkat: "Boeng Kak 2" },
    title: "Free dengue prevention talk", body: "Health staff will explain how to stop mosquitoes breeding.",
    event: { start: "2026-11-26T15:00:00+07:00", end: "2026-11-26T16:30:00+07:00", place: "Boeng Kak 2 Sangkat office",
      location: { lat: 11.579, lng: 104.901 }, going: ["u-citizen-1"], interested: [] },
    createdAt: "2026-11-18T10:00:00+07:00",
  }),
  post({
    id: "cp-6", type: "DISCUSSION", authorId: "u-citizen-sr", groupId: "grp-sr-volunteers",
    scope: { level: "CITY", provinceId: "siem-reap", cityId: "siem-reap-city" },
    title: "Helping visitors find lost items", body: "Let's share Lost & Found posts in the old market area.",
    createdAt: "2026-11-19T12:00:00+07:00",
  }),
  post({
    id: "cp-7", type: "EVENT", authorId: "u-citizen-2", groupId: "grp-vendors-psar-thmei",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "doun-penh" },
    title: "Vendor meeting about new bins", body: "We met with the khan about more bins. Notes in comments.",
    event: { start: "2026-11-10T16:00:00+07:00", end: "2026-11-10T17:00:00+07:00", place: "Psar Thmei east hall",
      going: ["u-citizen-2"], interested: [] },
    createdAt: "2026-11-05T10:00:00+07:00",
  }),
  post({
    id: "cp-8", type: "DISCUSSION", authorId: "u-citizen-5", groupId: "grp-area-tuol-kouk",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" },
    title: "Cheap loans, message me", body: "Spam post used to show auto-hide.",
    reportedBy: ["u-citizen-1", "u-citizen-2", "u-officer-1"], hidden: true, createdAt: "2026-11-20T11:00:00+07:00",
  }),
];

const c = (x: Omit<CsComment, "reactions" | "reportedBy" | "hidden" | "deleted"> & Partial<CsComment>): CsComment => ({
  reactions: noReactions(), reportedBy: [], hidden: false, deleted: false, ...x,
});

export const CS_COMMENTS: CsComment[] = [
  c({ id: "cc-1", targetType: "POST", targetId: "cp-1", authorId: "u-citizen-1", body: "I'll bring my two kids!", createdAt: "2026-11-18T12:00:00+07:00" }),
  c({ id: "cc-2", targetType: "POST", targetId: "cp-1", parentId: "cc-1", authorId: "u-citizen-3", body: "Great, we have small gloves too.", createdAt: "2026-11-18T13:00:00+07:00" }),
  c({ id: "cc-3", targetType: "POST", targetId: "cp-3", authorId: "u-officer-2",
    body: "Go to the khan hall. Bring your residence book and old card. See the National ID guide.",
    reactions: { LIKE: [], HELPFUL: ["u-citizen-2"] }, createdAt: "2026-11-16T09:30:00+07:00" }),
  c({ id: "cc-4", targetType: "POST", targetId: "cp-4", authorId: "u-officer-1", body: "I'll raise this with the traffic police this week.", createdAt: "2026-11-17T10:00:00+07:00" }),
  c({ id: "cc-5", targetType: "GUIDE", targetId: "g-national-id", authorId: "u-citizen-3", body: "Can I do this in another province?", createdAt: "2026-11-12T10:00:00+07:00" }),
  c({ id: "cc-6", targetType: "GUIDE", targetId: "g-national-id", parentId: "cc-5", authorId: "u-admin-1",
    body: "Usually where your residence is registered. Ask the office first.", createdAt: "2026-11-12T14:00:00+07:00" }),
  c({ id: "cc-7", targetType: "ANNOUNCEMENT", targetId: "an-2", authorId: "u-citizen-1", body: "Will motorbikes still get through?", createdAt: "2026-11-20T09:00:00+07:00" }),
];

export const CS_NOTIFICATIONS: AppNotification[] = [
  { id: "n-cs-1", userId: "u-citizen-1", type: "CS_ALERT", announcementId: "an-1", read: false, createdAt: "2026-11-21T06:00:00+07:00",
    message: { km: "ប្រកាសអាសន្ន៖ ភ្លៀងធ្លាក់ខ្លាំង", en: "Alert: heavy rain expected" } },
  { id: "n-cs-2", userId: "u-citizen-2", type: "CS_COMMENT", csPostId: "cp-3", read: true, createdAt: "2026-11-16T09:30:00+07:00",
    message: { km: "មន្ត្រីបានឆ្លើយសំណួររបស់អ្នក", en: "An official answered your question" } },
];
