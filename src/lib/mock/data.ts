// Seed data for the mock API. All people, phones and reports are fake.
// Demo accounts (mock only, password for all: "demo1234"). Full list in README.md.
//   Log in with phone, email or username. Citizen: 012000001 / dara@example.com / dara

import type { EmergencyHotline, UserRecord } from "@/types";

export const DEMO_PASSWORD = "demo1234";

export { PROVINCES, CITIES } from "./locations";

export const PHNOM_PENH_CENTER = { lat: 11.5564, lng: 104.9282 };

// ---------- Emergency hotlines (unverified, check before launch) ----------
// WARNING: Unverified numbers, check before launch. Do not call them official or real.
// Do not hard-code these numbers in UI components; import from EMERGENCY_HOTLINES.

export const EMERGENCY_HOTLINES: EmergencyHotline[] = [
  { id: "police", number: "117", icon: "🚓", name: { km: "ប៉ូលិស", en: "Police" }, unverified: true },
  { id: "fire", number: "118", icon: "🚒", name: { km: "អគ្គិភ័យ", en: "Fire" }, unverified: true },
  { id: "ambulance", number: "119", icon: "🚑", name: { km: "សង្គ្រោះបន្ទាន់", en: "Ambulance" }, unverified: true },
];

// ---------- Users ----------

type SeedUser = Omit<UserRecord, "username" | "firstName" | "lastName" | "authProvider"> & { username?: string };

/** Fill username / names / email for seed users. Names are "Family Given" (Khmer order). */
const withAccountFields = (u: SeedUser): UserRecord => {
  const clean = u.fullName.replace(/\s*\(.*\)\s*$/, "");
  const [lastName, ...rest] = clean.split(" ");
  const username = u.username ?? u.id.replace(/^u-/, "").replace(/-/g, ".");
  return {
    ...u,
    username,
    lastName,
    firstName: rest.join(" ") || lastName,
    email: u.email ?? `${username}@example.com`,
    authProvider: "PASSWORD",
  };
};

const SEED_USERS: SeedUser[] = [
  { id: "u-citizen-1", username: "dara", fullName: "សុខ ដារ៉ា", phone: "012000001", email: "dara@example.com", role: "CITIZEN",
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
  // Emergency organization staff and a news reporter (feature 2)
  { id: "u-org-police", fullName: "នគរបាលភ្នំពេញ (Demo)", phone: "012000010", role: "ORGANIZATION", organizationId: "org-police-pp",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "km", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-org-calmette", fullName: "Calmette ER desk (Demo)", phone: "012000011", role: "ORGANIZATION", organizationId: "org-hosp-calmette",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "en", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-org-fire", fullName: "Fire dispatch (Demo)", phone: "012000012", role: "ORGANIZATION", organizationId: "org-fire-pp",
    provinceId: "phnom-penh", cityId: "prampir-makara", preferredLocale: "km", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-reporter", fullName: "Demo News reporter", phone: "012000013", role: "REPORTER", organizationId: "org-news-demo",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "en", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-org-amb", fullName: "119 dispatch (Demo)", phone: "012000014", role: "ORGANIZATION", organizationId: "org-amb-pp",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "km", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  // City department staff (feature 3: government reporting)
  { id: "u-staff-road", fullName: "សុខ វណ្ណា (Road Maintenance)", phone: "012000015", role: "DEPARTMENT_STAFF", departmentId: "dep-road-pp",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "km", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-staff-drain", fullName: "ជា សុភ័ក្រ (Drainage)", phone: "012000016", role: "DEPARTMENT_STAFF", departmentId: "dep-drain-pp",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "km", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-staff-waste", fullName: "Heng Dara (Waste Management)", phone: "012000017", role: "DEPARTMENT_STAFF", departmentId: "dep-waste-pp",
    provinceId: "phnom-penh", cityId: "doun-penh", preferredLocale: "en", createdAt: "2026-09-01T08:00:00+07:00", password: DEMO_PASSWORD },
  // Users outside Phnom Penh (Lost & Found is national)
  { id: "u-citizen-sr", fullName: "ចាន់ សុផល", phone: "012000007", role: "CITIZEN",
    provinceId: "siem-reap", cityId: "siem-reap-city", preferredLocale: "km", createdAt: "2026-10-20T08:00:00+07:00", password: DEMO_PASSWORD },
  { id: "u-citizen-bb", fullName: "Vann Rithy", phone: "012000008", role: "CITIZEN",
    provinceId: "battambang", cityId: "battambang-city", preferredLocale: "en", createdAt: "2026-10-22T08:00:00+07:00", password: DEMO_PASSWORD },
];

export const USERS: UserRecord[] = SEED_USERS.map(withAccountFields);

// Civic reports (feature 3): see ./gov-reporting.ts.
// Lost & Found seed data: see ./lost-found.ts

// Civic services, announcements and community: see ./community.ts.
// Hospitals and police posts belong to feature 2 (Emergency).
