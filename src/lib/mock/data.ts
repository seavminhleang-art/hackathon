// Seed data for the mock API. All people, phones and reports are fake.
// Demo accounts (mock only, password for all: "demo1234"):
//   Citizen: 012000001   Officer: 012000002   Admin: 012000003

import type {
  Announcement,
  AppNotification,
  CategoryMeta,
  CityService,
  EmergencyContact,
  Report,
  UserRecord,
} from "@/types";

export const DEMO_PASSWORD = "demo1234";

export { PROVINCES, CITIES } from "./locations";

export const PHNOM_PENH_CENTER = { lat: 11.5564, lng: 104.9282 };

// ---------- Report categories ----------

export const CATEGORIES: CategoryMeta[] = [
  { id: "DRAIN_BLOCKED", icon: "🕳️", defaultUrgency: "MEDIUM", emergency: false,
    label: { km: "លូស្ទះ", en: "Blocked drain" },
    agency: { km: "មន្ទីរសាធារណការ និងដឹកជញ្ជូន", en: "Dept. of Public Works & Transport" } },
  { id: "FLOODING", icon: "🌊", defaultUrgency: "HIGH", emergency: false,
    label: { km: "ទឹកជំនន់", en: "Flooding" },
    agency: { km: "មន្ទីរសាធារណការ និងដឹកជញ្ជូន", en: "Dept. of Public Works & Transport" } },
  { id: "WASTE_OVERFLOW", icon: "🗑️", defaultUrgency: "MEDIUM", emergency: false,
    label: { km: "សំរាមហៀរ / ខ្វះធុងសំរាម", en: "Overflowing rubbish / no bins" },
    agency: { km: "រដ្ឋបាលខណ្ឌ / ក្រុមហ៊ុនប្រមូលសំរាម", en: "Khan admin / waste collector" } },
  { id: "ILLEGAL_DUMPING", icon: "🚯", defaultUrgency: "LOW", emergency: false,
    label: { km: "ចាក់សំរាមខុសច្បាប់", en: "Illegal dumping" },
    agency: { km: "រដ្ឋបាលខណ្ឌ", en: "Khan administration" } },
  { id: "POTHOLE", icon: "🚧", defaultUrgency: "LOW", emergency: false,
    label: { km: "ផ្លូវខូច / រណ្តៅ", en: "Pothole / damaged road" },
    agency: { km: "មន្ទីរសាធារណការ និងដឹកជញ្ជូន", en: "Dept. of Public Works & Transport" } },
  { id: "STREETLIGHT", icon: "💡", defaultUrgency: "LOW", emergency: false,
    label: { km: "ភ្លើងបំភ្លឺផ្លូវខូច", en: "Broken streetlight" },
    agency: { km: "រដ្ឋបាលរាជធានី", en: "City Hall" } },
  { id: "TRAFFIC_JAM", icon: "🚦", defaultUrgency: "LOW", emergency: false,
    label: { km: "ស្ទះចរាចរណ៍", en: "Traffic jam" },
    agency: { km: "ប៉ូលិសចរាចរណ៍", en: "Traffic police" } },
  { id: "ROAD_CRASH", icon: "🏍️", defaultUrgency: "HIGH", emergency: true,
    label: { km: "គ្រោះថ្នាក់ចរាចរណ៍", en: "Road crash" },
    agency: { km: "ប៉ូលិសចរាចរណ៍ / សង្គ្រោះបន្ទាន់", en: "Traffic police / ambulance" } },
  { id: "NEED_POLICE", icon: "🚓", defaultUrgency: "HIGH", emergency: true,
    label: { km: "ត្រូវការប៉ូលិស", en: "Need police" },
    agency: { km: "ប៉ូលិសប៉ុស្តិ៍", en: "Local police post" } },
  { id: "OTHER", icon: "📌", defaultUrgency: "LOW", emergency: false,
    label: { km: "ផ្សេងៗ", en: "Other" },
    agency: { km: "រដ្ឋបាលសង្កាត់", en: "Sangkat office" } },
];

// ---------- Emergency numbers ----------

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "police", number: "117", icon: "🚓", name: { km: "ប៉ូលិស", en: "Police" } },
  { id: "fire", number: "118", icon: "🚒", name: { km: "អគ្គិភ័យ", en: "Fire" } },
  { id: "ambulance", number: "119", icon: "🚑", name: { km: "សង្គ្រោះបន្ទាន់", en: "Ambulance" } },
];

// ---------- Users ----------

