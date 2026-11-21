// Government Reporting System mock API (used as `api.gr.*`).
// Spec: docs/features/gov-reporting.md
//
// Citizen   listCategories, listDepartments, suggestDepartment, findPossibleDuplicates, createReport,
//           updateReport, cancelReport, respondToInfoRequest, requestReopen, myReports, getReport,
//           listPublicReports, supportReport, confirmIssue
// Comments  listComments, addComment
// Admin     adminListReports, startReview, requestInfo, approveAndAssign, reassign, rejectReport,
//           markDuplicate, changeCategory, setPriority, closeReport, sendBack, dashboard
// Staff     staffTasks, acceptTask, startWork, addProgress, resolveReport
//
// Every status change is checked here (the real backend must do the same) and
// written to the report history with who, what and when.

import type {
  GrAction,
  GrActorRole,
  GrCategory,
  GrCommentView,
  GrCreateReportInput,
  GrDashboard,
  GrDepartment,
  GrDuplicateCandidate,
  GrPermissions,
  GrPhoto,
  GrPhotoInput,
  GrPhotoMime,
  GrPriority,
  GrReport,
  GrReportFilter,
  GrReportView,
  GrStatus,
  GrUpdateReportInput,
  I18nText,
  LatLng,
  NotificationType,
  UserRecord,
} from "@/types";
import { GR_PUBLIC_STATUSES, GR_RULES } from "@/types";
import { GR_CATEGORIES, GR_DEPARTMENTS } from "@/lib/mock/gov-reporting";
import { distanceKm, findCity } from "@/lib/mock/locations";
import { ApiError, currentUser, delay, findUser, load, nextId, notify, now, requireUser, save } from "./mock-db";

// =====================================================================
// Helpers
// =====================================================================

const DAY = 86_400_000;
const msg = (km: string, en: string): I18nText => ({ km, en });
const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString();

const OPEN_WORK: GrStatus[] = ["ASSIGNED", "IN_PROGRESS", "REOPENED"];
const REVIEWABLE: GrStatus[] = ["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFO"];
const FINAL: GrStatus[] = ["CLOSED", "REJECTED", "DUPLICATE", "CANCELLED"];

const roleOf = (u: UserRecord): GrActorRole =>
  u.role === "ADMIN" ? "ADMIN" : u.role === "DEPARTMENT_STAFF" ? "DEPARTMENT_STAFF" : "CITIZEN";

const isAdmin = (u?: UserRecord | null) => u?.role === "ADMIN";
const isStaffFor = (u: UserRecord | null | undefined, r: GrReport) =>
  !!u && u.role === "DEPARTMENT_STAFF" && !!r.departmentId && u.departmentId === r.departmentId;
const isOwner = (u: UserRecord | null | undefined, r: GrReport) => !!u && r.reporterId === u.id;
const isPublic = (r: GrReport) => GR_PUBLIC_STATUSES.includes(r.status);

const deptById = (id?: string) => GR_DEPARTMENTS.find((d) => d.id === id);

function isOverdue(r: GrReport, t = now()) {
  return !!r.dueAt && OPEN_WORK.includes(r.status) && r.dueAt < t;
}

function canView(r: GrReport, u: UserRecord | null) {
  return isPublic(r) || isOwner(u, r) || isAdmin(u) || isStaffFor(u, r);
}

function getOr404(id: string, u: UserRecord | null): GrReport {
  const r = load().grReports.find((x) => x.id === id || x.code === id);
  if (!r || !canView(r, u)) throw new ApiError("NOT_FOUND", "Report not found");
  return r;
}

function permissions(r: GrReport, u: UserRecord | null): GrPermissions {
  const owner = isOwner(u, r);
  const admin = isAdmin(u);
  const staff = isStaffFor(u, r);
  const t = now();
  const finishedAt = r.closedAt ?? r.resolvedAt;
  return {
    edit: owner && (r.status === "SUBMITTED" || r.status === "NEED_MORE_INFO"),
    cancel: owner && REVIEWABLE.includes(r.status),
    respondToInfo: owner && r.status === "NEED_MORE_INFO",
    requestReopen:
      owner &&
      (r.status === "RESOLVED" || r.status === "CLOSED") &&
      r.reopenCount < GR_RULES.maxReopens &&
      !!finishedAt &&
      addDays(finishedAt, GR_RULES.reopenWindowDays) > t,
    support: !!u && !owner && OPEN_WORK.includes(r.status) && !r.supporters.includes(u.id),
    comment: (owner && !FINAL.includes(r.status)) || admin || staff,
    review: admin && (REVIEWABLE.includes(r.status) || r.status === "REOPENED"),
    close: admin && (r.status === "RESOLVED" || r.status === "REOPENED"),
    accept: staff && r.status === "ASSIGNED" && !r.acceptedBy,
    startWork: staff && r.status === "ASSIGNED",
    resolve: staff && r.status === "IN_PROGRESS",
  };
}

