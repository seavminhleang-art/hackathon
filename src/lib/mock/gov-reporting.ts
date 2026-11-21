// Government reporting seed data. All people, reports and phone numbers are fake.
// "Today" in the demo is around 2026-11-21.

import type {
  AppNotification,
  GrCategoryMeta,
  GrComment,
  GrDepartment,
  GrHistoryEntry,
  GrPhoto,
  GrReport,
} from "@/types";
import { GR_RULES } from "@/types";

// ---------- Categories (hybrid routing hints) ----------

export const GR_CATEGORIES: GrCategoryMeta[] = [
  { id: "ROAD_TRANSPORT", icon: "🚧", departmentType: "ROAD_MAINTENANCE",
    label: { km: "ផ្លូវ និងដឹកជញ្ជូន", en: "Road & transportation" },
    examples: { km: "ផ្លូវខូច រណ្តៅ ភ្លើងស្តុបខូច ស្លាកសញ្ញា", en: "Potholes, damaged roads, broken traffic lights, signs" } },
  { id: "WASTE", icon: "🗑️", departmentType: "WASTE_MANAGEMENT",
    label: { km: "ការគ្រប់គ្រងសំរាម", en: "Waste management" },
    examples: { km: "សំរាមហៀរ ខ្វះធុងសំរាម ចាក់សំរាមខុសច្បាប់", en: "Overflowing rubbish, missing bins, illegal dumping" } },
  { id: "DRAINAGE_FLOODING", icon: "🌊", departmentType: "DRAINAGE",
    label: { km: "លូ និងទឹកជំនន់", en: "Drainage & flooding" },
    examples: { km: "លូស្ទះ គម្របលូបាក់ ទឹកដក់", en: "Blocked drains, broken drain covers, standing water" } },
  { id: "PUBLIC_LIGHTING", icon: "💡", departmentType: "PUBLIC_LIGHTING",
    label: { km: "ភ្លើងបំភ្លឺសាធារណៈ", en: "Public lighting" },
    examples: { km: "ភ្លើងបំភ្លឺផ្លូវខូច", en: "Broken or flickering streetlights" } },
  { id: "WATER", icon: "🚰", departmentType: "WATER_MANAGEMENT",
    label: { km: "បញ្ហាទឹក", en: "Water issues" },
    examples: { km: "បំពង់ទឹកលេច ទឹកមិនហូរ", en: "Leaking pipes, no water supply" } },
  { id: "PUBLIC_INFRASTRUCTURE", icon: "🏞️", departmentType: "PUBLIC_PARKS",
    label: { km: "ហេដ្ឋារចនាសម្ព័ន្ធសាធារណៈ", en: "Public infrastructure" },
    examples: { km: "សួនច្បារខូច ចិញ្ចើមផ្លូវ កៅអីសាធារណៈ", en: "Damaged parks, sidewalks, benches, fallen trees" } },
  { id: "OTHER", icon: "📌", departmentType: null,
    label: { km: "ផ្សេងៗ", en: "Other" },
    examples: { km: "បញ្ហាក្រុងផ្សេងទៀត", en: "Any other city problem" } },
];

// ---------- Departments ----------

const PP = "phnom-penh";

