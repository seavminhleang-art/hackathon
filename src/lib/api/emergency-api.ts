// Emergency Response & Incident Reporting mock API (used as `api.em.*`).
// Spec: docs/features/emergency.md
//
// Directory  getHotlines, listIncidentTypes, listServices, nearbyServices, getService
// Contacts   listTrustedContacts, addTrustedContact, updateTrustedContact, removeTrustedContact,
//            devSimulateContactReply, devSimulateContactLeave, sendTestAlert
// Citizen    sendSos, createIncident, cancelIncident, cancelSosAccidental, closeSosSafe,
//            myIncidents, getMyIncident
// Org        orgInbox, getOrgIncident, updateDispatch
// Admin      adminListIncidents, verifyIncident, assignOrganization, rejectIncident, markDuplicate,
//            publishAlert (-> Community & Services announcement), createNewsRelease
// Reporter   listNewsReleases
// Public     listPublicIncidents
// Helpers    deriveIncidentStatus, isHelpOnTheWay

import type {
  CsCreateAnnouncementInput,
  EmCreateIncidentInput,
  EmCreateServiceInput,
  EmDispatch,
  EmDispatchStatus,
  EmIncident,
  EmIncidentFilter,
  EmIncidentForOrg,
  EmIncidentForReporter,
  EmIncidentStatus,
  EmIncidentType,
  EmNewsRelease,
  EmOrganization,
  EmPublicIncident,
  EmServiceFilter,
  EmServiceView,
  EmSeverity,
  EmSosInput,
  EmSosResult,
  EmTrustedContact,
  EmUpdateServiceInput,
  I18nText,
  LatLng,
  UserRecord,
  CsScope,
} from "@/types";
import { EM_RULES } from "@/types";
import { EMERGENCY_HOTLINES } from "@/lib/mock/data";
import { EM_INCIDENT_TYPES, EM_ORGANIZATIONS } from "@/lib/mock/emergency";
import { distanceKm, findCity } from "@/lib/mock/locations";
import { createAnnouncement, isOpenAt } from "./community-api";
import { smsProvider } from "@/lib/sms/sms-provider";
import {
  ApiError,
  currentUser,
  delay,
  findUser,
  load,
  nextId,
  normalizePhone,
  toLocalPhone,
  notify,
  now,
  recordAudit,
  recordStatusHistory,
  requireUser,
  save,
} from "./mock-db";

// =====================================================================
// Helpers
// =====================================================================

const msg = (km: string, en: string): I18nText => ({ km, en });
const typeMeta = (t: EmIncidentType) => EM_INCIDENT_TYPES.find((x) => x.id === t)!;
const orgById = (id: string) => (load().emOrganizations || EM_ORGANIZATIONS).find((o) => o.id === id);
const round = (l: LatLng): LatLng => ({
  lat: +l.lat.toFixed(EM_RULES.publicLocationDecimals),
  lng: +l.lng.toFixed(EM_RULES.publicLocationDecimals),
});

/** Progress order. Terminal alternatives (REJECTED, CANCELLED, DUPLICATE, CLOSED_BY_USER) sit outside it. */
const PROGRESS: EmIncidentStatus[] = ["SUBMITTED", "RECEIVED", "UNDER_REVIEW", "ACKNOWLEDGED", "RESPONDING", "RESOLVED"];
const DISPATCH_PROGRESS: EmDispatchStatus[] = ["SENT", "RECEIVED", "UNDER_REVIEW", "ACKNOWLEDGED", "RESPONDING", "RESOLVED"];
const CLOSED: EmIncidentStatus[] = ["RESOLVED", "REJECTED", "CANCELLED", "DUPLICATE", "CLOSED_BY_USER"];

const STATUS_TEXT: Record<EmIncidentStatus, I18nText> = {
  SUBMITTED: msg("បានដាក់ស្នើ (មិនទាន់មានការបញ្ជាក់)", "Submitted (not confirmed yet)"),
  RECEIVED: msg("ស្ថាប័នបានទទួល", "Received by the organization"),
  UNDER_REVIEW: msg("កំពុងពិនិត្យ", "Under review"),
  ACKNOWLEDGED: msg("ស្ថាប័នបានទទួលស្គាល់", "Acknowledged"),
  RESPONDING: msg("កំពុងឆ្លើយតប", "Responding"),
  RESOLVED: msg("បានដោះស្រាយ", "Resolved"),
  CLOSED_BY_USER: msg("បានបិទដោយអ្នករាយការណ៍ (សុវត្ថិភាព)", "Closed by user (safe)"),
  REJECTED: msg("ត្រូវបានបដិសេធ", "Rejected"),
  CANCELLED: msg("បានបោះបង់", "Cancelled"),
  DUPLICATE: msg("ស្ទួននឹងរបាយការណ៍ផ្សេង", "Duplicate of another report"),
  FAILED_RETRYING: msg("បរាជ័យ កំពុងសាកល្បងឡើងវិញ", "Failed, retrying"),
};

/**
 * Derive incident status from individual dispatches according to multi-dispatch rules:
 * - Filter active dispatches: dispatches not DECLINED and not CANNOT_CONTINUE
 * - If empty: SUBMITTED
 * - If all active are RESOLVED: RESOLVED
 * - Else if any active is RESPONDING: RESPONDING
 * - Else if any active is ACKNOWLEDGED: ACKNOWLEDGED
 * - Else if any active is UNDER_REVIEW: UNDER_REVIEW
 * - Else if any active is RECEIVED: RECEIVED
 * - Else: SUBMITTED
 */
export function deriveIncidentStatus(dispatches: { status: EmDispatchStatus }[]): EmIncidentStatus {
  const active = dispatches.filter((d) => d.status !== "DECLINED" && d.status !== "CANNOT_CONTINUE");
  if (!active.length) return "SUBMITTED";
  if (active.every((d) => d.status === "RESOLVED")) return "RESOLVED";
  if (active.some((d) => d.status === "RESPONDING")) return "RESPONDING";
  if (active.some((d) => d.status === "ACKNOWLEDGED")) return "ACKNOWLEDGED";
  if (active.some((d) => d.status === "UNDER_REVIEW")) return "UNDER_REVIEW";
  if (active.some((d) => d.status === "RECEIVED")) return "RECEIVED";
  return "SUBMITTED";
}

/**
 * Check if responders are confirmed on the way.
 * Key Safety Rule: NEVER show "help is on the way" before dispatch is confirmed RESPONDING!
 */
export function isHelpOnTheWay(incident: { status: EmIncidentStatus; dispatches?: { status: EmDispatchStatus }[] }): boolean {
  if (incident.status === "RESPONDING") return true;
  if (incident.dispatches?.some((d) => d.status === "RESPONDING")) return true;
  return false;
}

function validateLocation(input: {
  location?: LatLng;
  landmark?: string;
  addressHint?: string;
  provinceId: string;
  cityId: string;
  locationConfirmed?: boolean;
  locationStatus?: string;
}) {
  if (findCity(input.cityId)?.provinceId !== input.provinceId) {
    throw new ApiError("VALIDATION", "Choose a city", "cityId");
  }
  const hasCoords = input.location && typeof input.location.lat === "number" && typeof input.location.lng === "number";
  const hasLandmark = !!(input.landmark?.trim() || input.addressHint?.trim());
  if (!hasCoords && !hasLandmark) {
    throw new ApiError("VALIDATION", "Location coordinates or landmark description is required", "location");
  }
}

/** Pick one organization per routed type: nearest in-province covering org, else nearest anywhere. */
export function routeOrganizations(type: EmIncidentType, at: { location: LatLng; provinceId: string; cityId: string }): EmOrganization[] {
  const out: EmOrganization[] = [];
  for (const orgType of typeMeta(type).routesTo) {
    const candidates = (load().emOrganizations || EM_ORGANIZATIONS).filter((o) => o.type === orgType && o.active !== false);
    const local = candidates.filter(
      (o) => o.provinceId === at.provinceId && (o.coverageCityIds.length === 0 || o.coverageCityIds.includes(at.cityId)),
    );
    const pool = local.length ? local : candidates;
    const best = [...pool].sort((a, b) => distanceKm(at.location, a.location) - distanceKm(at.location, b.location))[0];
    if (best) out.push(best);
  }
  return out;
}

function staffOf(orgId: string) {
  return load().users.filter((u) => u.role === "ORGANIZATION" && u.organizationId === orgId);
}