export const USERS: UserRecord[] = [
  { id: "u-citizen-1", fullName: "សុខ ដារ៉ា", phone: "012000001", email: "dara@example.com", role: "CITIZEN",
    provinceId: "phnom-penh", cityId: "tuol-kouk", sangkat: "Boeng Kak 2", preferredLocale: "km", createdAt: "2026-10-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-officer-1", fullName: "ចាន់ វិចិត្រ", phone: "012000002", role: "OFFICER",
    provinceId: "phnom-penh", cityId: "tuol-kouk", preferredLocale: "km", createdAt: "2026-09-15T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-admin-1", fullName: "ហេង សុភា", phone: "012000003", role: "ADMIN",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "km", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-citizen-2", fullName: "លី ស្រីពៅ", phone: "012000004", role: "CITIZEN",
    provinceId: "phnom-penh", cityId: "chamkar-mon", preferredLocale: "km", createdAt: "2026-10-05T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-citizen-3", fullName: "Kim Sokha", phone: "012000005", role: "CITIZEN",
    provinceId: "phnom-penh", cityId: "sen-sok", preferredLocale: "en", createdAt: "2026-10-12T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-officer-2", fullName: "ពេជ្រ រតនា", phone: "012000006", role: "OFFICER",
    provinceId: "phnom-penh", cityId: "chamkar-mon", preferredLocale: "km", createdAt: "2026-09-20T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-citizen-5", fullName: "ម៉ៅ វិបុល", phone: "012000009", role: "CITIZEN",
    provinceId: "phnom-penh", cityId: "sen-sok", preferredLocale: "km", createdAt: "2026-11-01T08:00:00+07:00", password: DEMO_PASSWORD },
  // Users outside Phnom Penh (Lost & Found is national)
  { id: "u-citizen-sr", fullName: "ចាន់ សុផល", phone: "012000007", role: "CITIZEN",
    provinceId: "siem-reap", cityId: "siem-reap-city", preferredLocale: "km", createdAt: "2026-10-20T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-citizen-bb", fullName: "Vann Rithy", phone: "012000008", role: "CITIZEN",
    provinceId: "battambang", cityId: "battambang-city", preferredLocale: "en", createdAt: "2026-10-22T08:00:00+07:00", password: DEMO_PASSWORD },
];

// ---------- Reports ----------

const OFFICER = "u-officer-1";
const OFFICER_2 = "u-officer-2";