export const GR_DEPARTMENTS: GrDepartment[] = [
  { id: "dep-road-pp", type: "ROAD_MAINTENANCE", provinceId: PP, coverageCityIds: [], phone: "023 000 401",
    name: { km: "ផ្នែកថែទាំផ្លូវ ភ្នំពេញ", en: "Phnom Penh Road Maintenance" } },
  { id: "dep-waste-pp", type: "WASTE_MANAGEMENT", provinceId: PP, coverageCityIds: [], phone: "023 000 402",
    name: { km: "ផ្នែកគ្រប់គ្រងសំរាម ភ្នំពេញ", en: "Phnom Penh Waste Management" } },
  { id: "dep-drain-pp", type: "DRAINAGE", provinceId: PP, coverageCityIds: [], phone: "023 000 403",
    name: { km: "ផ្នែកលូ និងបង្ហូរទឹក ភ្នំពេញ", en: "Phnom Penh Drainage Department" } },
  { id: "dep-light-pp", type: "PUBLIC_LIGHTING", provinceId: PP, coverageCityIds: [], phone: "023 000 404",
    name: { km: "ផ្នែកភ្លើងបំភ្លឺសាធារណៈ ភ្នំពេញ", en: "Phnom Penh Public Lighting" } },
  { id: "dep-water-pp", type: "WATER_MANAGEMENT", provinceId: PP, coverageCityIds: [], phone: "023 000 405",
    name: { km: "ផ្នែកគ្រប់គ្រងទឹក ភ្នំពេញ", en: "Phnom Penh Water Management" } },
  { id: "dep-parks-pp", type: "PUBLIC_PARKS", provinceId: PP, coverageCityIds: [], phone: "023 000 406",
    name: { km: "ផ្នែកសួនច្បារសាធារណៈ ភ្នំពេញ", en: "Phnom Penh Public Parks" } },
  { id: "dep-road-sr", type: "ROAD_MAINTENANCE", provinceId: "siem-reap", coverageCityIds: [], phone: "063 000 401",
    name: { km: "ផ្នែកថែទាំផ្លូវ សៀមរាប", en: "Siem Reap Road Maintenance" } },
  { id: "dep-waste-sr", type: "WASTE_MANAGEMENT", provinceId: "siem-reap", coverageCityIds: [], phone: "063 000 402",
    name: { km: "ផ្នែកគ្រប់គ្រងសំរាម សៀមរាប", en: "Siem Reap Waste Management" } },
];

// ---------- helpers ----------

const ADMIN = "u-admin-1";
const DAY = 86_400_000;
const plusDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString();

let photoSeq = 0;
const photo = (url: string, by: string, at: string, kind: GrPhoto["kind"] = "EVIDENCE"): GrPhoto => ({
  id: `ph-${++photoSeq}`,
  url,
  mimeType: url.endsWith(".png") ? "image/png" : url.endsWith(".webp") ? "image/webp" : "image/jpeg",
  sizeBytes: 850_000,
  kind,
  uploadedBy: by,
  uploadedAt: at,
});

const h = (
  action: GrHistoryEntry["action"],
  by: string,
  at: string,
  extra: Partial<GrHistoryEntry> = {},
): GrHistoryEntry => ({
  action,
  by,
  byRole: by === ADMIN ? "ADMIN" : by.startsWith("u-staff") ? "DEPARTMENT_STAFF" : by === "SYSTEM" ? "SYSTEM" : "CITIZEN",
  at,
  ...extra,
});

function report(r: Omit<GrReport, "supporters" | "confirmations" | "reopenCount" | "updatedAt" | "photos"> & Partial<GrReport>): GrReport {
  const last = r.history[r.history.length - 1]?.at ?? r.createdAt;
  return { photos: [], supporters: [], confirmations: [], reopenCount: 0, updatedAt: last, ...r };
}

const due = (assignedAt: string, p: GrReport["priority"]) => plusDays(assignedAt, GR_RULES.slaDays[p]);

// ---------- Reports ----------