function dispatchTo(incident: EmIncident, org: EmOrganization, routedBy: string) {
  const t = now();
  const dp: EmDispatch = {
    id: nextId("dp"),
    incidentId: incident.id,
    organizationId: org.id,
    channel: "IN_APP",
    status: "SENT",
    routedBy,
    sentAt: t,
    updatedAt: t,
  };
  load().emDispatches.push(dp);
  const label = typeMeta(incident.type).label;
  for (const staff of staffOf(org.id)) {
    notify({
      userId: staff.id,
      type: "EM_NEW_INCIDENT",
      incidentId: incident.id,
      message:
        incident.kind === "SOS"
          ? msg(`SOS ថ្មី៖ ${label.km}`, `New SOS: ${label.en}`)
          : msg(`របាយការណ៍ថ្មី៖ ${label.km}`, `New incident: ${label.en}`),
    });
  }
  return dp;
}

function setStatus(inc: EmIncident, status: EmIncidentStatus, by: string, opts: { organizationId?: string; note?: string } = {}) {
  if (inc.status === status) return;
  const fromStatus = inc.status;
  const t = now();
  inc.status = status;
  inc.updatedAt = t;
  inc.history.push({ status, by, organizationId: opts.organizationId, note: opts.note, at: t });
  recordStatusHistory(inc.id, by, fromStatus, status, opts.note, opts.organizationId);
  if (by !== inc.submittedByUserId && by !== inc.reporterId) {
    notify({
      userId: inc.submittedByUserId || inc.reporterId,
      type: "EM_STATUS",
      incidentId: inc.id,
      message: opts.note
        ? msg(`${STATUS_TEXT[status].km}៖ ${opts.note}`, `${STATUS_TEXT[status].en}: ${opts.note}`)
        : STATUS_TEXT[status],
    });
  }
}

/** Incident status = derived from all non-declined dispatches. */
function recomputeStatus(inc: EmIncident, by: string, orgId?: string, note?: string) {
  if (CLOSED.includes(inc.status) && inc.status !== "RESOLVED" && inc.status !== "CLOSED_BY_USER") return;
  const ds = load().emDispatches.filter((x) => x.incidentId === inc.id);
  const derived = deriveIncidentStatus(ds);
  if (PROGRESS.indexOf(derived) > PROGRESS.indexOf(inc.status)) {
    setStatus(inc, derived, by, { organizationId: orgId, note });
  } else if (inc.status === "CLOSED_BY_USER" && derived === "RESOLVED") {
    setStatus(inc, "RESOLVED", by, { organizationId: orgId, note });
  }
}

function forReporter(inc: EmIncident): EmIncidentForReporter {
  const dispatches = load()
    .emDispatches.filter((x) => x.incidentId === inc.id)
    .map((x) => {
      const org = orgById(x.organizationId)!;
      return { ...x, organizationName: org.name, organizationType: org.type };
    });
  const allDispatchesDeclined =
    dispatches.length > 0 && dispatches.every((d) => d.status === "DECLINED" || d.status === "CANNOT_CONTINUE");
  return {
    ...inc,
    dispatches,
    allDispatchesDeclined,
  };
}

function forOrg(inc: EmIncident, dispatch: EmDispatch): EmIncidentForOrg {
  const reporterId = inc.submittedByUserId || inc.reporterId;
  const { reporterId: _unused, ...rest } = inc;
  const reporter = findUser(reporterId);
  const allowCallback = inc.consents ? inc.consents.allowCallback : inc.consent?.shareContactWithResponders;
  const isAnonymous = inc.consents ? inc.consents.anonymous : false;

  const isUnacknowledgedStale =
    (dispatch.status === "SENT" || dispatch.status === "RECEIVED") &&
    Date.now() - new Date(dispatch.sentAt).getTime() >= EM_RULES.unacknowledgedWarningMinutes * 60 * 1000;

  const standDownWarning = (inc.status === "CANCELLED" || inc.closedByUser === true) && dispatch.status === "RESPONDING";

  const otherDispatches = load()
    .emDispatches.filter((x) => x.incidentId === inc.id && x.organizationId !== dispatch.organizationId)
    .map((x) => {
      const org = orgById(x.organizationId)!;
      return { ...x, organizationName: org.name, organizationType: org.type };
    });

  return {
    ...rest,
    dispatch,
    reporterContact:
      allowCallback && !isAnonymous && reporter ? { fullName: reporter.fullName, phone: reporter.phone } : undefined,
    isUnacknowledgedStale,
    standDownWarning,
    otherDispatches,
  };
}

function toPublic(inc: EmIncident): EmPublicIncident {
  return {
    id: inc.id,
    type: inc.type,
    severity: inc.severity,
    status: inc.status,
    approxLocation: round(inc.location),
    provinceId: inc.provinceId,
    cityId: inc.cityId,
    occurredAt: inc.occurredAt,
    alertAnnouncementId: inc.alertAnnouncementId,
  };
}

function getIncidentOr404(idOrCode: string) {
  const inc = load().emIncidents.find((x) => x.id === idOrCode || x.code === idOrCode);
  if (!inc) throw new ApiError("NOT_FOUND", "Incident not found");
  return inc;
}

const since = (ms: number) => new Date(Date.now() - ms).toISOString();

// =====================================================================
// Directory (Core features 5 and 7)
// =====================================================================

export const getHotlines = async () => delay(EMERGENCY_HOTLINES);
export const listIncidentTypes = async () => delay(EM_INCIDENT_TYPES);

function serviceView(o: EmOrganization, near?: LatLng): EmServiceView {
  const sixMonthsAgo = Date.now() - 180 * 86_400_000;
  const isStale = !o.lastVerified || new Date(o.lastVerified).getTime() < sixMonthsAgo;
  return {
    ...o,
    openNow: isOpenAt(o.hours),
    distanceKm: near ? Math.round(distanceKm(near, o.location) * 10) / 10 : undefined,
    isStaleVerified: isStale,
  };
}

/** Emergency services (police, hospitals, ambulance, fire, rescue). News orgs are not listed. */
export async function listServices(filter: EmServiceFilter = {}): Promise<EmServiceView[]> {
  const viewer = currentUser();
  const q = filter.q?.trim().toLowerCase();
  const allOrgs = load().emOrganizations || EM_ORGANIZATIONS;

  let rows = allOrgs
    .filter(
      (o) =>
        o.type !== "NEWS" &&
        (filter.includeDeactivated || o.active !== false) &&
        (!filter.type?.length || filter.type.includes(o.type)) &&
        (!filter.provinceId || o.provinceId === filter.provinceId) &&
        (!filter.cityId || o.cityId === filter.cityId || o.coverageCityIds?.includes(filter.cityId)) &&
        (!q || `${o.name.km} ${o.name.en} ${o.address}`.toLowerCase().includes(q)),
    )
    .map((o) => serviceView(o, filter.near));

  if (filter.openNow) rows = rows.filter((o) => o.openNow);

  if (filter.near) {
    if (filter.radiusKm) rows = rows.filter((o) => o.distanceKm !== undefined && o.distanceKm <= filter.radiusKm!);
    rows.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  } else {
    // Location not shared / near not provided: NEVER calculate fake distance to city center!
    // Sort openNow first, then viewer's province, then name.
    const rank = (o: EmOrganization) => (viewer && o.provinceId === viewer.provinceId ? 0 : 1);
    rows.sort((a, b) => (b.openNow ? 1 : 0) - (a.openNow ? 1 : 0) || rank(a) - rank(b) || a.name.km.localeCompare(b.name.km));
  }
  return delay(rows);
}

/** Core feature 7: nearby services around a location (default 10 km). */
export async function nearbyServices(location: LatLng, opts: { type?: EmServiceFilter["type"]; radiusKm?: number } = {}) {
  return listServices({ near: location, type: opts.type, radiusKm: opts.radiusKm ?? EM_RULES.nearbyRadiusKm });
}

export async function getService(id: string): Promise<EmServiceView> {
  const o = orgById(id);
  if (!o || o.type === "NEWS") throw new ApiError("NOT_FOUND", "Service not found");
  return delay(serviceView(o));
}

/**
 * Admin creates a new emergency service directory entry.
 * Role-guarded: ADMIN only. Writes to audit_log.
 */