function view(r: GrReport, u: UserRecord | null): GrReportView {
   
  const { reporterId, supporters, confirmations, history, acceptedBy, ...rest } = r;
  const insider = isAdmin(u) || isStaffFor(u, r);
  return {
    ...rest,
    isMine: isOwner(u, r),
    departmentName: deptById(r.departmentId)?.name,
    supportCount: supporters.length,
    mySupport: !!u && supporters.includes(u.id),
    stillExistsCount: confirmations.filter((c) => c.stillExists).length,
    notFixedCount: confirmations.filter((c) => !c.stillExists).length,
    overdue: isOverdue(r),
    history: insider
      ? history
      : history.filter((h) => !h.internal).map((h) => ({ ...h, by: undefined })),
    reporter: insider ? { id: reporterId, name: findUser(reporterId)?.fullName ?? "—" } : undefined,
    acceptedByName: insider && acceptedBy ? findUser(acceptedBy)?.fullName : undefined,
    can: permissions(r, u),
  };
}

function record(
  r: GrReport,
  u: UserRecord | "SYSTEM",
  action: GrAction,
  opts: { to?: GrStatus; note?: string; internal?: boolean } = {},
) {
  const t = now();
  r.history.push({
    action,
    from: opts.to ? r.status : undefined,
    to: opts.to,
    by: u === "SYSTEM" ? "SYSTEM" : u.id,
    byRole: u === "SYSTEM" ? "SYSTEM" : roleOf(u),
    note: opts.note,
    internal: opts.internal,
    at: t,
  });
  if (opts.to) r.status = opts.to;
  r.updatedAt = t;
}

function notifyUser(userId: string, type: NotificationType, r: GrReport, km: string, en: string) {
  notify({ userId, type, reportId: r.id, message: msg(`${r.code}៖ ${km}`, `${r.code}: ${en}`) });
}

function notifyStaff(r: GrReport, type: NotificationType, km: string, en: string, exceptId?: string) {
  for (const s of load().users.filter((x) => x.role === "DEPARTMENT_STAFF" && x.departmentId === r.departmentId && x.id !== exceptId))
    notifyUser(s.id, type, r, km, en);
}

function notifyAdmins(r: GrReport, type: NotificationType, km: string, en: string) {
  for (const a of load().users.filter((x) => x.role === "ADMIN")) notifyUser(a.id, type, r, km, en);
}

function validateText(title?: string, description?: string) {
  const tl = title?.trim().length ?? 0;
  const dl = description?.trim().length ?? 0;
  if (tl < GR_RULES.titleMin || tl > GR_RULES.titleMax)
    throw new ApiError("VALIDATION", `Title must be ${GR_RULES.titleMin}–${GR_RULES.titleMax} characters`, "title");
  if (dl < GR_RULES.descriptionMin || dl > GR_RULES.descriptionMax)
    throw new ApiError("VALIDATION", `Description must be ${GR_RULES.descriptionMin}–${GR_RULES.descriptionMax} characters`, "description");
}

function validateCategory(c: GrCategory) {
  if (!GR_CATEGORIES.some((x) => x.id === c)) throw new ApiError("VALIDATION", "Choose a category", "category");
}

function validateLocation(loc: LatLng | undefined, provinceId: string, cityId: string) {
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number")
    throw new ApiError("VALIDATION", "Pick a location", "location");
  if (findCity(cityId)?.provinceId !== provinceId) throw new ApiError("VALIDATION", "Choose a city", "cityId");
}

/** JPG / PNG / WebP, max 5 MB each, max 5 per report (citizen evidence). */
function toPhotos(inputs: GrPhotoInput[] = [], u: UserRecord, kind: GrPhoto["kind"], alreadyHave = 0): GrPhoto[] {
  if (alreadyHave + inputs.length > GR_RULES.maxPhotos)
    throw new ApiError("VALIDATION", `Up to ${GR_RULES.maxPhotos} photos`, "photos");
  const t = now();
  return inputs.map((p) => {
    if (!GR_RULES.photoTypes.includes(p.mimeType as GrPhotoMime))
      throw new ApiError("VALIDATION", "Photos must be JPG, PNG or WebP", "photos");
    if (!(p.sizeBytes > 0) || p.sizeBytes > GR_RULES.maxPhotoBytes)
      throw new ApiError("VALIDATION", "Each photo must be 5 MB or smaller", "photos");
    if (!p.url) throw new ApiError("VALIDATION", "Photo is missing", "photos");
    return { id: nextId("ph"), url: p.url, mimeType: p.mimeType as GrPhotoMime, sizeBytes: p.sizeBytes, kind, uploadedBy: u.id, uploadedAt: t };
  });
}