export const REPORTS: Report[] = [
  {
    id: "r-1001", reporterId: "u-citizen-1", category: "DRAIN_BLOCKED", urgency: "HIGH",
    title: "លូស្ទះដោយសំរាម ទឹកឡើងដល់កជើង", description: "Drain grate fully covered with plastic bags. Water rises fast when it rains.",
    location: { lat: 11.5795, lng: 104.8992 }, cityId: "tuol-kouk", addressHint: "St. 289 near Toul Kork market",
    photoUrl: "/mock/drain-1.jpg", status: "FIXED", assignedTo: OFFICER, upvotes: 23,
    createdAt: "2026-11-10T07:12:00+07:00", updatedAt: "2026-11-11T15:40:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-1", at: "2026-11-10T07:12:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", note: "Sent to Tuol Kouk drainage team", at: "2026-11-10T09:00:00+07:00" },
      { from: "ASSIGNED", to: "IN_PROGRESS", changedBy: OFFICER, at: "2026-11-11T08:30:00+07:00" },
      { from: "IN_PROGRESS", to: "FIXED", changedBy: OFFICER, note: "Drain cleared, 6 bags of waste removed", at: "2026-11-11T15:40:00+07:00" },
    ],
  },
  {
    id: "r-1002", reporterId: "u-citizen-2", category: "WASTE_OVERFLOW", urgency: "MEDIUM",
    title: "សំរាមគរលើចិញ្ចើមផ្លូវ ៣ថ្ងៃហើយ", description: "Rubbish pile not collected for 3 days, blocking the sidewalk.",
    location: { lat: 11.5462, lng: 104.9198 }, cityId: "chamkar-mon", addressHint: "Near BKK1 St. 51",
    photoUrl: "/mock/waste-1.jpg", status: "ASSIGNED", assignedTo: OFFICER_2, upvotes: 11,
    createdAt: "2026-11-19T18:05:00+07:00", updatedAt: "2026-11-20T08:15:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-2", at: "2026-11-19T18:05:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", at: "2026-11-20T08:15:00+07:00" },
    ],
  },
  {
    id: "r-1003", reporterId: "u-citizen-3", category: "POTHOLE", urgency: "MEDIUM",
    title: "Big pothole on Hanoi Friendship Blvd", description: "Deep hole in the right lane. Two motos almost fell this morning.",
    location: { lat: 11.5921, lng: 104.8735 }, cityId: "sen-sok",
    photoUrl: "/mock/pothole-1.jpg", status: "REPORTED", upvotes: 7,
    createdAt: "2026-11-20T07:45:00+07:00", updatedAt: "2026-11-20T07:45:00+07:00",
    history: [{ from: null, to: "REPORTED", changedBy: "u-citizen-3", at: "2026-11-20T07:45:00+07:00" }],
  },
  {
    id: "r-1004", reporterId: "u-citizen-1", category: "TRAFFIC_JAM", urgency: "LOW",
    title: "ស្ទះចរាចរណ៍ខ្លាំង ភ្លើងស្តុបខូច", description: "Traffic light at the intersection is off. Heavy jam at rush hour.",
    location: { lat: 11.5687, lng: 104.9015 }, cityId: "tuol-kouk", addressHint: "Russian Blvd x Monivong",
    status: "IN_PROGRESS", assignedTo: OFFICER, upvotes: 15,
    createdAt: "2026-11-21T07:20:00+07:00", updatedAt: "2026-11-21T07:50:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-1", at: "2026-11-21T07:20:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", at: "2026-11-21T07:30:00+07:00" },
      { from: "ASSIGNED", to: "IN_PROGRESS", changedBy: OFFICER, note: "Traffic officer on the way", at: "2026-11-21T07:50:00+07:00" },
    ],
  },
  {
    id: "r-1005", reporterId: "u-citizen-2", category: "FLOODING", urgency: "HIGH",
    title: "ទឹកលិចផ្លូវ ម៉ូតូឆ្លងកាត់មិនរួច", description: "Street flooded about 40cm after heavy rain. Motos stalling.",
    location: { lat: 11.5205, lng: 104.9310 }, cityId: "mean-chey", addressHint: "Near Chbar Ampov bridge",
    photoUrl: "/mock/flood-1.jpg", status: "ASSIGNED", assignedTo: OFFICER_2, upvotes: 31,
    createdAt: "2026-11-18T16:30:00+07:00", updatedAt: "2026-11-18T17:10:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-2", at: "2026-11-18T16:30:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", note: "Pump truck requested", at: "2026-11-18T17:10:00+07:00" },
    ],
  },
  {
    id: "r-1006", reporterId: "u-citizen-3", category: "STREETLIGHT", urgency: "LOW",
    title: "Streetlights off for a week", description: "Whole block is dark at night. Feels unsafe walking home.",
    location: { lat: 11.5880, lng: 104.8690 }, cityId: "sen-sok",
    status: "REPORTED", upvotes: 4,
    createdAt: "2026-11-17T21:00:00+07:00", updatedAt: "2026-11-17T21:00:00+07:00",
    history: [{ from: null, to: "REPORTED", changedBy: "u-citizen-3", at: "2026-11-17T21:00:00+07:00" }],
  },
  {
    id: "r-1007", reporterId: "u-citizen-1", category: "ILLEGAL_DUMPING", urgency: "LOW",
    title: "គេចាក់សំរាមក្នុងដីទំនេរ", description: "People dump construction waste in an empty lot every night.",
    location: { lat: 11.6150, lng: 104.9050 }, cityId: "russey-keo",
    photoUrl: "/mock/dump-1.jpg", status: "REJECTED", upvotes: 2,
    createdAt: "2026-11-05T10:00:00+07:00", updatedAt: "2026-11-06T09:00:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-1", at: "2026-11-05T10:00:00+07:00" },
      { from: "REPORTED", to: "REJECTED", changedBy: "u-admin-1", note: "Private land: owner notified directly", at: "2026-11-06T09:00:00+07:00" },
    ],
  },
  {
    id: "r-1008", reporterId: "u-citizen-2", category: "ROAD_CRASH", urgency: "HIGH",
    title: "គ្រោះថ្នាក់ម៉ូតូ២ បុកគ្នា", description: "Two motorbikes crashed. One rider injured, ambulance called (119).",
    location: { lat: 11.5530, lng: 104.9300 }, cityId: "boeng-keng-kang", addressHint: "Norodom Blvd near Independence Monument",
    status: "FIXED", assignedTo: OFFICER_2, upvotes: 9,
    createdAt: "2026-11-15T19:10:00+07:00", updatedAt: "2026-11-15T19:55:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-2", at: "2026-11-15T19:10:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", at: "2026-11-15T19:13:00+07:00" },
      { from: "ASSIGNED", to: "FIXED", changedBy: OFFICER_2, note: "Scene cleared, rider taken to Calmette", at: "2026-11-15T19:55:00+07:00" },
    ],
  },
  {
    id: "r-1009", reporterId: "u-citizen-3", category: "WASTE_OVERFLOW", urgency: "MEDIUM",
    title: "No public bins near the park", description: "Lots of people eat here in the evening but there are no bins.",
    location: { lat: 11.5640, lng: 104.9300 }, cityId: "doun-penh", addressHint: "Riverside park",
    status: "REPORTED", upvotes: 18,
    createdAt: "2026-11-20T20:30:00+07:00", updatedAt: "2026-11-20T20:30:00+07:00",
    history: [{ from: null, to: "REPORTED", changedBy: "u-citizen-3", at: "2026-11-20T20:30:00+07:00" }],
  },
  {
    id: "r-1010", reporterId: "u-citizen-1", category: "DRAIN_BLOCKED", urgency: "MEDIUM",
    title: "គម្របលូបាក់", description: "Drain cover is broken. Risk for children and motos.",
    location: { lat: 11.5370, lng: 104.9480 }, cityId: "chbar-ampov",
    photoUrl: "/mock/drain-2.jpg", status: "IN_PROGRESS", assignedTo: OFFICER, upvotes: 6,
    createdAt: "2026-11-16T11:00:00+07:00", updatedAt: "2026-11-19T10:00:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-1", at: "2026-11-16T11:00:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", at: "2026-11-17T08:00:00+07:00" },
      { from: "ASSIGNED", to: "IN_PROGRESS", changedBy: OFFICER, note: "New cover ordered", at: "2026-11-19T10:00:00+07:00" },
    ],
  },
  {
    id: "r-1011", reporterId: "u-citizen-2", category: "NEED_POLICE", urgency: "HIGH",
    title: "មានការឈ្លោះប្រកែកគ្នាខ្លាំង", description: "Loud fight outside a karaoke bar, bottles thrown.",
    location: { lat: 11.5420, lng: 104.8300 }, cityId: "pou-senchey",
    status: "FIXED", assignedTo: OFFICER_2, upvotes: 3,
    createdAt: "2026-11-14T23:05:00+07:00", updatedAt: "2026-11-14T23:40:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-2", at: "2026-11-14T23:05:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", at: "2026-11-14T23:07:00+07:00" },
      { from: "ASSIGNED", to: "FIXED", changedBy: OFFICER_2, note: "Police post responded", at: "2026-11-14T23:40:00+07:00" },
    ],
  },
  {
    id: "r-1012", reporterId: "u-citizen-3", category: "POTHOLE", urgency: "LOW",
    title: "Road cracked after rainy season", description: "Many small holes along the street.",
    location: { lat: 11.6000, lng: 104.9380 }, cityId: "chroy-changvar",
    status: "REPORTED", upvotes: 5,
    createdAt: "2026-11-19T09:20:00+07:00", updatedAt: "2026-11-19T09:20:00+07:00",
    history: [{ from: null, to: "REPORTED", changedBy: "u-citizen-3", at: "2026-11-19T09:20:00+07:00" }],
  },
  {
    id: "r-1013", reporterId: "u-citizen-1", category: "WASTE_OVERFLOW", urgency: "MEDIUM",
    title: "ធុងសំរាមពេញហៀរ ក្លិនស្អុយ", description: "Community bin overflowing, strong smell, dogs spreading it.",
    location: { lat: 11.4960, lng: 104.8700 }, cityId: "dangkao",
    photoUrl: "/mock/waste-2.jpg", status: "FIXED", assignedTo: OFFICER, upvotes: 12,
    createdAt: "2026-11-08T06:40:00+07:00", updatedAt: "2026-11-09T07:00:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-1", at: "2026-11-08T06:40:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", at: "2026-11-08T08:00:00+07:00" },
      { from: "ASSIGNED", to: "FIXED", changedBy: OFFICER, note: "Collected, schedule changed to daily", at: "2026-11-09T07:00:00+07:00" },
    ],
  },
  {
    id: "r-1014", reporterId: "u-citizen-2", category: "FLOODING", urgency: "MEDIUM",
    title: "ទឹកដក់យូរ មិនស្រក", description: "Water stays for 2 days after rain, mosquitoes breeding.",
    location: { lat: 11.6600, lng: 104.8750 }, cityId: "prek-pnov",
    status: "REPORTED", upvotes: 8,
    createdAt: "2026-11-21T06:30:00+07:00", updatedAt: "2026-11-21T06:30:00+07:00",
    history: [{ from: null, to: "REPORTED", changedBy: "u-citizen-2", at: "2026-11-21T06:30:00+07:00" }],
  },
  {
    id: "r-1015", reporterId: "u-citizen-3", category: "OTHER", urgency: "LOW",
    title: "Fallen tree branch on sidewalk", description: "Big branch blocking half the sidewalk.",
    location: { lat: 11.5310, lng: 104.7830 }, cityId: "kamboul",
    status: "ASSIGNED", assignedTo: OFFICER, upvotes: 1,
    createdAt: "2026-11-20T15:00:00+07:00", updatedAt: "2026-11-21T08:00:00+07:00",
    history: [
      { from: null, to: "REPORTED", changedBy: "u-citizen-3", at: "2026-11-20T15:00:00+07:00" },
      { from: "REPORTED", to: "ASSIGNED", changedBy: "u-admin-1", at: "2026-11-21T08:00:00+07:00" },
    ],
  },
];