export async function createService(input: EmCreateServiceInput): Promise<EmServiceView> {
  const u = requireUser(["ADMIN"]);
  if (!input.name?.km?.trim() || !input.name?.en?.trim()) {
    throw new ApiError("VALIDATION", "Name is required in both Khmer and English", "name");
  }
  if (!input.type) throw new ApiError("VALIDATION", "Service type is required", "type");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new ApiError("VALIDATION", "Invalid phone number", "phone");
  if (!input.address?.trim()) throw new ApiError("VALIDATION", "Address is required", "address");
  if (findCity(input.cityId)?.provinceId !== input.provinceId) {
    throw new ApiError("VALIDATION", "Choose a valid city", "cityId");
  }
  const { lat, lng } = input.location ?? {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new ApiError("VALIDATION", "Valid GPS coordinates are required", "location");
  }

  const d = load();
  if (!d.emOrganizations) d.emOrganizations = structuredClone(EM_ORGANIZATIONS);

  const t = now();
  const org: EmOrganization = {
    id: nextId("org"),
    type: input.type,
    name: input.name,
    provinceId: input.provinceId,
    cityId: input.cityId,
    address: input.address.trim(),
    location: input.location,
    phone,
    hotline: input.hotline,
    hours: input.hours || {
      mon: [{ open: "00:00", close: "24:00" }],
      tue: [{ open: "00:00", close: "24:00" }],
      wed: [{ open: "00:00", close: "24:00" }],
      thu: [{ open: "00:00", close: "24:00" }],
      fri: [{ open: "00:00", close: "24:00" }],
      sat: [{ open: "00:00", close: "24:00" }],
      sun: [{ open: "00:00", close: "24:00" }],
    },
    coverageCityIds: input.coverageCityIds || [],
    verified: true,
    lastVerified: t,
    active: true,
  };

  d.emOrganizations.push(org);
  recordAudit(u, "CREATE_SERVICE", "ORGANIZATION", org.id, {
    name: org.name,
    type: org.type,
    phone: org.phone,
  });
  save();
  return delay(serviceView(org));
}

/**
 * Update service directory entry.
 * Role-guarded: ADMIN can edit any; ORGANIZATION staff can edit ONLY their own organization.
 * Writes to audit_log.
 */
export async function updateService(id: string, patch: EmUpdateServiceInput): Promise<EmServiceView> {
  const u = requireUser(["ADMIN", "ORGANIZATION"]);
  const d = load();
  if (!d.emOrganizations) d.emOrganizations = structuredClone(EM_ORGANIZATIONS);

  const org = d.emOrganizations.find((o) => o.id === id);
  if (!org || org.type === "NEWS") throw new ApiError("NOT_FOUND", "Service not found");

  // Ownership guard: ORGANIZATION staff can only update their own organization
  if (u.role === "ORGANIZATION" && u.organizationId !== id) {
    throw new ApiError("FORBIDDEN", "Cannot edit organizations you do not own");
  }

  if (patch.name) {
    if (!patch.name.km?.trim() || !patch.name.en?.trim()) {
      throw new ApiError("VALIDATION", "Name is required in both Khmer and English", "name");
    }
    org.name = patch.name;
  }
  if (patch.phone) {
    const norm = normalizePhone(patch.phone);
    if (!norm) throw new ApiError("VALIDATION", "Invalid phone number", "phone");
    org.phone = norm;
  }
  if (patch.address !== undefined) {
    if (!patch.address.trim()) throw new ApiError("VALIDATION", "Address cannot be empty", "address");
    org.address = patch.address.trim();
  }
  if (patch.location) {
    const { lat, lng } = patch.location;
    if (typeof lat !== "number" || typeof lng !== "number") {
      throw new ApiError("VALIDATION", "Valid GPS coordinates are required", "location");
    }
    org.location = patch.location;
  }
  if (patch.hours) org.hours = patch.hours;
  if (patch.coverageCityIds !== undefined) org.coverageCityIds = patch.coverageCityIds;
  if (patch.provinceId && patch.cityId) {
    if (findCity(patch.cityId)?.provinceId !== patch.provinceId) {
      throw new ApiError("VALIDATION", "Choose a valid city", "cityId");
    }
    org.provinceId = patch.provinceId;
    org.cityId = patch.cityId;
  }
  if (patch.active !== undefined) {
    if (u.role !== "ADMIN") throw new ApiError("FORBIDDEN", "Only admin can change active status");
    org.active = patch.active;
  }

  const isOrg = u.role === "ORGANIZATION";
  const changedCritical = isOrg && (patch.phone !== undefined || patch.address !== undefined);

  if (changedCritical) {
    org.pendingReview = true;
    org.lastVerified = undefined; // Reset lastVerified when org changes phone/address until admin reviews
  } else if (u.role === "ADMIN") {
    org.pendingReview = false;
    org.lastVerified = now();
  } else {
    org.lastVerified = now();
  }

  recordAudit(u, "UPDATE_SERVICE", "ORGANIZATION", id, { ...patch, pendingReview: org.pendingReview } as Record<string, unknown>);
  save();
  return delay(serviceView(org));
}

/**
 * Deactivate or reactivate an emergency service directory entry.
 * Role-guarded: ADMIN only. Writes to audit_log.
 */
export async function deactivateService(id: string, active = false): Promise<EmServiceView> {
  const u = requireUser(["ADMIN"]);
  const d = load();
  if (!d.emOrganizations) d.emOrganizations = structuredClone(EM_ORGANIZATIONS);

  const org = d.emOrganizations.find((o) => o.id === id);
  if (!org || org.type === "NEWS") throw new ApiError("NOT_FOUND", "Service not found");

  org.active = active;
  org.lastVerified = now();

  recordAudit(u, active ? "REACTIVATE_SERVICE" : "DEACTIVATE_SERVICE", "ORGANIZATION", id, { active });
  save();
  return delay(serviceView(org));
}

// =====================================================================
// Trusted contacts (Core feature 3)
// =====================================================================

export async function listTrustedContacts(): Promise<EmTrustedContact[]> {
  const u = requireUser();
  return delay(load().emContacts.filter((c) => c.ownerId === u.id));
}

export async function addTrustedContact(input: {
  name: string;
  phone: string;
  relation?: string;
  priority?: number;
  notifyOnSos?: boolean;
  shareMedicalInfo?: boolean;
}) {
  const u = requireUser();
  const d = load();
  // DECLINED, LEFT, and EXPIRED do not count towards the maximum 5 contacts
  const activeMine = d.emContacts.filter(
    (c) => c.ownerId === u.id && c.status !== "DECLINED" && c.status !== "LEFT" && c.status !== "EXPIRED",
  );
  if (activeMine.length >= EM_RULES.maxTrustedContacts)
    throw new ApiError("LIMIT", `Up to ${EM_RULES.maxTrustedContacts} active trusted contacts`);
  if (!input.name?.trim()) throw new ApiError("VALIDATION", "Name is required", "name");
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) throw new ApiError("VALIDATION", "Invalid phone number", "phone");
  if (phone === u.phone) throw new ApiError("VALIDATION", "Use someone else's number", "phone");
  if (activeMine.some((c) => c.phone === phone)) throw new ApiError("CONFLICT", "Already in your contacts", "phone");

  const t = now();
  const expiryDate = new Date(Date.now() + EM_RULES.inviteExpiryDays * 86_400_000).toISOString();
  const c: EmTrustedContact = {
    id: nextId("tc"),
    ownerId: u.id,
    name: input.name.trim(),
    phone,
    relation: input.relation?.trim() || undefined,
    priority: input.priority || activeMine.length + 1,
    status: "PENDING",
    inviteSentAt: t,
    inviteExpiresAt: expiryDate,
    shareMedicalInfo: input.shareMedicalInfo ?? false,
    linkedUserId: d.users.find((x) => x.phone === phone)?.id,
    notifyOnSos: input.notifyOnSos ?? true,
    createdAt: t,
    updatedAt: t,
  };
  d.emContacts.push(c);
  save();
  return delay(c);
}

export async function updateTrustedContact(
  id: string,
  patch: { name?: string; relation?: string; priority?: number; notifyOnSos?: boolean; shareMedicalInfo?: boolean },
) {
  const u = requireUser();
  const c = load().emContacts.find((x) => x.id === id && x.ownerId === u.id);
  if (!c) throw new ApiError("NOT_FOUND", "Contact not found");
  if (patch.name !== undefined) c.name = patch.name.trim() || c.name;
  if (patch.relation !== undefined) c.relation = patch.relation.trim() || undefined;
  if (patch.priority !== undefined) c.priority = patch.priority;
  if (patch.notifyOnSos !== undefined) c.notifyOnSos = patch.notifyOnSos;
  if (patch.shareMedicalInfo !== undefined) c.shareMedicalInfo = patch.shareMedicalInfo;
  c.updatedAt = now();
  save();
  return delay(c);
}