function nextCode() {
  const year = now().slice(0, 4);
  const max = Math.max(0, ...load().grReports.map((r) => Number(r.code.split("-")[2]) || 0));
  return `RPT-${year}-${String(max + 1).padStart(5, "0")}`;
}

function applyFilter(rows: GrReport[], f: GrReportFilter): GrReport[] {
  const q = f.q?.trim().toLowerCase();
  const out = rows.filter(
    (r) =>
      (!f.category?.length || f.category.includes(r.category)) &&
      (!f.status?.length || f.status.includes(r.status)) &&
      (!f.priority?.length || f.priority.includes(r.priority)) &&
      (!f.provinceId || r.provinceId === f.provinceId) &&
      (!f.cityId || r.cityId === f.cityId) &&
      (!f.departmentId || r.departmentId === f.departmentId) &&
      (!f.dateFrom || r.createdAt.slice(0, 10) >= f.dateFrom) &&
      (!f.dateTo || r.createdAt.slice(0, 10) <= f.dateTo) &&
      (!f.overdueOnly || isOverdue(r)) &&
      (!q || `${r.code} ${r.title} ${r.description} ${r.addressHint ?? ""}`.toLowerCase().includes(q)),
  );
  if (f.near) out.sort((a, b) => distanceKm(f.near!, a.location) - distanceKm(f.near!, b.location));
  else out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

const requireAdmin = () => requireUser(["ADMIN"]);

function requireStaffFor(id: string) {
  const u = requireUser(["DEPARTMENT_STAFF"]);
  const r = load().grReports.find((x) => x.id === id);
  if (!r) throw new ApiError("NOT_FOUND", "Report not found");
  if (!isStaffFor(u, r)) throw new ApiError("FORBIDDEN", "Not assigned to your department");
  return { u, r };
}

function requireStatus(r: GrReport, allowed: GrStatus[]) {
  if (!allowed.includes(r.status)) throw new ApiError("CONFLICT", `Not allowed while ${r.status}`);
}

// =====================================================================
// Reference + hybrid routing
// =====================================================================

export const listCategories = async () => delay(GR_CATEGORIES);

export const listDepartments = async (provinceId?: string) =>
  delay(GR_DEPARTMENTS.filter((d) => !provinceId || d.provinceId === provinceId));

/** Hybrid routing: the system suggests, the admin confirms in approveAndAssign. */
export function suggestDepartment(category: GrCategory, provinceId: string, cityId?: string): GrDepartment | null {
  const type = GR_CATEGORIES.find((c) => c.id === category)?.departmentType;
  if (!type) return null;
  return (
    GR_DEPARTMENTS.find(
      (d) => d.type === type && d.provinceId === provinceId && (!cityId || d.coverageCityIds.length === 0 || d.coverageCityIds.includes(cityId)),
    ) ?? null
  );
}

// =====================================================================
// Citizen
// =====================================================================

const words = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3));

/**
 * Before creating, show possible duplicates so the citizen can support the
 * existing report instead. Citizens only see public reports; admins see all open ones.
 */
export async function findPossibleDuplicates(input: {
  category: GrCategory;
  location: LatLng;
  title?: string;
  description?: string;
  excludeId?: string;
}): Promise<GrDuplicateCandidate[]> {
  const u = currentUser();
  const t = now();
  const mine = words(`${input.title ?? ""} ${input.description ?? ""}`);
  const out: GrDuplicateCandidate[] = [];
  for (const r of load().grReports) {
    if (r.id === input.excludeId || r.category !== input.category || FINAL.includes(r.status)) continue;
    if (!isAdmin(u) && !isPublic(r)) continue;
    if (addDays(r.createdAt, GR_RULES.duplicateWindowDays) < t && r.status !== "REOPENED") continue;
    const distanceM = Math.round(distanceKm(input.location, r.location) * 1000);
    if (distanceM > GR_RULES.duplicateRadiusM) continue;
    const reasons: GrDuplicateCandidate["reasons"] = ["SAME_CATEGORY", "NEARBY"];
    let score = 40 + Math.round(40 * (1 - distanceM / GR_RULES.duplicateRadiusM));
    if (addDays(r.createdAt, 7) > t) {
      score += 10;
      reasons.push("RECENT");
    }
    const shared = [...words(`${r.title} ${r.description}`)].filter((w) => mine.has(w)).length;
    if (shared) {
      score += Math.min(10, shared * 3);
      reasons.push("SIMILAR_TEXT");
    }
    out.push({ report: view(r, u), distanceM, score: Math.min(100, score), reasons });
  }
  return delay(out.sort((a, b) => b.score - a.score).slice(0, 5));
}