export const GR_REPORTS: GrReport[] = [
  report({
    id: "gr-1", code: "RPT-2026-00001", reporterId: "u-citizen-1", category: "DRAINAGE_FLOODING", priority: "HIGH",
    title: "Drain blocked by rubbish, water up to the ankles", description: "Drain grate fully covered with plastic bags. Water rises fast when it rains.",
    location: { lat: 11.5795, lng: 104.8992 }, locationSource: "GPS", addressHint: "St. 289 near Toul Kork market",
    provinceId: PP, cityId: "tuol-kouk", status: "CLOSED", departmentId: "dep-drain-pp",
    acceptedBy: "u-staff-drain", acceptedAt: "2026-11-10T10:00:00+07:00", assignedAt: "2026-11-10T09:00:00+07:00",
    dueAt: due("2026-11-10T09:00:00+07:00", "HIGH"), resolvedAt: "2026-11-11T15:40:00+07:00", closedAt: "2026-11-12T09:00:00+07:00",
    resolutionNote: "Drain cleared, 6 bags of waste removed",
    photos: [
      photo("/mock/gr-drain-1.jpg", "u-citizen-1", "2026-11-10T07:12:00+07:00"),
      photo("/mock/gr-drain-1-fixed.jpg", "u-staff-drain", "2026-11-11T15:40:00+07:00", "REPAIR"),
    ],
    supporters: ["u-citizen-2", "u-citizen-3", "u-citizen-5"],
    history: [
      h("CREATED", "u-citizen-1", "2026-11-10T07:12:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-10T08:30:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-10T09:00:00+07:00", { from: "UNDER_REVIEW", to: "ASSIGNED", note: "Drainage Department" }),
      h("ACCEPTED", "u-staff-drain", "2026-11-10T10:00:00+07:00"),
      h("WORK_STARTED", "u-staff-drain", "2026-11-11T08:30:00+07:00", { from: "ASSIGNED", to: "IN_PROGRESS" }),
      h("RESOLVED", "u-staff-drain", "2026-11-11T15:40:00+07:00", { from: "IN_PROGRESS", to: "RESOLVED", note: "Drain cleared, 6 bags of waste removed" }),
      h("CLOSED", ADMIN, "2026-11-12T09:00:00+07:00", { from: "RESOLVED", to: "CLOSED", note: "Checked photo, confirmed fixed" }),
    ],
    createdAt: "2026-11-10T07:12:00+07:00",
  }),
  report({
    id: "gr-2", code: "RPT-2026-00002", reporterId: "u-citizen-2", category: "WASTE", priority: "MEDIUM",
    title: "Rubbish piled on the sidewalk for 3 days", description: "Rubbish pile not collected for 3 days, blocking the sidewalk.",
    location: { lat: 11.5462, lng: 104.9198 }, locationSource: "GPS", addressHint: "Near BKK1 St. 51",
    provinceId: PP, cityId: "chamkar-mon", status: "ASSIGNED", departmentId: "dep-waste-pp",
    assignedAt: "2026-11-20T08:15:00+07:00", dueAt: due("2026-11-20T08:15:00+07:00", "MEDIUM"),
    photos: [photo("/mock/gr-waste-1.jpg", "u-citizen-2", "2026-11-19T18:05:00+07:00")],
    supporters: ["u-citizen-1", "u-citizen-3"],
    confirmations: [{ userId: "u-citizen-3", stillExists: true, at: "2026-11-21T07:00:00+07:00" }],
    history: [
      h("CREATED", "u-citizen-2", "2026-11-19T18:05:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-20T08:00:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-20T08:15:00+07:00", { from: "UNDER_REVIEW", to: "ASSIGNED", note: "Waste Management" }),
    ],
    createdAt: "2026-11-19T18:05:00+07:00",
  }),
  report({
    id: "gr-3", code: "RPT-2026-00003", reporterId: "u-citizen-3", category: "ROAD_TRANSPORT", priority: "MEDIUM",
    title: "Big pothole on Hanoi Friendship Blvd", description: "Deep hole in the right lane. Two motos almost fell this morning.",
    location: { lat: 11.5921, lng: 104.8735 }, locationSource: "MAP", provinceId: PP, cityId: "sen-sok", status: "SUBMITTED",
    photos: [photo("/mock/gr-pothole-1.jpg", "u-citizen-3", "2026-11-20T07:45:00+07:00")],
    history: [h("CREATED", "u-citizen-3", "2026-11-20T07:45:00+07:00", { to: "SUBMITTED" })],
    createdAt: "2026-11-20T07:45:00+07:00",
  }),
  report({
    id: "gr-4", code: "RPT-2026-00004", reporterId: "u-citizen-3", category: "PUBLIC_LIGHTING", priority: "MEDIUM",
    title: "Streetlights off for a week", description: "Whole block is dark at night. Feels unsafe walking home.",
    location: { lat: 11.588, lng: 104.869 }, locationSource: "GPS", provinceId: PP, cityId: "sen-sok", status: "UNDER_REVIEW",
    history: [
      h("CREATED", "u-citizen-3", "2026-11-17T21:00:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-18T08:00:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
    ],
    createdAt: "2026-11-17T21:00:00+07:00",
  }),
  report({
    id: "gr-5", code: "RPT-2026-00005", reporterId: "u-citizen-2", category: "DRAINAGE_FLOODING", priority: "HIGH",
    title: "Street flooded after every rain", description: "Street floods about 40cm after heavy rain. Motos stalling.",
    location: { lat: 11.5205, lng: 104.931 }, locationSource: "GPS", addressHint: "Near Chbar Ampov bridge",
    provinceId: PP, cityId: "mean-chey", status: "IN_PROGRESS", departmentId: "dep-drain-pp",
    acceptedBy: "u-staff-drain", acceptedAt: "2026-11-16T09:00:00+07:00", assignedAt: "2026-11-16T08:00:00+07:00",
    dueAt: due("2026-11-16T08:00:00+07:00", "HIGH"),
    photos: [photo("/mock/gr-flood-1.jpg", "u-citizen-2", "2026-11-15T16:30:00+07:00")],
    supporters: ["u-citizen-1", "u-citizen-3", "u-citizen-5", "u-citizen-bb"],
    history: [
      h("CREATED", "u-citizen-2", "2026-11-15T16:30:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-16T07:30:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-16T08:00:00+07:00", { from: "UNDER_REVIEW", to: "ASSIGNED", note: "Drainage Department" }),
      h("ACCEPTED", "u-staff-drain", "2026-11-16T09:00:00+07:00"),
      h("WORK_STARTED", "u-staff-drain", "2026-11-17T08:00:00+07:00", { from: "ASSIGNED", to: "IN_PROGRESS" }),
      h("PROGRESS_UPDATE", "u-staff-drain", "2026-11-19T16:00:00+07:00", { note: "Pump truck ordered, waiting for parts" }),
    ],
    createdAt: "2026-11-15T16:30:00+07:00",
  }),
  report({
    id: "gr-6", code: "RPT-2026-00006", reporterId: "u-citizen-3", category: "WASTE", priority: "MEDIUM",
    title: "No public bins near the riverside park", description: "Lots of people eat here in the evening but there are no bins.",
    location: { lat: 11.564, lng: 104.93 }, locationSource: "MAP", addressHint: "Riverside park",
    provinceId: PP, cityId: "doun-penh", status: "NEED_MORE_INFO", infoRequest: "Which end of the park? Please add a photo.",
    history: [
      h("CREATED", "u-citizen-3", "2026-11-20T20:30:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-21T08:00:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("INFO_REQUESTED", ADMIN, "2026-11-21T08:05:00+07:00", { from: "UNDER_REVIEW", to: "NEED_MORE_INFO", note: "Which end of the park? Please add a photo." }),
    ],
    createdAt: "2026-11-20T20:30:00+07:00",
  }),
  report({
    id: "gr-7", code: "RPT-2026-00007", reporterId: "u-citizen-1", category: "ROAD_TRANSPORT", priority: "HIGH",
    title: "Traffic light off at Russian Blvd x Monivong", description: "Traffic light at the intersection is off. Heavy jam at rush hour.",
    location: { lat: 11.5687, lng: 104.9015 }, locationSource: "GPS", provinceId: PP, cityId: "tuol-kouk",
    status: "IN_PROGRESS", departmentId: "dep-road-pp", acceptedBy: "u-staff-road", acceptedAt: "2026-11-21T07:40:00+07:00",
    assignedAt: "2026-11-21T07:30:00+07:00", dueAt: due("2026-11-21T07:30:00+07:00", "HIGH"),
    supporters: ["u-citizen-2"],
    history: [
      h("CREATED", "u-citizen-1", "2026-11-21T07:20:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-21T07:25:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("PRIORITY_CHANGED", ADMIN, "2026-11-21T07:28:00+07:00", { note: "MEDIUM → HIGH: rush hour, many people affected" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-21T07:30:00+07:00", { from: "UNDER_REVIEW", to: "ASSIGNED", note: "Road Maintenance" }),
      h("ACCEPTED", "u-staff-road", "2026-11-21T07:40:00+07:00"),
      h("WORK_STARTED", "u-staff-road", "2026-11-21T07:50:00+07:00", { from: "ASSIGNED", to: "IN_PROGRESS", note: "Technician on the way" }),
    ],
    createdAt: "2026-11-21T07:20:00+07:00",
  }),
  report({
    id: "gr-8", code: "RPT-2026-00008", reporterId: "u-citizen-1", category: "WASTE", priority: "LOW",
    title: "Construction waste dumped in an empty lot", description: "People dump construction waste in an empty lot every night.",
    location: { lat: 11.615, lng: 104.905 }, locationSource: "GPS", provinceId: PP, cityId: "russey-keo",
    status: "REJECTED", rejectReason: "Private land: the owner was notified directly",
    photos: [photo("/mock/gr-dump-1.jpg", "u-citizen-1", "2026-11-05T10:00:00+07:00")],
    history: [
      h("CREATED", "u-citizen-1", "2026-11-05T10:00:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-06T08:30:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("REJECTED", ADMIN, "2026-11-06T09:00:00+07:00", { from: "UNDER_REVIEW", to: "REJECTED", note: "Private land: the owner was notified directly" }),
    ],
    createdAt: "2026-11-05T10:00:00+07:00",
  }),
  report({
    id: "gr-9", code: "RPT-2026-00009", reporterId: "u-citizen-1", category: "DRAINAGE_FLOODING", priority: "CRITICAL",
    title: "Drain cover broken, open hole on the sidewalk", description: "Drain cover is broken. Risk for children and motos.",
    location: { lat: 11.537, lng: 104.948 }, locationSource: "GPS", provinceId: PP, cityId: "chbar-ampov",
    status: "RESOLVED", departmentId: "dep-drain-pp", acceptedBy: "u-staff-drain", acceptedAt: "2026-11-17T08:30:00+07:00",
    assignedAt: "2026-11-17T08:00:00+07:00", dueAt: due("2026-11-17T08:00:00+07:00", "CRITICAL"),
    resolvedAt: "2026-11-18T10:00:00+07:00", resolutionNote: "New steel cover installed",
    photos: [
      photo("/mock/gr-cover-1.jpg", "u-citizen-1", "2026-11-16T11:00:00+07:00"),
      photo("/mock/gr-cover-1-fixed.jpg", "u-staff-drain", "2026-11-18T10:00:00+07:00", "REPAIR"),
    ],
    history: [
      h("CREATED", "u-citizen-1", "2026-11-16T11:00:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-17T07:45:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("PRIORITY_CHANGED", ADMIN, "2026-11-17T07:50:00+07:00", { note: "MEDIUM → CRITICAL: open hole, safety risk" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-17T08:00:00+07:00", { from: "UNDER_REVIEW", to: "ASSIGNED", note: "Drainage Department" }),
      h("ACCEPTED", "u-staff-drain", "2026-11-17T08:30:00+07:00"),
      h("WORK_STARTED", "u-staff-drain", "2026-11-17T09:00:00+07:00", { from: "ASSIGNED", to: "IN_PROGRESS", note: "Area fenced off" }),
      h("RESOLVED", "u-staff-drain", "2026-11-18T10:00:00+07:00", { from: "IN_PROGRESS", to: "RESOLVED", note: "New steel cover installed" }),
    ],
    createdAt: "2026-11-16T11:00:00+07:00",
  }),
  report({
    id: "gr-10", code: "RPT-2026-00010", reporterId: "u-citizen-3", category: "ROAD_TRANSPORT", priority: "MEDIUM",
    title: "Road cracked after rainy season", description: "Many small holes along the street.",
    location: { lat: 11.6, lng: 104.938 }, locationSource: "MAP", provinceId: PP, cityId: "chroy-changvar",
    status: "REOPENED", departmentId: "dep-road-pp", assignedAt: "2026-11-12T08:00:00+07:00",
    resolvedAt: "2026-11-14T16:00:00+07:00", closedAt: "2026-11-15T09:00:00+07:00", resolutionNote: "Holes patched", reopenCount: 1,
    confirmations: [{ userId: "u-citizen-3", stillExists: false, at: "2026-11-19T09:00:00+07:00" }],
    history: [
      h("CREATED", "u-citizen-3", "2026-11-11T09:20:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-12T07:50:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-12T08:00:00+07:00", { from: "UNDER_REVIEW", to: "ASSIGNED", note: "Road Maintenance" }),
      h("WORK_STARTED", "u-staff-road", "2026-11-13T08:00:00+07:00", { from: "ASSIGNED", to: "IN_PROGRESS" }),
      h("RESOLVED", "u-staff-road", "2026-11-14T16:00:00+07:00", { from: "IN_PROGRESS", to: "RESOLVED", note: "Holes patched" }),
      h("CLOSED", ADMIN, "2026-11-15T09:00:00+07:00", { from: "RESOLVED", to: "CLOSED" }),
      h("REOPENED", "u-citizen-3", "2026-11-19T09:00:00+07:00", { from: "CLOSED", to: "REOPENED", note: "Patches washed away after the rain" }),
    ],
    createdAt: "2026-11-11T09:20:00+07:00",
  }),
  report({
    id: "gr-11", code: "RPT-2026-00011", reporterId: "u-citizen-1", category: "WASTE", priority: "MEDIUM",
    title: "Community bin overflowing, strong smell", description: "Community bin overflowing, strong smell, dogs spreading it.",
    location: { lat: 11.496, lng: 104.87 }, locationSource: "GPS", provinceId: PP, cityId: "dangkao",
    status: "CLOSED", departmentId: "dep-waste-pp", acceptedBy: "u-staff-waste", assignedAt: "2026-11-08T08:00:00+07:00",
    dueAt: due("2026-11-08T08:00:00+07:00", "MEDIUM"), resolvedAt: "2026-11-09T07:00:00+07:00", closedAt: "2026-11-09T12:00:00+07:00",
    resolutionNote: "Collected, schedule changed to daily",
    history: [
      h("CREATED", "u-citizen-1", "2026-11-08T06:40:00+07:00", { to: "SUBMITTED" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-08T08:00:00+07:00", { from: "SUBMITTED", to: "ASSIGNED", note: "Waste Management" }),
      h("ACCEPTED", "u-staff-waste", "2026-11-08T09:00:00+07:00"),
      h("WORK_STARTED", "u-staff-waste", "2026-11-08T18:00:00+07:00", { from: "ASSIGNED", to: "IN_PROGRESS" }),
      h("RESOLVED", "u-staff-waste", "2026-11-09T07:00:00+07:00", { from: "IN_PROGRESS", to: "RESOLVED", note: "Collected, schedule changed to daily" }),
      h("CLOSED", ADMIN, "2026-11-09T12:00:00+07:00", { from: "RESOLVED", to: "CLOSED" }),
    ],
    createdAt: "2026-11-08T06:40:00+07:00",
  }),
  report({
    id: "gr-12", code: "RPT-2026-00012", reporterId: "u-citizen-5", category: "DRAINAGE_FLOODING", priority: "MEDIUM",
    title: "Flooding on the street near Chbar Ampov bridge", description: "Water on the road again after the rain, motos can't pass.",
    location: { lat: 11.5207, lng: 104.9312 }, locationSource: "GPS", provinceId: PP, cityId: "mean-chey",
    status: "DUPLICATE", duplicateOf: "gr-5",
    history: [
      h("CREATED", "u-citizen-5", "2026-11-20T17:00:00+07:00", { to: "SUBMITTED" }),
      h("MARKED_DUPLICATE", ADMIN, "2026-11-21T08:10:00+07:00", { from: "SUBMITTED", to: "DUPLICATE", note: "Same as RPT-2026-00005" }),
    ],
    createdAt: "2026-11-20T17:00:00+07:00",
  }),
  report({
    id: "gr-13", code: "RPT-2026-00013", reporterId: "u-citizen-3", category: "PUBLIC_INFRASTRUCTURE", priority: "LOW",
    title: "Fallen tree branch blocking the sidewalk", description: "Big branch blocking half the sidewalk next to the park.",
    location: { lat: 11.531, lng: 104.783 }, locationSource: "GPS", provinceId: PP, cityId: "kamboul",
    status: "ASSIGNED", departmentId: "dep-parks-pp", assignedAt: "2026-11-21T08:00:00+07:00", dueAt: due("2026-11-21T08:00:00+07:00", "LOW"),
    history: [
      h("CREATED", "u-citizen-3", "2026-11-20T15:00:00+07:00", { to: "SUBMITTED" }),
      h("REVIEW_STARTED", ADMIN, "2026-11-21T07:55:00+07:00", { from: "SUBMITTED", to: "UNDER_REVIEW" }),
      h("APPROVED_ASSIGNED", ADMIN, "2026-11-21T08:00:00+07:00", { from: "UNDER_REVIEW", to: "ASSIGNED", note: "Public Parks" }),
    ],
    createdAt: "2026-11-20T15:00:00+07:00",
  }),
  report({
    id: "gr-14", code: "RPT-2026-00014", reporterId: "u-citizen-2", category: "WATER", priority: "MEDIUM",
    title: "Water pipe leaking on the street", description: "Clean water leaking from a pipe for two days.",
    location: { lat: 11.552, lng: 104.927 }, locationSource: "GPS", provinceId: PP, cityId: "boeng-keng-kang",
    status: "CANCELLED",
    history: [
      h("CREATED", "u-citizen-2", "2026-11-18T09:00:00+07:00", { to: "SUBMITTED" }),
      h("CANCELLED", "u-citizen-2", "2026-11-18T12:00:00+07:00", { from: "SUBMITTED", to: "CANCELLED", note: "Water company already fixed it" }),
    ],
    createdAt: "2026-11-18T09:00:00+07:00",
  }),
  report({
    id: "gr-15", code: "RPT-2026-00015", reporterId: "u-citizen-sr", category: "WASTE", priority: "MEDIUM",
    title: "Rubbish dumped near the Old Market", description: "Bags of rubbish left near the market entrance every morning.",
    location: { lat: 13.3546, lng: 103.8551 }, locationSource: "GPS", provinceId: "siem-reap", cityId: "siem-reap-city",
    status: "SUBMITTED",
    history: [h("CREATED", "u-citizen-sr", "2026-11-21T06:30:00+07:00", { to: "SUBMITTED" })],
    createdAt: "2026-11-21T06:30:00+07:00",
  }),
];

export const GR_COMMENTS: GrComment[] = [
  { id: "grc-1", reportId: "gr-5", authorId: "u-staff-drain", authorRole: "DEPARTMENT_STAFF", internal: false,
    body: "Pump truck ordered, waiting for parts. We'll start pumping on Monday.", createdAt: "2026-11-19T16:00:00+07:00" },
  { id: "grc-2", reportId: "gr-5", authorId: "u-citizen-2", authorRole: "CITIZEN", internal: false,
    body: "Thank you. It flooded again last night.", createdAt: "2026-11-20T07:00:00+07:00" },
  { id: "grc-3", reportId: "gr-2", authorId: ADMIN, authorRole: "ADMIN", internal: true,
    body: "Collector contract for BKK1 is under review. Escalate if not picked up by Monday.", createdAt: "2026-11-20T08:20:00+07:00" },
  { id: "grc-4", reportId: "gr-6", authorId: ADMIN, authorRole: "ADMIN", internal: false,
    body: "Which end of the park? Please add a photo.", createdAt: "2026-11-21T08:05:00+07:00" },
  { id: "grc-5", reportId: "gr-10", authorId: "u-citizen-3", authorRole: "CITIZEN", internal: false,
    body: "Patches washed away after the rain. Same holes again.", createdAt: "2026-11-19T09:00:00+07:00" },
];

export const GR_NOTIFICATIONS: AppNotification[] = [
  { id: "n-gr-1", userId: "u-citizen-1", type: "GR_CLOSED", reportId: "gr-1", read: false, createdAt: "2026-11-12T09:00:00+07:00",
    message: { km: "របាយការណ៍ RPT-2026-00001 ត្រូវបានបិទ (បានផ្ទៀងផ្ទាត់ថាជួសជុលរួច) ✅", en: "RPT-2026-00001 closed: verified fixed ✅" } },
  { id: "n-gr-2", userId: "u-citizen-1", type: "GR_WORK_STARTED", reportId: "gr-7", read: false, createdAt: "2026-11-21T07:50:00+07:00",
    message: { km: "ការងារបានចាប់ផ្តើម៖ RPT-2026-00007", en: "Work started on RPT-2026-00007" } },
  { id: "n-gr-3", userId: "u-citizen-3", type: "GR_INFO_REQUESTED", reportId: "gr-6", read: false, createdAt: "2026-11-21T08:05:00+07:00",
    message: { km: "សូមបន្ថែមព័ត៌មានសម្រាប់ RPT-2026-00006", en: "More information needed for RPT-2026-00006" } },
  { id: "n-gr-4", userId: "u-staff-waste", type: "GR_NEW_TASK", reportId: "gr-2", read: false, createdAt: "2026-11-20T08:15:00+07:00",
    message: { km: "កិច្ចការថ្មី៖ RPT-2026-00002", en: "New task: RPT-2026-00002" } },
];