export async function resendContactInvite(id: string): Promise<EmTrustedContact> {
  const u = requireUser();
  const d = load();
  const c = d.emContacts.find((x) => x.id === id && x.ownerId === u.id);
  if (!c) throw new ApiError("NOT_FOUND", "Contact not found");
  const t = now();
  c.status = "PENDING";
  c.inviteSentAt = t;
  c.inviteExpiresAt = new Date(Date.now() + EM_RULES.inviteExpiryDays * 86_400_000).toISOString();
  c.updatedAt = t;
  save();
  return delay(c);
}

export async function removeTrustedContact(id: string): Promise<void> {
  const u = requireUser();
  const d = load();
  d.emContacts = d.emContacts.filter((x) => !(x.id === id && x.ownerId === u.id));
  save();
  return delay(undefined);
}

/** Dev-only helper: simulate contact replying CONFIRMED or DECLINED */
export async function devSimulateContactReply(
  id: string,
  status: "CONFIRMED" | "DECLINED" | "YES" | "NO",
): Promise<EmTrustedContact> {
  const d = load();
  const c = d.emContacts.find((x) => x.id === id);
  if (!c) throw new ApiError("NOT_FOUND", "Contact not found");
  c.status = status === "YES" ? "CONFIRMED" : status === "NO" ? "DECLINED" : status;
  c.updatedAt = now();
  save();
  return delay(c);
}

/** Dev-only helper: simulate contact leaving circle (LEFT status) */
export async function devSimulateContactLeave(id: string): Promise<EmTrustedContact> {
  const d = load();
  const c = d.emContacts.find((x) => x.id === id);
  if (!c) throw new ApiError("NOT_FOUND", "Contact not found");
  c.status = "LEFT";
  c.updatedAt = now();
  save();
  return delay(c);
}

/** Dev-only helper: simulate invite expiration (EXPIRED status) */
export async function devSimulateExpireInvite(id: string): Promise<EmTrustedContact> {
  const d = load();
  const c = d.emContacts.find((x) => x.id === id);
  if (!c) throw new ApiError("NOT_FOUND", "Contact not found");
  c.status = "EXPIRED";
  c.updatedAt = now();
  save();
  return delay(c);
}

/**
 * Isolated test alert: sends to all confirmed contacts of user.
 * Labeled [TEST], never creates an incident, never notifies organizations.
 */
export async function sendTestAlert(): Promise<{ message: string; notifiedCount: number }> {
  const u = requireUser();
  const d = load();
  const confirmed = d.emContacts.filter((c) => c.ownerId === u.id && c.status === "CONFIRMED");
  const msgText = `[TEST] Emergency Contact Verification Test from ${u.fullName}. No emergency action is required.`;
  for (const c of confirmed) {
    if (c.linkedUserId) {
      notify({
        userId: c.linkedUserId,
        type: "EM_TEST_ALERT",
        message: msg(`[TEST] សាកល្បងប្រព័ន្ធទំនាក់ទំនងបន្ទាន់ពី ${u.fullName} (គ្មានគ្រោះអាសន្នទេ)`, msgText),
      });
    }
  }
  return delay({ message: msgText, notifiedCount: confirmed.length });
}

// =====================================================================
// Citizen: SOS and incident reports (Core features 1, 2, 4, 8)
// =====================================================================

function newIncident(
  u: UserRecord,
  base: Omit<EmIncident, "id" | "code" | "reporterId" | "submittedByUserId" | "status" | "history" | "verified" | "createdAt" | "updatedAt"> &
    Partial<Pick<EmIncident, "id" | "code">>,
) {
  const t = now();
  const count = load().emIncidents.length + 1;
  const code = base.code || `INC-${new Date().getFullYear()}-${String(count).padStart(5, "0")}`;
  const inc: EmIncident = {
    ...base,
    id: base.id || nextId("em"),
    code,
    reporterId: u.id,
    submittedByUserId: u.id,
    status: "SUBMITTED",
    history: [{ status: "SUBMITTED", by: u.id, at: t }],
    verified: false,
    createdAt: t,
    updatedAt: t,
  };
  load().emIncidents.unshift(inc);
  return inc;
}

/**
 * SOS: the UI must show `hotline` and a call button FIRST. This only adds the
 * in-app request and alerts trusted contacts. Never hard-blocked by rate limits.
 * LOCATION SAFETY: never silently substitute Phnom Penh center if GPS is denied or fails.
 */
export async function sendSos(input: EmSosInput): Promise<EmSosResult> {
  const u = requireUser();
  validateLocation(input);
  const meta = typeMeta(input.type);
  if (!meta) throw new ApiError("VALIDATION", "Choose an emergency type", "type");
  const d = load();

  // Rate limit check: do NOT hard-block! Flag for review instead.
  const recent = d.emIncidents.filter(
    (x) => (x.submittedByUserId === u.id || x.reporterId === u.id) && x.kind === "SOS" && x.createdAt > since(3_600_000),
  );
  const shouldFlagRateLimit = recent.length >= EM_RULES.sosPerHour;

  // Location safety: if GPS was denied or unconfirmed, mark it and flag report for responders
  const isGpsConfirmed =
    (input.locationSource === "GPS" || (!input.locationSource && input.location !== undefined)) &&
    input.locationConfirmed !== false &&
    input.locationStatus !== "UNCONFIRMED" &&
    input.locationStatus !== "NOT_SHARED";
  const locationConfirmed = isGpsConfirmed;
  const locationStatus = locationConfirmed ? "CONFIRMED" : "UNCONFIRMED";
  const shouldFlagLocation = !locationConfirmed;

  const city = findCity(input.cityId);
  const loc = input.location ?? (city ? { lat: 11.5564, lng: 104.9282 } : { lat: 11.5564, lng: 104.9282 });

  const inc = newIncident(u, {
    kind: "SOS",
    type: input.type,
    severity: meta.defaultSeverity === "CRITICAL" ? "HIGH" : (meta.defaultSeverity || "HIGH"),
    suggestedSeverity: meta.defaultSeverity || "HIGH",
    description: input.note?.trim() || (locationConfirmed ? "SOS" : `SOS [Location Unconfirmed: ${input.landmark || "GPS unavailable"}]`),
    photoUrls: [],
    location: loc,
    locationSource: input.locationSource || (locationConfirmed ? "GPS" : "TEXT"),
    locationConfirmed,
    locationStatus,
    landmark: input.landmark?.trim(),
    accuracyM: locationConfirmed ? input.accuracyM : undefined,
    provinceId: input.provinceId,
    cityId: input.cityId,
    occurredAt: now(),
    consent: { shareContactWithResponders: input.shareContactWithResponders ?? true, shareWithNews: false },
    flaggedForReview: shouldFlagRateLimit || shouldFlagLocation,
    flaggedReason: shouldFlagRateLimit
      ? "SOS rate limit: repeated SOS requests within 1 hour"
      : shouldFlagLocation
      ? "Location not confirmed: GPS was denied or unavailable"
      : undefined,
  });

  recordStatusHistory(inc.id, u, "NONE", "SUBMITTED", "SOS triggered by citizen");
  recordAudit(u, "TRIGGER_SOS", "INCIDENT", inc.id, {
    type: inc.type,
    code: inc.code,
    locationStatus,
  });

  for (const org of routeOrganizations(inc.type, inc)) dispatchTo(inc, org, "SYSTEM");

  const notifiedInApp: string[] = [];
  const smsLinks: EmSosResult["smsLinks"] = [];
  if (input.notifyTrustedContacts ?? true) {
    const where = locationConfirmed
      ? `https://maps.google.com/?q=${inc.location.lat},${inc.location.lng}`
      : `Location unconfirmed: ${input.landmark || "See app"}`;
    const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const callbackPhone = u.phone ? toLocalPhone(u.phone) : "—";
    const text = `EMERGENCY: ${u.fullName} needs help (${meta.label.en}) at ${timeStr}. Location: ${where}. Callback: ${callbackPhone}. Status: report sent to emergency services, not yet confirmed.`;
    // RULE: ONLY CONFIRMED contacts receive alerts! PENDING, DECLINED, LEFT, EXPIRED, MUTED are NOT alerted!
    for (const c of d.emContacts.filter((x) => x.ownerId === u.id && x.status === "CONFIRMED" && x.notifyOnSos)) {
      smsProvider.sendSms(c.phone, text);
      if (c.linkedUserId) {
        notify({
          userId: c.linkedUserId,
          type: "EM_SOS_CONTACT",
          incidentId: inc.id,
          message: msg(`${u.fullName} បានចុច SOS (${meta.label.km})`, `${u.fullName} pressed SOS (${meta.label.en})`),
        });
        notifiedInApp.push(c.name);
      } else {
        smsLinks.push({ name: c.name, phone: c.phone, href: `sms:${c.phone}?body=${encodeURIComponent(text)}` });
      }
    }
  }
  save();
  return delay({ incident: forReporter(inc), hotline: meta.hotline, notifiedInApp, smsLinks });
}

