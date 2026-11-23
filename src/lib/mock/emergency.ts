// Emergency seed data. All people, phone numbers and incidents are fake.
// Organization names are real public institutions used as examples, but every
// phone number here is a placeholder (023 000 3xx). Hotlines 117/118/119 are unverified, check before launch.
// "Today" in the demo is around 2026-11-21.

import type {
  AppNotification,
  EmDispatch,
  EmIncident,
  EmIncidentTypeMeta,
  EmNewsRelease,
  EmOrganization,
  EmTrustedContact,
  OpeningHours,
} from "@/types";

const H24: OpeningHours = {
  mon: [{ open: "00:00", close: "24:00" }],
  tue: [{ open: "00:00", close: "24:00" }],
  wed: [{ open: "00:00", close: "24:00" }],
  thu: [{ open: "00:00", close: "24:00" }],
  fri: [{ open: "00:00", close: "24:00" }],
  sat: [{ open: "00:00", close: "24:00" }],
  sun: [{ open: "00:00", close: "24:00" }],
};

const OFFICE: OpeningHours = {
  mon: [{ open: "08:00", close: "17:00" }],
  tue: [{ open: "08:00", close: "17:00" }],
  wed: [{ open: "08:00", close: "17:00" }],
  thu: [{ open: "08:00", close: "17:00" }],
  fri: [{ open: "08:00", close: "17:00" }],
  sat: [],
  sun: [],
};

// ---------- Incident types (routing rules) ----------

export const EM_INCIDENT_TYPES: EmIncidentTypeMeta[] = [
  { id: "ROAD_CRASH", icon: "🏍️", hotline: "119", routesTo: ["AMBULANCE", "POLICE"], defaultSeverity: "HIGH",
    label: { km: "គ្រោះថ្នាក់ចរាចរណ៍", en: "Road crash" } },
  { id: "FIRE", icon: "🔥", hotline: "118", routesTo: ["FIRE"], defaultSeverity: "CRITICAL",
    label: { km: "អគ្គិភ័យ", en: "Fire" } },
  { id: "MEDICAL", icon: "🚑", hotline: "119", routesTo: ["AMBULANCE", "HOSPITAL"], defaultSeverity: "HIGH",
    label: { km: "សង្គ្រោះបន្ទាន់វេជ្ជសាស្ត្រ", en: "Medical emergency" } },
  { id: "CRIME", icon: "🚓", hotline: "117", routesTo: ["POLICE"], defaultSeverity: "MEDIUM",
    label: { km: "បទល្មើស / ចោរកម្ម", en: "Crime / theft" } },
  { id: "VIOLENCE", icon: "⚠️", hotline: "117", routesTo: ["POLICE"], defaultSeverity: "HIGH",
    label: { km: "អំពើហិង្សា / ការវាយតប់", en: "Violence / fight" } },
  { id: "FLOOD_DANGER", icon: "🌊", hotline: "117", routesTo: ["RESCUE", "POLICE"], defaultSeverity: "HIGH",
    label: { km: "ទឹកជំនន់មានគ្រោះថ្នាក់", en: "Flood: people in danger" } },
  { id: "DROWNING", icon: "🛟", hotline: "119", routesTo: ["RESCUE", "AMBULANCE"], defaultSeverity: "CRITICAL",
    label: { km: "លង់ទឹក", en: "Drowning" } },
  { id: "BUILDING_COLLAPSE", icon: "🏚️", hotline: "118", routesTo: ["FIRE", "RESCUE", "AMBULANCE"], defaultSeverity: "CRITICAL",
    label: { km: "អគាររលំ", en: "Building collapse" } },
  { id: "ELECTRICAL_HAZARD", icon: "⚡", hotline: "118", routesTo: ["FIRE"], defaultSeverity: "MEDIUM",
    label: { km: "ខ្សែភ្លើងធ្លាក់ / ឆក់", en: "Fallen power line" } },
  { id: "MISSING_PERSON", icon: "🧒", hotline: "117", routesTo: ["POLICE"], defaultSeverity: "HIGH",
    label: { km: "មនុស្សបាត់ខ្លួន", en: "Missing person" } },
  { id: "OTHER", icon: "🆘", hotline: "117", routesTo: ["POLICE"], defaultSeverity: "MEDIUM",
    label: { km: "ផ្សេងៗ", en: "Other emergency" } },
];