export async function createReport(input: GrCreateReportInput): Promise<GrReportView> {
  const u = requireUser();
  validateCategory(input.category);
  validateText(input.title, input.description);
  validateLocation(input.location, input.provinceId, input.cityId);
  const t = now();
  const r: GrReport = {
    id: nextId("gr"),
    code: nextCode(),
    reporterId: u.id,
    category: input.category,
    title: input.title.trim(),
    description: input.description.trim(),
    photos: toPhotos(input.photos, u, "EVIDENCE"),
    location: input.location,
    locationSource: input.locationSource,
    addressHint: input.addressHint?.trim() || undefined,
    provinceId: input.provinceId,
    cityId: input.cityId,
    priority: "MEDIUM", // admin sets the real priority during review
    status: "SUBMITTED",
    supporters: [],
    confirmations: [],
    reopenCount: 0,
    history: [{ action: "CREATED", to: "SUBMITTED", by: u.id, byRole: roleOf(u), at: t }],
    createdAt: t,
    updatedAt: t,
  };
  load().grReports.unshift(r);
  notifyUser(u.id, "GR_SUBMITTED", r, "បានដាក់ស្នើ។ យើងនឹងពិនិត្យឆាប់ៗ", "submitted. We'll review it soon");
  save();
  return delay(view(r, u));
}

/** Owner edits while SUBMITTED or NEED_MORE_INFO. `photos` replaces the evidence photos. */
export async function updateReport(id: string, patch: GrUpdateReportInput): Promise<GrReportView> {
  const u = requireUser();
  const r = getOr404(id, u);
  if (!permissions(r, u).edit) throw new ApiError("FORBIDDEN", "This report can't be edited now");
  const next = { ...r, ...patch, provinceId: patch.provinceId ?? r.provinceId, cityId: patch.cityId ?? r.cityId };
  if (patch.category) validateCategory(patch.category);
  validateText(next.title, next.description);
  validateLocation(next.location, next.provinceId, next.cityId);
  if (patch.photos) r.photos = [...r.photos.filter((p) => p.kind !== "EVIDENCE"), ...toPhotos(patch.photos, u, "EVIDENCE")];
  Object.assign(r, {
    category: next.category,
    title: next.title.trim(),
    description: next.description.trim(),
    location: next.location,
    locationSource: next.locationSource,
    addressHint: next.addressHint?.trim() || undefined,
    provinceId: next.provinceId,
    cityId: next.cityId,
  });
  record(r, u, "EDITED");
  save();
  return delay(view(r, u));
}

export async function cancelReport(id: string, reason?: string): Promise<GrReportView> {
  const u = requireUser();
  const r = getOr404(id, u);
  if (!permissions(r, u).cancel) throw new ApiError("FORBIDDEN", "This report can't be cancelled now");
  record(r, u, "CANCELLED", { to: "CANCELLED", note: reason?.trim() || undefined });
  save();
  return delay(view(r, u));
}

/** Owner answers the admin's question. Goes back to UNDER_REVIEW. */
export async function respondToInfoRequest(id: string, input: { message: string; photos?: GrPhotoInput[] }): Promise<GrReportView> {
  const u = requireUser();
  const r = getOr404(id, u);
  if (!permissions(r, u).respondToInfo) throw new ApiError("FORBIDDEN", "No information was requested");
  if (!input.message?.trim()) throw new ApiError("VALIDATION", "Add the requested information", "message");
  const evidence = r.photos.filter((p) => p.kind === "EVIDENCE").length;
  r.photos.push(...toPhotos(input.photos, u, "EVIDENCE", evidence));
  load().grComments.push({
    id: nextId("grc"), reportId: r.id, authorId: u.id, authorRole: "CITIZEN", body: input.message.trim(), internal: false, createdAt: now(),
  });
  r.infoRequest = undefined;
  record(r, u, "INFO_PROVIDED", { to: "UNDER_REVIEW", note: input.message.trim() });
  notifyAdmins(r, "GR_COMMENT", "ពលរដ្ឋបានបន្ថែមព័ត៌មាន", "citizen added the requested information");
  save();
  return delay(view(r, u));
}

/** Owner says it's not fixed (within 30 days, max 2 times). Admin then reassigns or closes. */
export async function requestReopen(id: string, reason: string): Promise<GrReportView> {
  const u = requireUser();
  const r = getOr404(id, u);
  if (!permissions(r, u).requestReopen) throw new ApiError("FORBIDDEN", "This report can't be reopened");
  if (!reason?.trim()) throw new ApiError("VALIDATION", "Say what is still wrong", "reason");
  r.reopenCount += 1;
  r.confirmations = r.confirmations.filter((c) => c.userId !== u.id);
  r.confirmations.push({ userId: u.id, stillExists: true, at: now() });
  record(r, u, "REOPENED", { to: "REOPENED", note: reason.trim() });
  notifyAdmins(r, "GR_REOPENED", "ពលរដ្ឋថាមិនទាន់ជួសជុលរួច", "citizen says it is not fixed");
  notifyStaff(r, "GR_REOPENED", "បានបើកឡើងវិញ", "reopened");
  save();
  return delay(view(r, u));
}