export async function createIncident(input: EmCreateIncidentInput): Promise<EmIncidentForReporter> {
  const u = requireUser();
  validateLocation(input);
  if (!EM_INCIDENT_TYPES.some((x) => x.id === input.type)) throw new ApiError("VALIDATION", "Choose a type", "type");
  if (input.occurredAt && input.occurredAt > now()) throw new ApiError("VALIDATION", "Time can't be in the future", "occurredAt");

  const d = load();
  const today = d.emIncidents.filter(
    (x) => (x.submittedByUserId === u.id || x.reporterId === u.id) && x.kind === "REPORT" && x.createdAt > since(86_400_000),
  );
  if (today.length >= EM_RULES.reportsPerDay) throw new ApiError("LIMIT", "Too many reports today");

  const isGpsConfirmed =
    input.locationSource === "GPS" &&
    input.locationConfirmed !== false &&
    input.locationStatus !== "UNCONFIRMED" &&
    input.locationStatus !== "NOT_SHARED";
  const locationConfirmed = isGpsConfirmed;
  const locationStatus = locationConfirmed ? "CONFIRMED" : "UNCONFIRMED";

  const city = findCity(input.cityId);
  const loc = input.location ?? (city ? { lat: 11.5564, lng: 104.9282 } : { lat: 11.5564, lng: 104.9282 });

  // Duplicate detection rule: same category within ~150 m and 15 minutes
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const duplicateCandidate = d.emIncidents.find(
    (x) =>
      x.type === input.type &&
      x.createdAt >= fifteenMinsAgo &&
      x.location &&
      loc &&
      distanceKm(x.location, loc) <= 0.15,
  );
  const isPossibleDuplicate = !!duplicateCandidate;

  const consents = {
    shareWithOrganizations: input.consents?.shareWithOrganizations ?? true,
    allowCallback: input.consents?.allowCallback ?? (input.consent?.shareContactWithResponders ?? false),
    shareWithMedia: input.consents?.shareWithMedia ?? (input.consent?.shareWithNews ?? false),
    anonymous: input.consents?.anonymous ?? false,
  };

  // Rule: Missing-person reports are sensitive: restricted to authorized staff
  // and never eligible for public feed or media sharing without admin approval.
  if (input.type === "MISSING_PERSON") {
    consents.shareWithMedia = false;
  }

  const meta = typeMeta(input.type);
  const suggestedSeverity = input.suggestedSeverity || input.severity || meta.defaultSeverity;
  const description = input.description?.trim() || meta.label.en;

  const inc = newIncident(u, {
    kind: "REPORT",
    type: input.type,
    severity: meta.defaultSeverity === "CRITICAL" ? "HIGH" : meta.defaultSeverity,
    suggestedSeverity,
    description,
    photoUrls: input.photoUrls ?? [],
    location: loc,
    locationSource: input.locationSource || (locationConfirmed ? "GPS" : "TEXT"),
    locationConfirmed,
    locationStatus,
    landmark: input.landmark?.trim(),
    accuracyM: locationConfirmed ? input.accuracyM : undefined,
    addressHint: input.addressHint?.trim() || undefined,
    provinceId: input.provinceId,
    cityId: input.cityId,
    occurredAt: input.occurredAt ?? now(),
    peopleAffected: input.peopleAffected,
    numInjured: input.numInjured,
    consent: {
      shareContactWithResponders: consents.allowCallback && !consents.anonymous,
      shareWithNews: consents.shareWithMedia,
    },
    consents,
    sensitiveMedia: input.type === "MISSING_PERSON" ? true : (input.sensitiveMedia ?? true),
    isPossibleDuplicate,
    possibleDuplicateOf: duplicateCandidate ? duplicateCandidate.code || duplicateCandidate.id : undefined,
    flaggedForReview: !locationConfirmed || isPossibleDuplicate,
    flaggedReason: isPossibleDuplicate
      ? `Possible duplicate: matches ${duplicateCandidate?.code || duplicateCandidate?.id} within 150m and 15 mins`
      : !locationConfirmed
      ? "Location not confirmed: GPS was denied or unavailable"
      : undefined,
  });

  if (isPossibleDuplicate && duplicateCandidate) {
    recordAudit(u, "FLAG_POSSIBLE_DUPLICATE", "INCIDENT", inc.id, {
      duplicateOf: duplicateCandidate.id,
      distanceKm: distanceKm(duplicateCandidate.location, loc),
    });
  }

  const rejected = d.emIncidents.filter(
    (x) => (x.submittedByUserId === u.id || x.reporterId === u.id) && x.status === "REJECTED" && x.updatedAt > since(30 * 86_400_000),
  ).length;
  if (rejected < EM_RULES.rejectionsBeforeReview) {
    if (consents.shareWithOrganizations) {
      for (const org of routeOrganizations(inc.type, inc)) dispatchTo(inc, org, "SYSTEM");
    }
  } else {
    inc.history.push({ status: "SUBMITTED", by: "SYSTEM", note: "Held for admin review", at: now() });
  }
  save();
  return delay(forReporter(inc));
}

/** Owner adds details or photos later (Core feature 4, Step 4) */
export async function addIncidentDetails(
  id: string,
  input: { text?: string; photoUrls?: string[] },
): Promise<EmIncidentForReporter> {
  const u = requireUser();
  const inc = getIncidentOr404(id);
  if (inc.submittedByUserId !== u.id && inc.reporterId !== u.id && u.role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "Not your report");
  }
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Already closed");
  const t = now();
  if (input.text?.trim()) {
    inc.description = `${inc.description}\n\n[Update ${t.slice(11, 16)}]: ${input.text.trim()}`;
  }
  if (input.photoUrls && input.photoUrls.length > 0) {
    inc.photoUrls = [...(inc.photoUrls || []), ...input.photoUrls];
  }
  if (!inc.additionalDetails) inc.additionalDetails = [];
  inc.additionalDetails.push({
    text: input.text?.trim(),
    photoUrls: input.photoUrls,
    addedAt: t,
    addedBy: u.id,
  });
  inc.updatedAt = t;
  recordStatusHistory(inc.id, u, inc.status, inc.status, `Added details: ${input.text?.trim() || "photos"}`);
  recordAudit(u, "ADD_INCIDENT_DETAILS", "INCIDENT", inc.id, {
    textLength: input.text?.length,
    photosCount: input.photoUrls?.length,
  });
  save();
  return delay(forReporter(inc));
}

/** Dev-only Simulator: Move a dispatch forward to test tracking UI before Step 5 */
export async function devSimulateDispatch(
  incidentId: string,
  status: Exclude<EmDispatchStatus, "SENT">,
  opts: { organizationId?: string; note?: string; responseInfo?: string } = {},
): Promise<EmIncidentForReporter> {
  const inc = getIncidentOr404(incidentId);
  const dispatches = load().emDispatches.filter((x) => x.incidentId === inc.id);
  const dp = opts.organizationId ? dispatches.find((x) => x.organizationId === opts.organizationId) : dispatches[0];
  if (!dp) throw new ApiError("NOT_FOUND", "Dispatch not found");
  dp.status = status;
  dp.note = opts.note?.trim() || dp.note;
  dp.responseInfo =
    opts.responseInfo?.trim() ||
    (status === "RESPONDING" ? "En route to location, ETA 8 min" : dp.responseInfo);
  dp.updatedAt = now();
  if (status !== "DECLINED") {
    recomputeStatus(inc, "DEV_SIMULATOR", dp.organizationId, dp.responseInfo || dp.note);
  }
  save();
  return delay(forReporter(inc));
}