// ---------- Notifications ----------

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n-1", userId: "u-citizen-1", type: "REPORT_STATUS", reportId: "r-1001", read: false, createdAt: "2026-11-11T15:40:00+07:00",
    message: { km: "របាយការណ៍ \"លូស្ទះ\" របស់អ្នកត្រូវបានដោះស្រាយរួចរាល់ ✅", en: "Your \"Blocked drain\" report is fixed ✅" } },
  { id: "n-2", userId: "u-citizen-1", type: "REPORT_STATUS", reportId: "r-1004", read: false, createdAt: "2026-11-21T07:50:00+07:00",
    message: { km: "មន្ត្រីកំពុងដោះស្រាយរបាយការណ៍ \"ស្ទះចរាចរណ៍\" របស់អ្នក", en: "An officer is working on your \"Traffic jam\" report" } },
  { id: "n-3", userId: "u-citizen-2", type: "REPORT_STATUS", reportId: "r-1002", read: true, createdAt: "2026-11-20T08:15:00+07:00",
    message: { km: "របាយការណ៍ \"សំរាមហៀរ\" ត្រូវបានបញ្ជូនទៅមន្ត្រី", en: "Your \"Overflowing rubbish\" report was assigned" } },
];

// Lost & Found seed data: see ./lost-found.ts