export async function myReports(filter: GrReportFilter = {}): Promise<GrReportView[]> {
  const u = requireUser();
  return delay(applyFilter(load().grReports.filter((r) => r.reporterId === u.id), filter).map((r) => view(r, u)));
}

/** By id or code (e.g. "RPT-2026-00005"). */
export async function getReport(idOrCode: string): Promise<GrReportView> {
  const u = currentUser();
  return delay(view(getOr404(idOrCode, u), u));
}

/** Public feed and map: approved reports only, no personal information. */
export async function listPublicReports(filter: GrReportFilter = {}): Promise<GrReportView[]> {
  const u = currentUser();
  const statuses = filter.status?.length ? filter.status.filter((s) => GR_PUBLIC_STATUSES.includes(s)) : GR_PUBLIC_STATUSES;
  return delay(applyFilter(load().grReports, { ...filter, status: statuses }).map((r) => view(r, u)));
}

/** "Me too": one support per account, not on your own report. */
export async function supportReport(id: string): Promise<GrReportView> {
  const u = requireUser();
  const r = getOr404(id, u);
  if (isOwner(u, r)) throw new ApiError("VALIDATION", "You can't support your own report");
  if (r.supporters.includes(u.id)) throw new ApiError("CONFLICT", "You already support this report");
  if (!OPEN_WORK.includes(r.status)) throw new ApiError("CONFLICT", "Only open reports can be supported");
  r.supporters.push(u.id);
  r.updatedAt = now();
  save();
  return delay(view(r, u));
}

/** Confirm whether the issue still exists (latest answer per user counts). */
export async function confirmIssue(id: string, stillExists: boolean): Promise<GrReportView> {
  const u = requireUser();
  const r = getOr404(id, u);
  if (["REJECTED", "DUPLICATE", "CANCELLED"].includes(r.status)) throw new ApiError("CONFLICT", "This report is closed");
  r.confirmations = r.confirmations.filter((c) => c.userId !== u.id);
  r.confirmations.push({ userId: u.id, stillExists, at: now() });
  save();
  return delay(view(r, u));
}

// =====================================================================
// Comments
// =====================================================================

/** Internal notes are only shown to admins and the assigned department. */
export async function listComments(reportId: string): Promise<GrCommentView[]> {
  const u = currentUser();
  const r = getOr404(reportId, u);
  const insider = isAdmin(u) || isStaffFor(u, r);
  return delay(
    load()
      .grComments.filter((c) => c.reportId === r.id && (insider || !c.internal))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => ({
        id: c.id,
        body: c.body,
        internal: c.internal,
        authorRole: c.authorRole,
        authorLabel: c.authorRole === "CITIZEN" ? "Reporter" : (findUser(c.authorId)?.fullName ?? c.authorRole),
        isMine: c.authorId === u?.id,
        createdAt: c.createdAt,
      })),
  );
}

/** Reporter, admins and the assigned department can comment. Only admins/staff can write internal notes. */
export async function addComment(reportId: string, input: { body: string; internal?: boolean }): Promise<GrCommentView> {
  const u = requireUser();
  const r = getOr404(reportId, u);
  if (!permissions(r, u).comment) throw new ApiError("FORBIDDEN", "You can't comment on this report");
  const insider = isAdmin(u) || isStaffFor(u, r);
  if (input.internal && !insider) throw new ApiError("FORBIDDEN", "Only staff can write internal notes");
  const body = input.body?.trim() ?? "";
  if (body.length < 1 || body.length > 1000) throw new ApiError("VALIDATION", "Comment must be 1–1000 characters", "body");
  const c = {
    id: nextId("grc"), reportId: r.id, authorId: u.id, authorRole: roleOf(u), body, internal: !!input.internal, createdAt: now(),
  };
  load().grComments.push(c);
  if (!c.internal) {
    if (!isOwner(u, r)) notifyUser(r.reporterId, "GR_COMMENT", r, "មានមតិថ្មី", "new comment");
    else notifyStaff(r, "GR_COMMENT", "ពលរដ្ឋបានបញ្ចេញមតិ", "reporter commented");
  }
  save();
  return delay({ id: c.id, body, internal: c.internal, authorRole: c.authorRole, authorLabel: insider ? u.fullName : "Reporter", isMine: true, createdAt: c.createdAt });
}

// =====================================================================
// Admin
// =====================================================================