/** Dev-only Simulator: Reject an incident with reason to test Rejected UI */
export async function devSimulateReject(incidentId: string, reason: string): Promise<EmIncidentForReporter> {
  const inc = getIncidentOr404(incidentId);
  if (!reason?.trim()) throw new ApiError("VALIDATION", "Rejection reason is required", "reason");
  inc.status = "REJECTED";
  inc.rejectReason = reason.trim();
  inc.updatedAt = now();
  recordStatusHistory(
    inc.id,
    { id: "dev-admin", role: "ADMIN" },
    inc.status,
    "REJECTED",
    reason.trim(),
  );

  // Notify reporter of rejection with reason
  const reporterUserId = inc.submittedByUserId || inc.reporterId;
  if (reporterUserId) {
    notify({
      userId: reporterUserId,
      type: "EM_STATUS",
      incidentId: inc.id,
      message: msg(`របាយការណ៍ត្រូវបានបដិសេធ៖ ${reason.trim()}`, `Report was rejected: ${reason.trim()}`),
    });
  }

  save();
  return delay(forReporter(inc));
}

/** Reporter cancels (false alarm / safe now). Organizations are told. Requires a reason. */
export async function cancelIncident(id: string, reason: string): Promise<EmIncidentForReporter> {
  const u = requireUser();
  const inc = getIncidentOr404(id);
  if (inc.submittedByUserId !== u.id && inc.reporterId !== u.id && u.role !== "ADMIN")
    throw new ApiError("FORBIDDEN", "Not your report");
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Already closed");
  if (!reason?.trim()) throw new ApiError("VALIDATION", "Tell responders why", "reason");
  inc.cancelReason = reason.trim();
  setStatus(inc, "CANCELLED", u.id, { note: inc.cancelReason });
  for (const dp of load().emDispatches.filter((x) => x.incidentId === inc.id)) {
    for (const staff of staffOf(dp.organizationId)) {
      notify({ userId: staff.id, type: "EM_STATUS", incidentId: inc.id, message: msg("អ្នករាយការណ៍បានបោះបង់", "Reporter cancelled") });
    }
  }

  // Notify confirmed contacts who were alerted (Fix 5)
  const confirmed = load().emContacts.filter((c) => c.ownerId === u.id && c.status === "CONFIRMED");
  for (const c of confirmed) {
    smsProvider.sendSms(c.phone, `CANCEL UPDATE: ${u.fullName} cancelled their emergency report.`);
    if (c.linkedUserId) {
      notify({
        userId: c.linkedUserId,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg(`${u.fullName} បានបោះបង់របាយការណ៍សង្គ្រោះ`, `${u.fullName} cancelled the emergency report`),
      });
    }
  }

  save();
  return delay(forReporter(inc));
}

/**
 * Accidental SOS cancellation (sent by mistake).
 * Does NOT require a reason!
 */
export async function cancelSosAccidental(id: string): Promise<EmIncidentForReporter> {
  const u = requireUser();
  const inc = getIncidentOr404(id);
  if (inc.submittedByUserId !== u.id && inc.reporterId !== u.id && u.role !== "ADMIN")
    throw new ApiError("FORBIDDEN", "Not your report");
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Already closed");
  inc.cancelReason = "Sent by mistake (accidental)";
  setStatus(inc, "CANCELLED", u.id, { note: "Sent by mistake (accidental)" });
  
  // Notify dispatched organizations
  for (const dp of load().emDispatches.filter((x) => x.incidentId === inc.id)) {
    for (const staff of staffOf(dp.organizationId)) {
      notify({
        userId: staff.id,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg("អ្នករាយការណ៍បានបោះបង់ (ចុចច្រឡំ)", "Reporter cancelled (accidental mistake)"),
      });
    }
  }

  // Notify confirmed contacts who were alerted
  const confirmed = load().emContacts.filter((c) => c.ownerId === u.id && c.status === "CONFIRMED");
  for (const c of confirmed) {
    smsProvider.sendSms(c.phone, `SOS CANCELLED by ${u.fullName} (sent by mistake).`);
    if (c.linkedUserId) {
      notify({
        userId: c.linkedUserId,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg(`${u.fullName} បានបោះបង់ការហៅ SOS (ចុចច្រឡំ)`, `${u.fullName} cancelled the SOS (sent by mistake)`),
      });
    }
  }

  recordAudit(u, "CANCEL_SOS_ACCIDENTAL", "INCIDENT", inc.id);
  save();
  return delay(forReporter(inc));
}

/**
 * Reporter signals they are safe now and resolves the active SOS.
 */
export async function closeSosSafe(id: string, note?: string): Promise<EmIncidentForReporter> {
  const u = requireUser();
  const inc = getIncidentOr404(id);
  if (inc.submittedByUserId !== u.id && inc.reporterId !== u.id && u.role !== "ADMIN")
    throw new ApiError("FORBIDDEN", "Not your report");
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Already closed");
  const safeNote = note?.trim() || "User indicated they are safe";
  inc.closedByUser = true;
  setStatus(inc, "CLOSED_BY_USER", u.id, { note: `closed-by-user: ${safeNote}` });
  recordStatusHistory(inc.id, u, inc.status, "CLOSED_BY_USER", `closed-by-user: ${safeNote}`);

  // Notify dispatched organizations without auto-resolving their dispatches!
  // Organizations still resolve their dispatches independently.
  for (const dp of load().emDispatches.filter((x) => x.incidentId === inc.id)) {
    for (const staff of staffOf(dp.organizationId)) {
      notify({
        userId: staff.id,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg("អ្នករាយការណ៍មានសុវត្ថិភាពហើយ (CLOSED_BY_USER)", "Reporter is safe (CLOSED_BY_USER)"),
      });
    }
  }

  // Notify confirmed contacts who were alerted (Fix 5)
  const confirmed = load().emContacts.filter((c) => c.ownerId === u.id && c.status === "CONFIRMED");
  for (const c of confirmed) {
    smsProvider.sendSms(c.phone, `SAFE UPDATE: ${u.fullName} is safe. Emergency SOS closed.`);
    if (c.linkedUserId) {
      notify({
        userId: c.linkedUserId,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg(`${u.fullName} មានសុវត្ថិភាពហើយ (បានបិទ SOS)`, `${u.fullName} is safe now (SOS closed)`),
      });
    }
  }

  recordAudit(u, "CLOSE_SOS_SAFE", "INCIDENT", inc.id, { note: safeNote });
  save();
  return delay(forReporter(inc));
}

