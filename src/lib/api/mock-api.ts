// Core mock API: auth, city reports, notifications, stats, reference data.
// Lost & Found lives in ./lost-found-api.ts.

import type {
  AppNotification,
  AuthSession,
  CreateReportInput,
  LoginInput,
  PublicReport,
  RegisterInput,
  Report,
  ReportFilter,
  ReportStatus,
  StatsSummary,
  User,
  UserRecord,
} from "@/types";
import * as seed from "@/lib/mock/data";
import { findCity, findProvince } from "@/lib/mock/locations";
import {
  ApiError,
  clearSession,
  currentUser,
  delay,
  load,
  nextId,
  normalizePhone,
  notify,
  now,
  requireUser,
  save,
  toUser,
  writeSession,
} from "./mock-db";

export { ApiError, normalizePhone, readSession, resetMockDb } from "./mock-db";

/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- drops private fields */
function toPublicReport({ reporterId: _r, assignedTo: _a, history, ...rest }: Report): PublicReport {
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  return { ...rest, history: history.map(({ changedBy: _c, ...h }) => h) };
}

// ---------- auth ----------

export async function register(input: RegisterInput): Promise<AuthSession> {
  const d = load();
  const fullName = input.fullName?.trim();
  if (!fullName || fullName.length < 2) throw new ApiError("VALIDATION", "Name is required", "fullName");
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) throw new ApiError("VALIDATION", "Phone must look like 012345678", "phone");
  if (!input.password || input.password.length < 6)
    throw new ApiError("VALIDATION", "Password must be at least 6 characters", "password");
  if (!findProvince(input.provinceId)) throw new ApiError("VALIDATION", "Choose a province", "provinceId");
  if (findCity(input.cityId)?.provinceId !== input.provinceId)
    throw new ApiError("VALIDATION", "Choose a city", "cityId");
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) throw new ApiError("VALIDATION", "Invalid email", "email");
  if (d.users.some((u) => u.phone === phone)) throw new ApiError("CONFLICT", "Phone already registered", "phone");

  const user: UserRecord = {
    id: nextId("u"),
    fullName,
    phone,
    email: input.email?.trim() || undefined,
    role: "CITIZEN", // self-registration is always citizen
    provinceId: input.provinceId,
    cityId: input.cityId,
    sangkat: input.sangkat?.trim() || undefined,
    preferredLocale: input.preferredLocale ?? "km",
    createdAt: now(),
    password: input.password,
  };
  d.users.push(user);
  save();
  return delay(writeSession(user));
}

export async function login({ phone, password }: LoginInput): Promise<AuthSession> {
  const p = normalizePhone(phone);
  const user = load().users.find((u) => u.phone === p && u.password === password);
  if (!user) throw new ApiError("UNAUTHORIZED", "Wrong phone or password");
  return delay(writeSession(user));
}

export async function logout(): Promise<void> {
  clearSession();
  return delay(undefined);
}

export async function me(): Promise<User | null> {
  const u = currentUser();
  return delay(u ? toUser(u) : null);
}

// ---------- city reports ----------