export async function adminListReports(filter: GrReportFilter = {}): Promise<GrReportView[]> {
  const u = requireAdmin();
  return delay(applyFilter(load().grReports, filter).map((r) => view(r, u)));
}

export async function startReview(id: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  requireStatus(r, ["SUBMITTED"]);
  record(r, u, "REVIEW_STARTED", { to: "UNDER_REVIEW" });
  save();
  return delay(view(r, u));
}

export async function requestInfo(id: string, question: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  requireStatus(r, ["SUBMITTED", "UNDER_REVIEW"]);
  if (!question?.trim()) throw new ApiError("VALIDATION", "Write what you need", "question");
  r.infoRequest = question.trim();
  load().grComments.push({ id: nextId("grc"), reportId: r.id, authorId: u.id, authorRole: "ADMIN", body: r.infoRequest, internal: false, createdAt: now() });
  record(r, u, "INFO_REQUESTED", { to: "NEED_MORE_INFO", note: r.infoRequest });
  notifyUser(r.reporterId, "GR_INFO_REQUESTED", r, "សូមបន្ថែមព័ត៌មាន", "more information needed");
  save();
  return delay(view(r, u));
}

function assign(r: GrReport, u: UserRecord, departmentId: string, action: GrAction, note?: string) {
  const dept = deptById(departmentId);
  if (!dept) throw new ApiError("VALIDATION", "Choose a department", "departmentId");
  if (dept.provinceId !== r.provinceId) throw new ApiError("VALIDATION", "Department doesn't cover this province", "departmentId");
  const t = now();
  r.departmentId = dept.id;
  r.acceptedBy = undefined;
  r.acceptedAt = undefined;
  r.assignedAt = t;
  r.dueAt = addDays(t, GR_RULES.slaDays[r.priority]);
  record(r, u, action, { to: "ASSIGNED", note: note ?? dept.name.en });
  notifyStaff(r, "GR_NEW_TASK", "កិច្ចការថ្មី", "new task");
  return dept;
}

/**
 * Approve and assign in one step (hybrid routing): uses the suggested department
 * unless the admin picks another. Works from review states and from REOPENED.
 */
export async function approveAndAssign(
  id: string,
  opts: { departmentId?: string; priority?: GrPriority; note?: string } = {},
): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  requireStatus(r, [...REVIEWABLE, "REOPENED"]);
  if (opts.priority && opts.priority !== r.priority) {
    record(r, u, "PRIORITY_CHANGED", { note: `${r.priority} → ${opts.priority}` });
    r.priority = opts.priority;
  }
  const deptId = opts.departmentId ?? suggestDepartment(r.category, r.provinceId, r.cityId)?.id;
  if (!deptId) throw new ApiError("VALIDATION", "No suggested department: choose one", "departmentId");
  const wasReopened = r.status === "REOPENED";
  const dept = assign(r, u, deptId, wasReopened ? "REASSIGNED" : "APPROVED_ASSIGNED", opts.note);
  notifyUser(
    r.reporterId,
    wasReopened ? "GR_ASSIGNED" : "GR_APPROVED",
    r,
    `ត្រូវបានអនុម័ត និងបញ្ជូនទៅ ${dept.name.km}`,
    `approved and assigned to ${dept.name.en}`,
  );
  save();
  return delay(view(r, u));
}

export async function reassign(id: string, departmentId: string, note?: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  requireStatus(r, ["ASSIGNED", "IN_PROGRESS"]);
  if (r.departmentId === departmentId) throw new ApiError("CONFLICT", "Already assigned to this department");
  const dept = assign(r, u, departmentId, "REASSIGNED", note);
  notifyUser(r.reporterId, "GR_ASSIGNED", r, `បញ្ជូនទៅ ${dept.name.km}`, `assigned to ${dept.name.en}`);
  save();
  return delay(view(r, u));
}

export async function rejectReport(id: string, reason: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  requireStatus(r, REVIEWABLE);
  if (!reason?.trim()) throw new ApiError("VALIDATION", "A reason is required", "reason");
  r.rejectReason = reason.trim();
  record(r, u, "REJECTED", { to: "REJECTED", note: r.rejectReason });
  notifyUser(r.reporterId, "GR_REJECTED", r, `មិនត្រូវបានទទួលយក៖ ${r.rejectReason}`, `rejected: ${r.rejectReason}`);
  save();
  return delay(view(r, u));
}