export async function myIncidents(): Promise<EmIncidentForReporter[]> {
  const u = requireUser();
  return delay(
    load()
      .emIncidents.filter((x) => x.submittedByUserId === u.id || x.reporterId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(forReporter),
  );
}

export async function getMyIncident(id: string): Promise<EmIncidentForReporter> {
  const u = requireUser();
  const inc = getIncidentOr404(id);
  if (inc.submittedByUserId !== u.id && inc.reporterId !== u.id && u.role !== "ADMIN")
    throw new ApiError("FORBIDDEN", "Not your report");
  return delay(forReporter(inc));
}

// =====================================================================
// Organization (Core feature 6 + status updates)
// =====================================================================

function requireOrgUser(targetOrgId?: string) {
  const u = requireUser(["ORGANIZATION", "ADMIN"]);
  if (u.role === "ADMIN") {
    return { ...u, organizationId: targetOrgId || u.organizationId || "org-police-pp" };
  }
  if (!u.organizationId) throw new ApiError("FORBIDDEN", "No organization assigned to account");
  if (targetOrgId && u.organizationId !== targetOrgId) {
    throw new ApiError("FORBIDDEN", "You do not belong to this organization");
  }
  return u;
}

/** Open dispatches first (most severe, oldest), then closed ones. */
export async function orgInbox(opts: { organizationId?: string; includeClosed?: boolean } = {}): Promise<EmIncidentForOrg[]> {
  const u = requireOrgUser(opts.organizationId);
  const d = load();
  const sev = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  const rows = d.emDispatches
    .filter((x) => x.organizationId === u.organizationId)
    .map((x) => ({ dp: x, inc: d.emIncidents.find((i) => i.id === x.incidentId)! }))
    .filter(({ dp, inc }) => opts.includeClosed || ((!CLOSED.includes(inc.status) || inc.status === "CLOSED_BY_USER") && dp.status !== "RESOLVED" && dp.status !== "DECLINED" && dp.status !== "CANNOT_CONTINUE"))
    .sort((a, b) => sev[a.inc.severity] - sev[b.inc.severity] || a.inc.createdAt.localeCompare(b.inc.createdAt));
  return delay(rows.map(({ dp, inc }) => forOrg(inc, dp)));
}

/** Opening an incident confirms receipt (SENT -> RECEIVED), writes to status history and audit log. */
export async function getOrgIncident(incidentId: string, orgId?: string): Promise<EmIncidentForOrg> {
  const u = requireOrgUser(orgId);
  const inc = getIncidentOr404(incidentId);
  const dp = load().emDispatches.find((x) => x.incidentId === inc.id && x.organizationId === u.organizationId);
  if (!dp) throw new ApiError("FORBIDDEN", "Not sent to your organization");
  if (dp.status === "SENT" && (!CLOSED.includes(inc.status) || inc.status === "CLOSED_BY_USER")) {
    dp.status = "RECEIVED";
    dp.updatedAt = now();
    recordStatusHistory(inc.id, u.id, inc.status, inc.status, `Dispatch marked RECEIVED upon opening by ${u.fullName}`, dp.organizationId);
    recordAudit(u, "OPEN_DISPATCH_RECEIVED", "DISPATCH", dp.id, { incidentId: inc.id, organizationId: dp.organizationId });
    recomputeStatus(inc, u.id, dp.organizationId);
    save();
  }
  return delay(forOrg(inc, dp));
}

/** Organization moves its dispatch forward, or declines it (reason required) with audit and history. */
export async function updateDispatch(
  incidentId: string,
  status: Exclude<EmDispatchStatus, "SENT">,
  opts: { note?: string; responseInfo?: string; organizationId?: string } = {},
): Promise<EmIncidentForOrg> {
  const u = requireOrgUser(opts.organizationId);
  const inc = getIncidentOr404(incidentId);
  const dp = load().emDispatches.find((x) => x.incidentId === inc.id && x.organizationId === u.organizationId);
  if (!dp) throw new ApiError("FORBIDDEN", "Not sent to your organization");
  if (CLOSED.includes(inc.status) && inc.status !== "CLOSED_BY_USER") throw new ApiError("CONFLICT", "Incident is closed");
  if (dp.status === "DECLINED" || dp.status === "RESOLVED" || dp.status === "CANNOT_CONTINUE")
    throw new ApiError("CONFLICT", "Already closed for your organization");

  if (status === "DECLINED") {
    if (!opts.note?.trim()) throw new ApiError("VALIDATION", "A reason is required to decline a dispatch", "note");
    if (dp.status === "RESPONDING") throw new ApiError("CONFLICT", "Cannot decline dispatch while responding");
  } else if (status === "CANNOT_CONTINUE") {
    if (!opts.note?.trim()) throw new ApiError("VALIDATION", "A reason is required when responders cannot continue", "note");
    if (dp.status !== "RESPONDING" && dp.status !== "ACKNOWLEDGED") {
      throw new ApiError("CONFLICT", "Can only mark cannot continue when responding or acknowledged");
    }
  } else if (DISPATCH_PROGRESS.indexOf(status) <= DISPATCH_PROGRESS.indexOf(dp.status)) {
    throw new ApiError("CONFLICT", "Status can only move forward");
  }
  const prevStatus = dp.status;
  dp.status = status;
  dp.note = opts.note?.trim() || dp.note;
  dp.responseInfo = opts.responseInfo?.trim() || dp.responseInfo;
  dp.updatedAt = now();

  recordStatusHistory(inc.id, u.id, inc.status, inc.status, opts.responseInfo || opts.note || `Dispatch status changed to ${status}`, dp.organizationId);
  recordAudit(u, "UPDATE_DISPATCH_STATUS", "DISPATCH", dp.id, { from: prevStatus, to: status, note: opts.note, responseInfo: opts.responseInfo });

  const org = orgById(dp.organizationId);
  const reporterUserId = inc.submittedByUserId || inc.reporterId;

  if (status === "CANNOT_CONTINUE") {
    for (const admin of load().users.filter((x) => x.role === "ADMIN")) {
      notify({
        userId: admin.id,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg(
          `ស្ថាប័ន ${org?.name.km || dp.organizationId} មិនអាចបន្តប្រតិបត្តិការបាន៖ ${dp.note}`,
          `Organization ${org?.name.en || dp.organizationId} cannot continue dispatch: ${dp.note}`
        ),
      });
    }
    if (reporterUserId) {
      notify({
        userId: reporterUserId,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg(
          `ក្រុមសង្គ្រោះមិនអាចបន្តបាន៖ ${dp.note}។ សូមទូរស័ព្ទទៅ ១១៧/១១៨/១១៩ ដោយផ្ទាល់!`,
          `Responders cannot continue: ${dp.note}. Please call 117/118/119 directly!`
        ),
      });
    }
    recomputeStatus(inc, u.id, dp.organizationId, opts.note);
  } else if (status === "ACKNOWLEDGED") {
    if (reporterUserId) {
      notify({
        userId: reporterUserId,
        type: "EM_STATUS",
        incidentId: inc.id,
        message: msg(
          `ស្ថាប័ន ${org?.name.km || dp.organizationId} បានទទួលស្គាល់ការបញ្ជូនហើយ`,
          `Dispatch acknowledged by ${org?.name.en || dp.organizationId}`
        ),
      });
    }
    recomputeStatus(inc, u.id, dp.organizationId, opts.responseInfo || opts.note);
  } else if (status !== "DECLINED") {
    recomputeStatus(inc, u.id, dp.organizationId, opts.responseInfo || opts.note);
  } else {
    recomputeStatus(inc, u.id, dp.organizationId, opts.note);
  }
  save();
  return delay(forOrg(inc, dp));
}

/** 10-second undo window for responders who accidentally marked RESPONDING. Reverts dispatch back to ACKNOWLEDGED. */
export async function undoResponding(incidentId: string, orgId?: string): Promise<EmIncidentForOrg> {
  const u = requireOrgUser(orgId);
  const inc = getIncidentOr404(incidentId);
  const dp = load().emDispatches.find((x) => x.incidentId === inc.id && x.organizationId === u.organizationId);
  if (!dp) throw new ApiError("FORBIDDEN", "Not sent to your organization");
  if (dp.status !== "RESPONDING") throw new ApiError("CONFLICT", "Can only undo from RESPONDING");

  dp.status = "ACKNOWLEDGED";
  dp.responseInfo = undefined;
  dp.updatedAt = now();

  const ds = load().emDispatches.filter((x) => x.incidentId === inc.id);
  const derived = deriveIncidentStatus(ds);
  setStatus(inc, derived, u.id, { organizationId: dp.organizationId, note: "Responders undid RESPONDING (within 10s undo window)" });

  recordAudit(u, "UNDO_RESPONDING", "DISPATCH", dp.id, { incidentId: inc.id });
  save();
  return delay(forOrg(inc, dp));
}

/** Staff or Admin sets the authoritative severity of an incident. */
export async function setAuthoritativeSeverity(
  incidentId: string,
  severity: EmSeverity,
  organizationId?: string,
): Promise<EmIncidentForOrg> {
  const u = requireOrgUser(organizationId);
  const inc = getIncidentOr404(incidentId);
  const dp = load().emDispatches.find((x) => x.incidentId === inc.id && x.organizationId === u.organizationId);
  if (!dp && u.role !== "ADMIN") throw new ApiError("FORBIDDEN", "Not sent to your organization");
  if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
    throw new ApiError("VALIDATION", "Invalid severity value", "severity");
  }
  const prev = inc.severity;
  inc.severity = severity;
  inc.updatedAt = now();
  recordStatusHistory(inc.id, u.id, inc.status, inc.status, `Authoritative severity set to ${severity} by ${u.fullName} (was ${prev})`, dp?.organizationId);
  recordAudit(u, "SET_SEVERITY", "INCIDENT", inc.id, { from: prev, to: severity, organizationId: dp?.organizationId });
  save();
  return delay(forOrg(inc, dp || load().emDispatches.find((x) => x.incidentId === inc.id)!));
}

// =====================================================================
// Admin (verification, routing fixes, alerts, news)
// =====================================================================

export async function adminListIncidents(filter: EmIncidentFilter = {}): Promise<EmIncidentForReporter[]> {
  requireUser(["ADMIN"]);
  const rows = load().emIncidents.filter(
    (x) =>
      (!filter.status?.length || filter.status.includes(x.status)) &&
      (!filter.type?.length || filter.type.includes(x.type)) &&
      (!filter.provinceId || x.provinceId === filter.provinceId) &&
      (!filter.cityId || x.cityId === filter.cityId) &&
      (!filter.kind || x.kind === filter.kind) &&
      (filter.verified === undefined || x.verified === filter.verified),
  );
  return delay(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(forReporter));
}