// ---------- Community & services ----------

export const SERVICES: CityService[] = [
  { id: "s-1", type: "WASTE_SCHEDULE", cityId: "tuol-kouk", name: { km: "ម៉ោងប្រមូលសំរាម ទួលគោក", en: "Tuol Kouk waste pickup" },
    hours: "Daily 18:00–22:00", note: { km: "ដាក់សំរាមមុនម៉ោង ១៨:០០", en: "Put bags out before 18:00" } },
  { id: "s-2", type: "WASTE_SCHEDULE", cityId: "chamkar-mon", name: { km: "ម៉ោងប្រមូលសំរាម ចំការមន", en: "Chamkar Mon waste pickup" },
    hours: "Daily 19:00–23:00" },
  { id: "s-3", type: "HOSPITAL", cityId: "doun-penh", name: { km: "មន្ទីរពេទ្យកាល់ម៉ែត", en: "Calmette Hospital" },
    location: { lat: 11.5818, lng: 104.9172 }, phone: "023426948", hours: "24/7" },
  { id: "s-4", type: "SANGKAT_OFFICE", cityId: "tuol-kouk", name: { km: "សាលាសង្កាត់បឹងកក់២", en: "Boeng Kak 2 Sangkat office" },
    location: { lat: 11.5790, lng: 104.9010 }, hours: "Mon–Fri 07:30–17:00" },
  { id: "s-5", type: "POLICE_POST", cityId: "boeng-keng-kang", name: { km: "ប៉ុស្តិ៍ប៉ូលិសបឹងកេងកង១", en: "BKK1 police post" },
    location: { lat: 11.5530, lng: 104.9260 }, phone: "117", hours: "24/7" },
];

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "a-1", level: "ALERT", createdAt: "2026-11-21T06:00:00+07:00",
    title: { km: "ប្រកាសអាសន្ន៖ ភ្លៀងធ្លាក់ខ្លាំង", en: "Alert: heavy rain expected" },
    body: { km: "សូមជៀសវាងផ្លូវទាប និងរាយការណ៍លូស្ទះភ្លាមៗ", en: "Avoid low roads and report blocked drains right away." } },
  { id: "a-2", level: "INFO", cityId: "tuol-kouk", createdAt: "2026-11-19T09:00:00+07:00",
    title: { km: "យុទ្ធនាការសម្អាតសង្កាត់", en: "Sangkat clean-up day" },
    body: { km: "ថ្ងៃអាទិត្យ ម៉ោង ៧ព្រឹក នៅផ្សារទួលគោក", en: "Sunday 7am at Toul Kork market. Gloves provided." } },
];