/** Admin decides duplicates. Supporters (and the reporter) move to the original report. */
export async function markDuplicate(id: string, originalId: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  const orig = getOr404(originalId, u);
  requireStatus(r, REVIEWABLE);
  if (orig.id === r.id || ["DUPLICATE", "REJECTED", "CANCELLED"].includes(orig.status))
    throw new ApiError("VALIDATION", "Pick a valid original report", "originalId");
  r.duplicateOf = orig.id;
  for (const s of [r.reporterId, ...r.supporters]) if (s !== orig.reporterId && !orig.supporters.includes(s)) orig.supporters.push(s);
  record(r, u, "MARKED_DUPLICATE", { to: "DUPLICATE", note: `Same as ${orig.code}` });
  notifyUser(r.reporterId, "GR_DUPLICATE", r, `ស្ទួននឹង ${orig.code}។ យើងបានបន្ថែមការគាំទ្ររបស់អ្នក`, `duplicate of ${orig.code}. Your support was added to it`);
  save();
  return delay(view(r, u));
}

export async function changeCategory(id: string, category: GrCategory): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  validateCategory(category);
  if (FINAL.includes(r.status)) throw new ApiError("CONFLICT", "Report is closed");
  if (category === r.category) return delay(view(r, u));
  record(r, u, "CATEGORY_CHANGED", { note: `${r.category} → ${category}` });
  r.category = category;
  save();
  return delay(view(r, u));
}

/** Changing priority on an assigned report recalculates the due date. */
export async function setPriority(id: string, priority: GrPriority, reason?: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  if (FINAL.includes(r.status)) throw new ApiError("CONFLICT", "Report is closed");
  if (priority === r.priority) return delay(view(r, u));
  record(r, u, "PRIORITY_CHANGED", { note: `${r.priority} → ${priority}${reason ? `: ${reason}` : ""}` });
  r.priority = priority;
  if (r.assignedAt) r.dueAt = addDays(r.assignedAt, GR_RULES.slaDays[priority]);
  save();
  return delay(view(r, u));
}

/** Admin verifies the fix (RESOLVED) or decides a reopened report is fine (REOPENED). */
export async function closeReport(id: string, note?: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  requireStatus(r, ["RESOLVED", "REOPENED"]);
  if (r.status === "REOPENED" && !note?.trim()) throw new ApiError("VALIDATION", "Explain why it's closed", "note");
  r.closedAt = now();
  record(r, u, "CLOSED", { to: "CLOSED", note: note?.trim() || undefined });
  notifyUser(r.reporterId, "GR_CLOSED", r, "បានបិទ (បានផ្ទៀងផ្ទាត់) ✅", "closed: verified fixed ✅");
  save();
  return delay(view(r, u));
}

/** Admin doesn't accept the department's fix: back to IN_PROGRESS. */
export async function sendBack(id: string, reason: string): Promise<GrReportView> {
  const u = requireAdmin();
  const r = getOr404(id, u);
  requireStatus(r, ["RESOLVED"]);
  if (!reason?.trim()) throw new ApiError("VALIDATION", "Say what is missing", "reason");
  r.resolvedAt = undefined;
  record(r, u, "RESOLUTION_REJECTED", { to: "IN_PROGRESS", note: reason.trim() });
  notifyStaff(r, "GR_REOPENED", "ត្រូវការការងារបន្ថែម", "admin sent it back");
  save();
  return delay(view(r, u));
}