export async function verifyIncident(id: string, verified = true): Promise<EmIncidentForReporter> {
  const u = requireUser(["ADMIN"]);
  const inc = getIncidentOr404(id);
  inc.verified = verified;
  inc.verifiedBy = verified ? u.id : undefined;
  inc.updatedAt = now();
  if (verified)
    notify({
      userId: inc.submittedByUserId || inc.reporterId,
      type: "EM_VERIFIED",
      incidentId: inc.id,
      message: msg("របាយការណ៍របស់អ្នកត្រូវបានផ្ទៀងផ្ទាត់", "Your report was verified"),
    });
  save();
  return delay(forReporter(inc));
}

/** Admin sends an incident to another organization (e.g. after a decline, or a held report). */
export async function assignOrganization(incidentId: string, organizationId: string): Promise<EmIncidentForReporter> {
  const u = requireUser(["ADMIN"]);
  const inc = getIncidentOr404(incidentId);
  const org = orgById(organizationId);
  if (!org || org.type === "NEWS") throw new ApiError("NOT_FOUND", "Organization not found");
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Incident is closed");
  if (
    load().emDispatches.some(
      (x) => x.incidentId === inc.id && x.organizationId === organizationId && x.status !== "DECLINED",
    )
  )
    throw new ApiError("CONFLICT", "Already sent to this organization");
  dispatchTo(inc, org, u.id);
  save();
  return delay(forReporter(inc));
}

export async function rejectIncident(id: string, reason: string): Promise<EmIncidentForReporter> {
  const u = requireUser(["ADMIN"]);
  const inc = getIncidentOr404(id);
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Already closed");
  if (!reason?.trim()) throw new ApiError("VALIDATION", "A reason is required", "reason");
  inc.rejectReason = reason.trim();
  setStatus(inc, "REJECTED", u.id, { note: inc.rejectReason });
  const reporterUserId = inc.submittedByUserId || inc.reporterId;
  if (reporterUserId) {
    notify({
      userId: reporterUserId,
      type: "EM_STATUS",
      incidentId: inc.id,
      message: msg(`របាយការណ៍ត្រូវបានបដិសេធ៖ ${inc.rejectReason}`, `Report was rejected: ${inc.rejectReason}`),
    });
  }
  save();
  return delay(forReporter(inc));
}

export async function markDuplicate(id: string, originalId: string): Promise<EmIncidentForReporter> {
  const u = requireUser(["ADMIN"]);
  const inc = getIncidentOr404(id);
  const orig = getIncidentOr404(originalId);
  if (id === originalId || orig.status === "DUPLICATE") throw new ApiError("VALIDATION", "Pick the original report", "originalId");
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Already closed");
  inc.duplicateOf = originalId;
  setStatus(inc, "DUPLICATE", u.id, { note: `Same as ${originalId}` });
  const reporterUserId = inc.submittedByUserId || inc.reporterId;
  if (reporterUserId) {
    notify({
      userId: reporterUserId,
      type: "EM_STATUS",
      incidentId: inc.id,
      message: msg(`របាយការណ៍ត្រូវបានបញ្ចូលជាហេតុការណ៍ស្ទួននឹង ${orig.code}`, `Report marked as duplicate of ${orig.code}`),
    });
  }
  save();
  return delay(forReporter(inc));
}

/**
 * Core feature 9: publish a public alert about a VERIFIED incident.
 * Uses the shared Community & Services announcements (one alert system).
 * The alert text is written by the admin: never copy the reporter's description.
 */
export async function publishAlert(
  incidentId: string,
  input: Omit<CsCreateAnnouncementInput, "incidentId" | "level"> & { level?: "WARNING" | "ALERT" },
) {
  requireUser(["ADMIN"]);
  const inc = getIncidentOr404(incidentId);
  if (!inc.verified) throw new ApiError("CONFLICT", "Verify the incident first");

  // Redaction checks (Fix 7):
  // 1. Sensitive media cannot be published in public alerts
  if (inc.sensitiveMedia && input.imageUrl) {
    throw new ApiError("FORBIDDEN", "Sensitive media cannot be attached to public alerts");
  }

  // 2. Personal info redaction check: Ensure no personal phone numbers or reporter names in public text
  const alertText = `${input.title?.en || ""} ${input.title?.km || ""} ${input.body?.en || ""} ${input.body?.km || ""}`;
  if (/(?:\+855|0)[1-9]\d{7,8}/.test(alertText)) {
    throw new ApiError("VALIDATION", "Public alerts must not contain personal phone numbers", "body");
  }
  const reporter = findUser(inc.submittedByUserId || inc.reporterId);
  if (reporter?.fullName && alertText.includes(reporter.fullName)) {
    throw new ApiError("VALIDATION", "Public alerts must not contain reporter names", "body");
  }

  // 3. Fuzz coordinates: Round coordinates to ~100m (3 decimal places, e.g. ~111m precision).
  // For crime, violence, or missing person, coordinates must be omitted completely (city/province scope only).
  let redactedLocation: LatLng | undefined = undefined;
  if (inc.location && !["CRIME", "DOMESTIC_VIOLENCE", "MISSING_PERSON"].includes(inc.type)) {
    redactedLocation = {
      lat: Math.round(inc.location.lat * 1000) / 1000,
      lng: Math.round(inc.location.lng * 1000) / 1000,
    };
  }

  let redactedScope: CsScope = { ...input.scope };
  if (["CRIME", "DOMESTIC_VIOLENCE", "MISSING_PERSON"].includes(inc.type)) {
    redactedScope = {
      level: input.scope?.cityId ? "CITY" : "PROVINCE",
      provinceId: inc.provinceId,
      cityId: inc.cityId,
    };
  }

  const a = await createAnnouncement({
    ...input,
    location: redactedLocation,
    scope: redactedScope,
    level: input.level ?? "ALERT",
    incidentId: inc.id,
  });
  inc.alertAnnouncementId = a.id;
  inc.updatedAt = now();
  save();
  return a;
}

/**
 * News privacy rule: only for verified incidents where the reporter consented.
 * The admin writes the public text and picks safe photos.
 */
export async function createNewsRelease(
  incidentId: string,
  input: { title: I18nText; summary: I18nText; approvedPhotoUrls?: string[] },
): Promise<EmNewsRelease> {
  const u = requireUser(["ADMIN"]);
  const inc = getIncidentOr404(incidentId);
  if (!inc.verified) throw new ApiError("CONFLICT", "Verify the incident first");
  if (!inc.consent.shareWithNews) throw new ApiError("FORBIDDEN", "The reporter did not consent to news sharing");
  if (!input.title?.en?.trim() && !input.title?.km?.trim()) throw new ApiError("VALIDATION", "Title is required", "title");
  const bad = (input.approvedPhotoUrls ?? []).filter((p) => !inc.photoUrls.includes(p));
  if (bad.length) throw new ApiError("VALIDATION", "Photos must come from the incident", "approvedPhotoUrls");

  const nr: EmNewsRelease = {
    id: nextId("nr"),
    incidentId: inc.id,
    title: input.title,
    summary: input.summary,
    type: inc.type,
    approxLocation: round(inc.location),
    provinceId: inc.provinceId,
    cityId: inc.cityId,
    approvedPhotoUrls: input.approvedPhotoUrls ?? [],
    approvedBy: u.id,
    publishedAt: now(),
  };
  const d = load();
  d.emNews.unshift(nr);
  for (const r of d.users.filter((x) => x.role === "REPORTER")) {
    notify({ userId: r.id, type: "EM_NEWS_RELEASE", incidentId: inc.id, message: nr.title });
  }
  save();
  return delay(nr);
}

// =====================================================================
// News reporter and public
// =====================================================================

export async function listNewsReleases(): Promise<EmNewsRelease[]> {
  requireUser(["REPORTER", "ADMIN"]);
  return delay([...load().emNews].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
}

/** Verified incidents only, no people, location rounded to ~100 m. Missing persons excluded without admin approval. */
export async function listPublicIncidents(filter: { provinceId?: string; cityId?: string; includeClosed?: boolean } = {}) {
  return delay(
    load()
      .emIncidents.filter(
        (x) =>
          x.verified &&
          (filter.includeClosed || !CLOSED.includes(x.status)) &&
          (!filter.provinceId || x.provinceId === filter.provinceId) &&
          (!filter.cityId || x.cityId === filter.cityId) &&
          (x.type !== "MISSING_PERSON" || x.adminApprovedPublic === true),
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .map(toPublic),
  );
}