export async function listReports(filter: ReportFilter = {}): Promise<PublicReport[]> {
  const rows = load()
    .reports.filter(
      (r) =>
        (!filter.status?.length || filter.status.includes(r.status)) &&
        (!filter.category?.length || filter.category.includes(r.category)) &&
        (!filter.urgency?.length || filter.urgency.includes(r.urgency)) &&
        (!filter.cityId || r.cityId === filter.cityId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return delay(rows.map(toPublicReport));
}

export async function getReport(id: string): Promise<PublicReport> {
  const r = load().reports.find((x) => x.id === id);
  if (!r) throw new ApiError("NOT_FOUND", "Report not found");
  return delay(toPublicReport(r));
}

export async function myReports(): Promise<Report[]> {
  const u = requireUser();
  return delay(
    load()
      .reports.filter((r) => r.reporterId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const u = requireUser();
  if (!input.title?.trim()) throw new ApiError("VALIDATION", "Title is required", "title");
  if (!input.location) throw new ApiError("VALIDATION", "Pick a location", "location");
  const t = now();
  const report: Report = {
    ...input,
    id: nextId("r"),
    reporterId: u.id,
    status: "REPORTED",
    upvotes: 0,
    history: [{ from: null, to: "REPORTED", changedBy: u.id, at: t }],
    createdAt: t,
    updatedAt: t,
  };
  load().reports.unshift(report);
  save();
  return delay(report);
}

export async function upvoteReport(id: string): Promise<PublicReport> {
  requireUser();
  const r = load().reports.find((x) => x.id === id);
  if (!r) throw new ApiError("NOT_FOUND", "Report not found");
  r.upvotes += 1;
  save();
  return delay(toPublicReport(r));
}

const STATUS_MSG: Record<ReportStatus, { km: string; en: string }> = {
  REPORTED: { km: "បានទទួលរបាយការណ៍", en: "Report received" },
  ASSIGNED: { km: "របាយការណ៍របស់អ្នកត្រូវបានបញ្ជូនទៅមន្ត្រី", en: "Your report was assigned to an officer" },
  IN_PROGRESS: { km: "មន្ត្រីកំពុងដោះស្រាយរបាយការណ៍របស់អ្នក", en: "An officer is working on your report" },
  FIXED: { km: "របាយការណ៍របស់អ្នកត្រូវបានដោះស្រាយរួចរាល់ ✅", en: "Your report is fixed ✅" },
  REJECTED: { km: "របាយការណ៍របស់អ្នកមិនត្រូវបានទទួលយក", en: "Your report was closed without action" },
};

/** Officer/admin: move a report along. Writes history and notifies the reporter. */
export async function updateReportStatus(
  id: string,
  to: ReportStatus,
  opts: { note?: string; assignTo?: string } = {},
): Promise<Report> {
  const actor = requireUser(["OFFICER", "ADMIN"]);
  const r = load().reports.find((x) => x.id === id);
  if (!r) throw new ApiError("NOT_FOUND", "Report not found");
  if (to === "REJECTED" && !opts.note?.trim()) throw new ApiError("VALIDATION", "A reason is required", "note");
  const t = now();
  r.history.push({ from: r.status, to, changedBy: actor.id, note: opts.note, at: t });
  r.status = to;
  r.updatedAt = t;
  if (opts.assignTo) r.assignedTo = opts.assignTo;
  else if (to === "ASSIGNED" && !r.assignedTo && actor.role === "OFFICER") r.assignedTo = actor.id;
  notify({ userId: r.reporterId, type: "REPORT_STATUS", reportId: r.id, message: STATUS_MSG[to] });
  save();
  return delay(r);
}

/** Officer/admin queue: HIGH urgency first, then oldest first. */
export async function adminQueue(filter: ReportFilter = {}): Promise<Report[]> {
  requireUser(["OFFICER", "ADMIN"]);
  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  const rows = load().reports.filter(
    (r) =>
      (!filter.status?.length || filter.status.includes(r.status)) && (!filter.cityId || r.cityId === filter.cityId),
  );
  return delay(rows.sort((a, b) => rank[a.urgency] - rank[b.urgency] || a.createdAt.localeCompare(b.createdAt)));
}

export async function listOfficers(): Promise<User[]> {
  requireUser(["ADMIN"]);
  return delay(
    load()
      .users.filter((u) => u.role === "OFFICER")
      .map(toUser),
  );
}

// ---------- notifications ----------

export async function myNotifications(): Promise<AppNotification[]> {
  const u = requireUser();
  return delay(
    load()
      .notifications.filter((n) => n.userId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function unreadCount(): Promise<number> {
  const u = currentUser();
  return delay(u ? load().notifications.filter((n) => n.userId === u.id && !n.read).length : 0);
}

export async function markNotificationRead(id: string): Promise<void> {
  const u = requireUser();
  const n = load().notifications.find((x) => x.id === id && x.userId === u.id);
  if (n) n.read = true;
  save();
  return delay(undefined);
}

// ---------- stats ----------

export async function statsSummary(): Promise<StatsSummary> {
  const reports = load().reports;
  const byStatus: StatsSummary["byStatus"] = { REPORTED: 0, ASSIGNED: 0, IN_PROGRESS: 0, FIXED: 0, REJECTED: 0 };
  const byCategory: StatsSummary["byCategory"] = {};
  const byCity: StatsSummary["byCity"] = {};
  const fixHours: number[] = [];
  for (const r of reports) {
    byStatus[r.status] += 1;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    byCity[r.cityId] = (byCity[r.cityId] ?? 0) + 1;
    const fixed = r.history.find((h) => h.to === "FIXED");
    if (fixed) fixHours.push((Date.parse(fixed.at) - Date.parse(r.createdAt)) / 36e5);
  }
  const avg = fixHours.length ? Math.round((fixHours.reduce((a, b) => a + b, 0) / fixHours.length) * 10) / 10 : null;
  return delay({ total: reports.length, byStatus, byCategory, byCity, avgHoursToFixed: avg });
}

// ---------- reference data ----------

export const getProvinces = async () => delay(seed.PROVINCES);
export const getCities = async (provinceId?: string) =>
  delay(seed.CITIES.filter((c) => !provinceId || c.provinceId === provinceId));
export const getCategories = async () => delay(seed.CATEGORIES);
export const getEmergencyContacts = async () => delay(seed.EMERGENCY_CONTACTS);
export const getServices = async (cityId?: string) =>
  delay(seed.SERVICES.filter((s) => !cityId || s.cityId === cityId));
export const getAnnouncements = async (cityId?: string) =>
  delay(seed.ANNOUNCEMENTS.filter((a) => !a.cityId || !cityId || a.cityId === cityId));