/** Admin dashboard: counts, overdue, rates, department performance. */
export async function dashboard(filter: { provinceId?: string } = {}): Promise<GrDashboard> {
  requireAdmin();
  const rows = load().grReports.filter((r) => !filter.provinceId || r.provinceId === filter.provinceId);
  const byStatus = Object.fromEntries(
    (["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFO", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED", "REOPENED", "DUPLICATE", "CANCELLED"] as GrStatus[]).map((s) => [s, 0]),
  ) as Record<GrStatus, number>;
  const byCategory: GrDashboard["byCategory"] = {};
  const byCity: GrDashboard["byCity"] = {};
  for (const r of rows) {
    byStatus[r.status] += 1;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    byCity[r.cityId] = (byCity[r.cityId] ?? 0) + 1;
  }
  const hours = (list: GrReport[], from: (r: GrReport) => string | undefined, to: (r: GrReport) => string | undefined) => {
    const h = list.filter((r) => from(r) && to(r)).map((r) => (Date.parse(to(r)!) - Date.parse(from(r)!)) / 3_600_000);
    return h.length ? Math.round((h.reduce((a, b) => a + b, 0) / h.length) * 10) / 10 : null;
  };
  const closed = rows.filter((r) => r.status === "CLOSED");
  const valid = rows.length - byStatus.REJECTED - byStatus.DUPLICATE - byStatus.CANCELLED;
  return delay({
    total: rows.length,
    pendingReview: byStatus.SUBMITTED + byStatus.UNDER_REVIEW,
    needMoreInfo: byStatus.NEED_MORE_INFO,
    assigned: byStatus.ASSIGNED,
    inProgress: byStatus.IN_PROGRESS,
    resolved: byStatus.RESOLVED,
    closed: byStatus.CLOSED,
    rejected: byStatus.REJECTED,
    overdue: rows.filter((r) => isOverdue(r)).length,
    byStatus,
    byCategory,
    byCity,
    resolutionRate: valid > 0 ? Math.round((closed.length / valid) * 1000) / 10 : null,
    avgResolutionHours: hours(closed, (r) => r.createdAt, (r) => r.closedAt),
    departments: GR_DEPARTMENTS.filter((d) => !filter.provinceId || d.provinceId === filter.provinceId).map((d) => {
      const mine = rows.filter((r) => r.departmentId === d.id);
      return {
        departmentId: d.id,
        name: d.name,
        assigned: mine.filter((r) => r.status === "ASSIGNED").length,
        inProgress: mine.filter((r) => r.status === "IN_PROGRESS").length,
        resolved: mine.filter((r) => r.status === "RESOLVED").length,
        closed: mine.filter((r) => r.status === "CLOSED").length,
        overdue: mine.filter((r) => isOverdue(r)).length,
        avgResolutionHours: hours(mine, (r) => r.assignedAt, (r) => r.resolvedAt ?? r.closedAt),
      };
    }),
  });
}

// =====================================================================
// Department staff
// =====================================================================

/** Reports assigned to the staff member's department. Overdue and most urgent first. */
export async function staffTasks(opts: { includeDone?: boolean } = {}): Promise<GrReportView[]> {
  const u = requireUser(["DEPARTMENT_STAFF"]);
  const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  const rows = load()
    .grReports.filter(
      (r) => r.departmentId === u.departmentId && (opts.includeDone ? true : ["ASSIGNED", "IN_PROGRESS"].includes(r.status)),
    )
    .sort(
      (a, b) =>
        Number(isOverdue(b)) - Number(isOverdue(a)) || rank[a.priority] - rank[b.priority] || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""),
    );
  return delay(rows.map((r) => view(r, u)));
}

export async function acceptTask(id: string): Promise<GrReportView> {
  const { u, r } = requireStaffFor(id);
  if (!permissions(r, u).accept) throw new ApiError("CONFLICT", "Task can't be accepted now");
  r.acceptedBy = u.id;
  r.acceptedAt = now();
  record(r, u, "ACCEPTED");
  save();
  return delay(view(r, u));
}

/** ASSIGNED -> IN_PROGRESS. Accepts the task too if nobody has yet. */
export async function startWork(id: string, note?: string): Promise<GrReportView> {
  const { u, r } = requireStaffFor(id);
  requireStatus(r, ["ASSIGNED"]);
  if (!r.acceptedBy) {
    r.acceptedBy = u.id;
    r.acceptedAt = now();
    record(r, u, "ACCEPTED");
  }
  record(r, u, "WORK_STARTED", { to: "IN_PROGRESS", note: note?.trim() || undefined });
  notifyUser(r.reporterId, "GR_WORK_STARTED", r, "ការងារបានចាប់ផ្តើម", "work started");
  save();
  return delay(view(r, u));
}

export async function addProgress(id: string, input: { note: string; photos?: GrPhotoInput[]; internal?: boolean }): Promise<GrReportView> {
  const { u, r } = requireStaffFor(id);
  requireStatus(r, ["IN_PROGRESS"]);
  if (!input.note?.trim()) throw new ApiError("VALIDATION", "Write a progress note", "note");
  r.photos.push(...toPhotos(input.photos, u, "REPAIR"));
  record(r, u, "PROGRESS_UPDATE", { note: input.note.trim(), internal: !!input.internal });
  save();
  return delay(view(r, u));
}

/** IN_PROGRESS -> RESOLVED with a resolution note (and repair photos). Admin then closes. */
export async function resolveReport(id: string, input: { note: string; photos?: GrPhotoInput[] }): Promise<GrReportView> {
  const { u, r } = requireStaffFor(id);
  requireStatus(r, ["IN_PROGRESS"]);
  if (!input.note?.trim()) throw new ApiError("VALIDATION", "Add a resolution note", "note");
  r.photos.push(...toPhotos(input.photos, u, "REPAIR"));
  r.resolutionNote = input.note.trim();
  r.resolvedAt = now();
  record(r, u, "RESOLVED", { to: "RESOLVED", note: r.resolutionNote });
  notifyUser(r.reporterId, "GR_RESOLVED", r, "ផ្នែកបានជួសជុលរួច (រង់ចាំការផ្ទៀងផ្ទាត់)", "department says it's fixed (waiting for verification)");
  notifyAdmins(r, "GR_RESOLVED", "រង់ចាំការផ្ទៀងផ្ទាត់", "waiting for verification");
  save();
  return delay(view(r, u));
}