// ---------- Organizations = emergency service directory ----------

const PP = "phnom-penh";

const VERIFIED_DATE = "2026-11-20T08:00:00+07:00";

export const EM_ORGANIZATIONS: EmOrganization[] = [
  { id: "org-police-pp", type: "POLICE", name: { km: "ស្នងការដ្ឋាននគរបាលរាជធានីភ្នំពេញ", en: "Phnom Penh Municipal Police" },
    provinceId: PP, cityId: "doun-penh", address: "Doun Penh", location: { lat: 11.5712, lng: 104.9198 },
    phone: "023 000 301", hotline: "117", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-police-tk", type: "POLICE", name: { km: "អធិការដ្ឋាននគរបាលខណ្ឌទួលគោក", en: "Tuol Kouk Police Inspectorate" },
    provinceId: PP, cityId: "tuol-kouk", address: "Tuol Kouk", location: { lat: 11.5818, lng: 104.8995 },
    phone: "023 000 302", hotline: "117", hours: H24, coverageCityIds: ["tuol-kouk"], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-police-bkk", type: "POLICE", name: { km: "អធិការដ្ឋាននគរបាលខណ្ឌបឹងកេងកង", en: "Boeng Keng Kang Police Inspectorate" },
    provinceId: PP, cityId: "boeng-keng-kang", address: "Boeng Keng Kang", location: { lat: 11.5535, lng: 104.9262 },
    phone: "023 000 303", hotline: "117", hours: H24, coverageCityIds: ["boeng-keng-kang", "chamkar-mon"], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-hosp-calmette", type: "HOSPITAL", name: { km: "មន្ទីរពេទ្យកាល់ម៉ែត", en: "Calmette Hospital" },
    provinceId: PP, cityId: "doun-penh", address: "Monivong Blvd, Doun Penh", location: { lat: 11.5818, lng: 104.9172 },
    phone: "023 000 311", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-hosp-ks", type: "HOSPITAL", name: { km: "មន្ទីរពេទ្យមិត្តភាពខ្មែរ-សូវៀត", en: "Khmer-Soviet Friendship Hospital" },
    provinceId: PP, cityId: "mean-chey", address: "Mean Chey", location: { lat: 11.5373, lng: 104.9135 },
    phone: "023 000 312", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-amb-pp", type: "AMBULANCE", name: { km: "សេវាសង្គ្រោះបន្ទាន់ ១១៩ ភ្នំពេញ", en: "Phnom Penh 119 ambulance service" },
    provinceId: PP, cityId: "doun-penh", address: "Doun Penh", location: { lat: 11.5795, lng: 104.9168 },
    phone: "023 000 321", hotline: "119", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-fire-pp", type: "FIRE", name: { km: "នាយកដ្ឋានពន្លត់អគ្គិភ័យ ភ្នំពេញ", en: "Phnom Penh Fire Department" },
    provinceId: PP, cityId: "prampir-makara", address: "Prampir Makara", location: { lat: 11.5649, lng: 104.9093 },
    phone: "023 000 331", hotline: "118", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-rescue-pp", type: "RESCUE", name: { km: "ក្រុមសង្គ្រោះ ភ្នំពេញ (សាកល្បង)", en: "Phnom Penh rescue team (demo)" },
    provinceId: PP, cityId: "chroy-changvar", address: "Chroy Changvar", location: { lat: 11.5989, lng: 104.9381 },
    phone: "023 000 341", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-hosp-sr", type: "HOSPITAL", name: { km: "មន្ទីរពេទ្យបង្អែកខេត្តសៀមរាប", en: "Siem Reap Provincial Hospital" },
    provinceId: "siem-reap", cityId: "siem-reap-city", address: "Siem Reap City", location: { lat: 13.3622, lng: 103.8552 },
    phone: "063 000 311", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-police-sr", type: "POLICE", name: { km: "ស្នងការដ្ឋាននគរបាលខេត្តសៀមរាប", en: "Siem Reap Provincial Police" },
    provinceId: "siem-reap", cityId: "siem-reap-city", address: "Siem Reap City", location: { lat: 13.3601, lng: 103.8601 },
    phone: "063 000 301", hotline: "117", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-hosp-bb", type: "HOSPITAL", name: { km: "មន្ទីរពេទ្យបង្អែកខេត្តបាត់ដំបង", en: "Battambang Provincial Hospital" },
    provinceId: "battambang", cityId: "battambang-city", address: "Battambang City", location: { lat: 13.0952, lng: 103.2003 },
    phone: "053 000 311", hours: H24, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
  { id: "org-news-demo", type: "NEWS", name: { km: "ព័ត៌មានសាកល្បង", en: "Demo News Cambodia" },
    provinceId: PP, cityId: "doun-penh", address: "Doun Penh", location: { lat: 11.567, lng: 104.925 },
    phone: "023 000 391", hours: OFFICE, coverageCityIds: [], verified: true, lastVerified: VERIFIED_DATE, active: true },
];

// ---------- Incidents ----------

const consent = (contact: boolean, news: boolean) => ({ shareContactWithResponders: contact, shareWithNews: news });

type RawIncident = Omit<EmIncident, "code" | "locationConfirmed" | "locationStatus" | "submittedByUserId" | "suggestedSeverity"> & Partial<EmIncident>;

const rawIncidents: RawIncident[] = [
  {
    id: "em-1", kind: "REPORT", reporterId: "u-citizen-2", type: "ROAD_CRASH", severity: "HIGH",
    description: "Two motorbikes crashed. One rider injured.", photoUrls: ["/mock/private/em-crash-1.jpg"],
    location: { lat: 11.553, lng: 104.93 }, locationSource: "GPS", accuracyM: 12, addressHint: "Norodom Blvd near Independence Monument",
    provinceId: PP, cityId: "boeng-keng-kang", occurredAt: "2026-11-15T19:05:00+07:00", peopleAffected: 2,
    consent: consent(true, true), status: "RESOLVED", verified: true, verifiedBy: "u-admin-1",
    history: [
      { status: "SUBMITTED", by: "u-citizen-2", at: "2026-11-15T19:10:00+07:00" },
      { status: "RECEIVED", by: "u-org-amb", organizationId: "org-amb-pp", at: "2026-11-15T19:11:00+07:00" },
      { status: "RESPONDING", by: "u-org-amb", organizationId: "org-amb-pp", note: "Ambulance on the way", at: "2026-11-15T19:12:00+07:00" },
      { status: "RESOLVED", by: "u-org-amb", organizationId: "org-amb-pp", note: "Rider taken to Calmette", at: "2026-11-15T19:55:00+07:00" },
    ],
    createdAt: "2026-11-15T19:10:00+07:00", updatedAt: "2026-11-15T19:55:00+07:00",
  },
  {
    id: "em-2", kind: "REPORT", reporterId: "u-citizen-2", type: "VIOLENCE", severity: "HIGH",
    description: "Loud fight outside a karaoke bar, bottles thrown.", photoUrls: [],
    location: { lat: 11.542, lng: 104.83 }, locationSource: "MAP", provinceId: PP, cityId: "pou-senchey",
    occurredAt: "2026-11-14T23:00:00+07:00", consent: consent(false, false), status: "RESOLVED", verified: true, verifiedBy: "u-admin-1",
    history: [
      { status: "SUBMITTED", by: "u-citizen-2", at: "2026-11-14T23:05:00+07:00" },
      { status: "ACKNOWLEDGED", by: "u-org-police", organizationId: "org-police-pp", at: "2026-11-14T23:07:00+07:00" },
      { status: "RESOLVED", by: "u-org-police", organizationId: "org-police-pp", note: "Police post responded", at: "2026-11-14T23:40:00+07:00" },
    ],
    createdAt: "2026-11-14T23:05:00+07:00", updatedAt: "2026-11-14T23:40:00+07:00",
  },
  {
    id: "em-3", kind: "SOS", reporterId: "u-citizen-1", type: "MEDICAL", severity: "CRITICAL",
    description: "SOS: elderly neighbour collapsed.", photoUrls: [],
    location: { lat: 11.5795, lng: 104.8992 }, locationSource: "GPS", accuracyM: 20, provinceId: PP, cityId: "tuol-kouk",
    occurredAt: "2026-11-21T07:55:00+07:00", consent: consent(true, false), status: "SUBMITTED", verified: false,
    history: [{ status: "SUBMITTED", by: "u-citizen-1", at: "2026-11-21T07:55:00+07:00" }],
    createdAt: "2026-11-21T07:55:00+07:00", updatedAt: "2026-11-21T07:55:00+07:00",
  },
  {
    id: "em-4", kind: "REPORT", reporterId: "u-citizen-3", type: "FIRE", severity: "CRITICAL",
    description: "Fire at a market stall, black smoke spreading.", photoUrls: ["/mock/em-fire-1.jpg"],
    location: { lat: 11.6141, lng: 104.9028 }, locationSource: "GPS", accuracyM: 15, addressHint: "Russey Keo market",
    provinceId: PP, cityId: "russey-keo", occurredAt: "2026-11-21T06:40:00+07:00",
    consent: consent(true, true), status: "RESPONDING", verified: true, verifiedBy: "u-admin-1", alertAnnouncementId: "an-7",
    history: [
      { status: "SUBMITTED", by: "u-citizen-3", at: "2026-11-21T06:42:00+07:00" },
      { status: "RECEIVED", by: "u-org-fire", organizationId: "org-fire-pp", at: "2026-11-21T06:43:00+07:00" },
      { status: "ACKNOWLEDGED", by: "u-org-fire", organizationId: "org-fire-pp", at: "2026-11-21T06:44:00+07:00" },
      { status: "RESPONDING", by: "u-org-fire", organizationId: "org-fire-pp", note: "2 fire trucks on site", at: "2026-11-21T06:55:00+07:00" },
    ],
    createdAt: "2026-11-21T06:42:00+07:00", updatedAt: "2026-11-21T06:55:00+07:00",
  },
  {
    id: "em-5", kind: "REPORT", reporterId: "u-citizen-2", type: "FLOOD_DANGER", severity: "HIGH",
    description: "Water up to the chest, family stuck on a roof.", photoUrls: [],
    location: { lat: 11.5199, lng: 104.9301 }, locationSource: "MAP", provinceId: PP, cityId: "mean-chey",
    occurredAt: "2026-11-21T05:30:00+07:00", peopleAffected: 4, consent: consent(true, false), status: "UNDER_REVIEW", verified: false,
    history: [
      { status: "SUBMITTED", by: "u-citizen-2", at: "2026-11-21T05:35:00+07:00" },
      { status: "RECEIVED", by: "u-org-police", organizationId: "org-police-pp", at: "2026-11-21T05:40:00+07:00" },
      { status: "UNDER_REVIEW", by: "SYSTEM", organizationId: "org-rescue-pp", note: "Checking boat availability", at: "2026-11-21T05:50:00+07:00" },
    ],
    createdAt: "2026-11-21T05:35:00+07:00", updatedAt: "2026-11-21T05:50:00+07:00",
  },
  {
    id: "em-6", kind: "REPORT", reporterId: "u-citizen-5", type: "CRIME", severity: "MEDIUM",
    description: "Someone stole the whole city.", photoUrls: [],
    location: { lat: 11.59, lng: 104.87 }, locationSource: "TEXT", provinceId: PP, cityId: "sen-sok",
    occurredAt: "2026-11-19T10:00:00+07:00", consent: consent(false, false), status: "REJECTED", verified: false,
    rejectReason: "Not a real incident",
    history: [
      { status: "SUBMITTED", by: "u-citizen-5", at: "2026-11-19T10:00:00+07:00" },
      { status: "REJECTED", by: "u-admin-1", note: "Not a real incident", at: "2026-11-19T10:30:00+07:00" },
    ],
    createdAt: "2026-11-19T10:00:00+07:00", updatedAt: "2026-11-19T10:30:00+07:00",
  },
  {
    id: "em-7", kind: "REPORT", reporterId: "u-citizen-1", type: "FIRE", severity: "HIGH",
    description: "Smoke near Russey Keo market.", photoUrls: [],
    location: { lat: 11.6138, lng: 104.9031 }, locationSource: "GPS", provinceId: PP, cityId: "russey-keo",
    occurredAt: "2026-11-21T06:45:00+07:00", consent: consent(false, false), status: "DUPLICATE", duplicateOf: "em-4", verified: false,
    history: [
      { status: "SUBMITTED", by: "u-citizen-1", at: "2026-11-21T06:46:00+07:00" },
      { status: "DUPLICATE", by: "u-admin-1", note: "Same fire as em-4", at: "2026-11-21T06:50:00+07:00" },
    ],
    createdAt: "2026-11-21T06:46:00+07:00", updatedAt: "2026-11-21T06:50:00+07:00",
  },
  {
    id: "em-8", kind: "SOS", reporterId: "u-citizen-3", type: "OTHER", severity: "CRITICAL",
    description: "SOS", photoUrls: [], location: { lat: 11.5916, lng: 104.8722 }, locationSource: "GPS",
    provinceId: PP, cityId: "sen-sok", occurredAt: "2026-11-18T22:10:00+07:00", consent: consent(true, false),
    status: "CANCELLED", cancelReason: "Pressed by mistake, I'm safe", verified: false,
    history: [
      { status: "SUBMITTED", by: "u-citizen-3", at: "2026-11-18T22:10:00+07:00" },
      { status: "CANCELLED", by: "u-citizen-3", note: "Pressed by mistake, I'm safe", at: "2026-11-18T22:11:00+07:00" },
    ],
    createdAt: "2026-11-18T22:10:00+07:00", updatedAt: "2026-11-18T22:11:00+07:00",
  },
];

export const EM_INCIDENTS: EmIncident[] = rawIncidents.map((x, idx) => ({
  code: `INC-2026-${String(idx + 1).padStart(5, "0")}`,
  locationConfirmed: x.locationSource !== "TEXT",
  locationStatus: x.locationSource === "GPS" ? "CONFIRMED" : x.locationSource === "MAP" ? "CONFIRMED" : "UNCONFIRMED",
  submittedByUserId: x.reporterId,
  suggestedSeverity: x.severity,
  ...x,
}));

const d = (x: Omit<EmDispatch, "channel" | "routedBy"> & Partial<EmDispatch>): EmDispatch => ({ channel: "IN_APP", routedBy: "SYSTEM", ...x });

export const EM_DISPATCHES: EmDispatch[] = [
  d({ id: "dp-1", incidentId: "em-1", organizationId: "org-amb-pp", status: "RESOLVED", responseInfo: "Rider taken to Calmette", sentAt: "2026-11-15T19:10:00+07:00", updatedAt: "2026-11-15T19:55:00+07:00" }),
  d({ id: "dp-2", incidentId: "em-1", organizationId: "org-police-bkk", status: "RESOLVED", sentAt: "2026-11-15T19:10:00+07:00", updatedAt: "2026-11-15T20:30:00+07:00" }),
  d({ id: "dp-3", incidentId: "em-2", organizationId: "org-police-pp", status: "RESOLVED", sentAt: "2026-11-14T23:05:00+07:00", updatedAt: "2026-11-14T23:40:00+07:00" }),
  d({ id: "dp-4", incidentId: "em-3", organizationId: "org-amb-pp", status: "SENT", sentAt: "2026-11-21T07:55:00+07:00", updatedAt: "2026-11-21T07:55:00+07:00" }),
  d({ id: "dp-5", incidentId: "em-3", organizationId: "org-hosp-calmette", status: "SENT", sentAt: "2026-11-21T07:55:00+07:00", updatedAt: "2026-11-21T07:55:00+07:00" }),
  d({ id: "dp-6", incidentId: "em-4", organizationId: "org-fire-pp", status: "RESPONDING", responseInfo: "2 fire trucks on site", sentAt: "2026-11-21T06:42:00+07:00", updatedAt: "2026-11-21T06:55:00+07:00" }),
  d({ id: "dp-7", incidentId: "em-5", organizationId: "org-rescue-pp", status: "UNDER_REVIEW", note: "Checking boat availability", sentAt: "2026-11-21T05:35:00+07:00", updatedAt: "2026-11-21T05:50:00+07:00" }),
  d({ id: "dp-8", incidentId: "em-5", organizationId: "org-police-pp", status: "RECEIVED", sentAt: "2026-11-21T05:35:00+07:00", updatedAt: "2026-11-21T05:40:00+07:00" }),
];

export const EM_TRUSTED_CONTACTS: EmTrustedContact[] = [
  {
    id: "tc-1", ownerId: "u-citizen-1", name: "លី ស្រីពៅ", phone: "+85512000004", relation: "Neighbour",
    priority: 1, status: "CONFIRMED", inviteSentAt: "2026-11-01T08:00:00+07:00",
    inviteExpiresAt: "2026-11-08T08:00:00+07:00", shareMedicalInfo: true,
    linkedUserId: "u-citizen-2", notifyOnSos: true, createdAt: "2026-11-01T08:00:00+07:00", updatedAt: "2026-11-01T08:00:00+07:00",
  },
  {
    id: "tc-2", ownerId: "u-citizen-1", name: "Mum", phone: "+85512888777", relation: "Mother",
    priority: 2, status: "CONFIRMED", inviteSentAt: "2026-11-01T08:00:00+07:00",
    inviteExpiresAt: "2026-11-08T08:00:00+07:00", shareMedicalInfo: true,
    notifyOnSos: true, createdAt: "2026-11-01T08:00:00+07:00", updatedAt: "2026-11-01T08:00:00+07:00",
  },
  {
    id: "tc-3", ownerId: "u-citizen-3", name: "Kim Dara", phone: "+85512777666", relation: "Brother",
    priority: 1, status: "CONFIRMED", inviteSentAt: "2026-11-02T08:00:00+07:00",
    inviteExpiresAt: "2026-11-09T08:00:00+07:00", shareMedicalInfo: false,
    notifyOnSos: true, createdAt: "2026-11-02T08:00:00+07:00", updatedAt: "2026-11-02T08:00:00+07:00",
  },
];

export const EM_NEWS_RELEASES: EmNewsRelease[] = [
  { id: "nr-1", incidentId: "em-1", type: "ROAD_CRASH",
    title: { km: "គ្រោះថ្នាក់ម៉ូតូ នៅមហាវិថីនរោត្តម", en: "Motorbike crash on Norodom Blvd" },
    summary: { km: "អ្នកបើកបរម្នាក់រងរបួស ត្រូវបានដឹកទៅមន្ទីរពេទ្យ", en: "One rider was injured and taken to hospital. Traffic is back to normal." },
    approxLocation: { lat: 11.553, lng: 104.93 }, provinceId: PP, cityId: "boeng-keng-kang",
    approvedPhotoUrls: [], approvedBy: "u-admin-1", publishedAt: "2026-11-15T21:00:00+07:00" },
];

export const EM_NOTIFICATIONS: AppNotification[] = [
  { id: "n-em-1", userId: "u-org-amb", type: "EM_NEW_INCIDENT", incidentId: "em-3", read: false, createdAt: "2026-11-21T07:55:00+07:00",
    message: { km: "SOS ថ្មី៖ សង្គ្រោះបន្ទាន់វេជ្ជសាស្ត្រ នៅទួលគោក", en: "New SOS: medical emergency in Tuol Kouk" } },
  { id: "n-em-2", userId: "u-org-calmette", type: "EM_NEW_INCIDENT", incidentId: "em-3", read: false, createdAt: "2026-11-21T07:55:00+07:00",
    message: { km: "SOS ថ្មី៖ សង្គ្រោះបន្ទាន់វេជ្ជសាស្ត្រ នៅទួលគោក", en: "New SOS: medical emergency in Tuol Kouk" } },
  { id: "n-em-3", userId: "u-citizen-2", type: "EM_SOS_CONTACT", incidentId: "em-3", read: false, createdAt: "2026-11-21T07:55:00+07:00",
    message: { km: "សុខ ដារ៉ា បានចុច SOS។ មើលទីតាំង", en: "សុខ ដារ៉ា pressed SOS. See their location." } },
  { id: "n-em-4", userId: "u-citizen-3", type: "EM_STATUS", incidentId: "em-4", read: false, createdAt: "2026-11-21T06:55:00+07:00",
    message: { km: "កំពុងឆ្លើយតប៖ ឡានពន្លត់អគ្គិភ័យ ២ គ្រឿងនៅកន្លែងកើតហេតុ", en: "Responding: 2 fire trucks on site" } },
];
