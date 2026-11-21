// Emergency Response & Incident Reporting mock API (used as `api.em.*`).
// Spec: docs/features/emergency.md
//
// Directory  getHotlines, listIncidentTypes, listServices, nearbyServices, getService
// Contacts   listTrustedContacts, addTrustedContact, updateTrustedContact, removeTrustedContact
// Citizen    sendSos, createIncident, cancelIncident, myIncidents, getMyIncident
// Org        orgInbox, getOrgIncident, updateDispatch
// Admin      adminListIncidents, verifyIncident, assignOrganization, rejectIncident, markDuplicate,
//            publishAlert (-> Community & Services announcement), createNewsRelease
// Reporter   listNewsReleases
// Public     listPublicIncidents
//
// Routing: each incident type routes to organization types (EM_INCIDENT_TYPES.routesTo).
// For each type the system picks the nearest organization in the same province
// that covers the city; if none, the nearest anywhere. Delivery is IN_APP only.

import type {
  CsCreateAnnouncementInput,
  EmCreateIncidentInput,
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
  EmSosInput,
  EmSosResult,
  EmTrustedContact,
  I18nText,
  LatLng,
  UserRecord,
} from "@/types";
import { EM_RULES } from "@/types";
import { EMERGENCY_HOTLINES } from "@/lib/mock/data";
import { EM_INCIDENT_TYPES, EM_ORGANIZATIONS } from "@/lib/mock/emergency";
import { distanceKm, findCity } from "@/lib/mock/locations";
import { createAnnouncement, isOpenAt } from "./community-api";
import {
  ApiError,
  currentUser,
  delay,
  findUser,
  load,
  nextId,
  normalizePhone,
  notify,
  now,
  requireUser,
  save,
} from "./mock-db";

// =====================================================================
// Helpers
// =====================================================================

const msg = (km: string, en: string): I18nText => ({ km, en });
const typeMeta = (t: EmIncidentType) => EM_INCIDENT_TYPES.find((x) => x.id === t)!;
const orgById = (id: string) => EM_ORGANIZATIONS.find((o) => o.id === id);
const round = (l: LatLng): LatLng => ({
  lat: +l.lat.toFixed(EM_RULES.publicLocationDecimals),
  lng: +l.lng.toFixed(EM_RULES.publicLocationDecimals),
});

/** Progress order. Terminal alternatives (REJECTED, CANCELLED, DUPLICATE) sit outside it. */
const PROGRESS: EmIncidentStatus[] = ["SUBMITTED", "RECEIVED", "UNDER_REVIEW", "ACKNOWLEDGED", "RESPONDING", "RESOLVED"];
const DISPATCH_PROGRESS: EmDispatchStatus[] = ["SENT", "RECEIVED", "UNDER_REVIEW", "ACKNOWLEDGED", "RESPONDING", "RESOLVED"];
const CLOSED: EmIncidentStatus[] = ["RESOLVED", "REJECTED", "CANCELLED", "DUPLICATE"];

const STATUS_TEXT: Record<EmIncidentStatus, I18nText> = {
  SUBMITTED: msg("បានដាក់ស្នើ (មិនទាន់មានការបញ្ជាក់)", "Submitted (not confirmed yet)"),
  RECEIVED: msg("ស្ថាប័នបានទទួល", "Received by the organization"),
  UNDER_REVIEW: msg("កំពុងពិនិត្យ", "Under review"),
  ACKNOWLEDGED: msg("ស្ថាប័នបានទទួលស្គាល់", "Acknowledged"),
  RESPONDING: msg("កំពុងឆ្លើយតប", "Responding"),
  RESOLVED: msg("បានដោះស្រាយ", "Resolved"),
  REJECTED: msg("ត្រូវបានបដិសេធ", "Rejected"),
  CANCELLED: msg("បានបោះបង់", "Cancelled"),
  DUPLICATE: msg("ស្ទួននឹងរបាយការណ៍ផ្សេង", "Duplicate of another report"),
};

function validateLocation(input: { location: LatLng; provinceId: string; cityId: string }) {
  const { lat, lng } = input.location ?? {};
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    throw new ApiError("VALIDATION", "Location is required", "location");
  if (findCity(input.cityId)?.provinceId !== input.provinceId) throw new ApiError("VALIDATION", "Choose a city", "cityId");
}

/** Pick one organization per routed type: nearest in-province covering org, else nearest anywhere. */
export function routeOrganizations(type: EmIncidentType, at: { location: LatLng; provinceId: string; cityId: string }): EmOrganization[] {
  const out: EmOrganization[] = [];
  for (const orgType of typeMeta(type).routesTo) {
    const candidates = EM_ORGANIZATIONS.filter((o) => o.type === orgType);
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
  const t = now();
  inc.status = status;
  inc.updatedAt = t;
  inc.history.push({ status, by, organizationId: opts.organizationId, note: opts.note, at: t });
  if (by !== inc.reporterId) {
    notify({
      userId: inc.reporterId,
      type: "EM_STATUS",
      incidentId: inc.id,
      message: opts.note
        ? msg(`${STATUS_TEXT[status].km}៖ ${opts.note}`, `${STATUS_TEXT[status].en}: ${opts.note}`)
        : STATUS_TEXT[status],
    });
  }
}

/** Incident status = furthest progress reached by any non-declined dispatch (never goes back). */
function recomputeStatus(inc: EmIncident, by: string, orgId?: string, note?: string) {
  if (CLOSED.includes(inc.status) && inc.status !== "RESOLVED") return;
  const ds = load().emDispatches.filter((x) => x.incidentId === inc.id && x.status !== "DECLINED");
  const best = Math.max(0, ...ds.map((x) => DISPATCH_PROGRESS.indexOf(x.status)));
  const next = PROGRESS[best];
  if (PROGRESS.indexOf(next) > PROGRESS.indexOf(inc.status)) setStatus(inc, next, by, { organizationId: orgId, note });
}

function forReporter(inc: EmIncident): EmIncidentForReporter {
  return {
    ...inc,
    dispatches: load()
      .emDispatches.filter((x) => x.incidentId === inc.id)
      .map((x) => {
        const org = orgById(x.organizationId)!;
        return { ...x, organizationName: org.name, organizationType: org.type };
      }),
  };
}

function forOrg(inc: EmIncident, dispatch: EmDispatch): EmIncidentForOrg {
   
  const { reporterId, ...rest } = inc;
  const reporter = findUser(reporterId);
  return {
    ...rest,
    dispatch,
    reporterContact:
      inc.consent.shareContactWithResponders && reporter ? { fullName: reporter.fullName, phone: reporter.phone } : undefined,
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

function getIncidentOr404(id: string) {
  const inc = load().emIncidents.find((x) => x.id === id);
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
  return {
    ...o,
    openNow: isOpenAt(o.hours),
    distanceKm: near ? Math.round(distanceKm(near, o.location) * 10) / 10 : undefined,
  };
}

/** Emergency services (police, hospitals, ambulance, fire, rescue). News orgs are not listed. */
export async function listServices(filter: EmServiceFilter = {}): Promise<EmServiceView[]> {
  const viewer = currentUser();
  const q = filter.q?.trim().toLowerCase();
  let rows = EM_ORGANIZATIONS.filter(
    (o) =>
      o.type !== "NEWS" &&
      (!filter.type?.length || filter.type.includes(o.type)) &&
      (!filter.provinceId || o.provinceId === filter.provinceId) &&
      (!filter.cityId || o.cityId === filter.cityId) &&
      (!q || `${o.name.km} ${o.name.en} ${o.address}`.toLowerCase().includes(q)),
  ).map((o) => serviceView(o, filter.near));
  if (filter.openNow) rows = rows.filter((o) => o.openNow);
  if (filter.near) {
    if (filter.radiusKm) rows = rows.filter((o) => o.distanceKm! <= filter.radiusKm!);
    rows.sort((a, b) => a.distanceKm! - b.distanceKm!);
  } else {
    const rank = (o: EmOrganization) => (viewer && o.provinceId === viewer.provinceId ? 0 : 1);
    rows.sort((a, b) => rank(a) - rank(b) || a.type.localeCompare(b.type));
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

// =====================================================================
// Trusted contacts (Core feature 3)
// =====================================================================

export async function listTrustedContacts(): Promise<EmTrustedContact[]> {
  const u = requireUser();
  return delay(load().emContacts.filter((c) => c.ownerId === u.id));
}

export async function addTrustedContact(input: { name: string; phone: string; relation?: string; notifyOnSos?: boolean }) {
  const u = requireUser();
  const d = load();
  const mine = d.emContacts.filter((c) => c.ownerId === u.id);
  if (mine.length >= EM_RULES.maxTrustedContacts)
    throw new ApiError("LIMIT", `Up to ${EM_RULES.maxTrustedContacts} trusted contacts`);
  if (!input.name?.trim()) throw new ApiError("VALIDATION", "Name is required", "name");
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) throw new ApiError("VALIDATION", "Invalid phone number", "phone");
  if (phone === u.phone) throw new ApiError("VALIDATION", "Use someone else's number", "phone");
  if (mine.some((c) => c.phone === phone)) throw new ApiError("CONFLICT", "Already in your contacts", "phone");
  const c: EmTrustedContact = {
    id: nextId("tc"),
    ownerId: u.id,
    name: input.name.trim(),
    phone,
    relation: input.relation?.trim() || undefined,
    linkedUserId: d.users.find((x) => x.phone === phone)?.id,
    notifyOnSos: input.notifyOnSos ?? true,
    createdAt: now(),
  };
  d.emContacts.push(c);
  save();
  return delay(c);
}

export async function updateTrustedContact(id: string, patch: { name?: string; relation?: string; notifyOnSos?: boolean }) {
  const u = requireUser();
  const c = load().emContacts.find((x) => x.id === id && x.ownerId === u.id);
  if (!c) throw new ApiError("NOT_FOUND", "Contact not found");
  if (patch.name !== undefined) c.name = patch.name.trim() || c.name;
  if (patch.relation !== undefined) c.relation = patch.relation.trim() || undefined;
  if (patch.notifyOnSos !== undefined) c.notifyOnSos = patch.notifyOnSos;
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

// =====================================================================
// Citizen: SOS and incident reports (Core features 1, 2, 4, 8)
// =====================================================================

function newIncident(u: UserRecord, base: Omit<EmIncident, "id" | "reporterId" | "status" | "history" | "verified" | "createdAt" | "updatedAt">) {
  const t = now();
  const inc: EmIncident = {
    ...base,
    id: nextId("em"),
    reporterId: u.id,
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
 * in-app request and alerts trusted contacts. Rate-limited per hour.
 */
export async function sendSos(input: EmSosInput): Promise<EmSosResult> {
  const u = requireUser();
  validateLocation(input);
  const meta = typeMeta(input.type);
  if (!meta) throw new ApiError("VALIDATION", "Choose an emergency type", "type");
  const d = load();
  const recent = d.emIncidents.filter((x) => x.reporterId === u.id && x.kind === "SOS" && x.createdAt > since(3_600_000));
  if (recent.length >= EM_RULES.sosPerHour) throw new ApiError("LIMIT", `Call ${meta.hotline} directly`);

  const inc = newIncident(u, {
    kind: "SOS",
    type: input.type,
    severity: "CRITICAL",
    description: input.note?.trim() || "SOS",
    photoUrls: [],
    location: input.location,
    locationSource: input.locationSource,
    accuracyM: input.accuracyM,
    provinceId: input.provinceId,
    cityId: input.cityId,
    occurredAt: now(),
    consent: { shareContactWithResponders: input.shareContactWithResponders ?? true, shareWithNews: false },
  });
  for (const org of routeOrganizations(inc.type, inc)) dispatchTo(inc, org, "SYSTEM");

  const notifiedInApp: string[] = [];
  const smsLinks: EmSosResult["smsLinks"] = [];
  if (input.notifyTrustedContacts ?? true) {
    const where = `https://maps.google.com/?q=${inc.location.lat},${inc.location.lng}`;
    const text = `SOS (${meta.label.en}) from ${u.fullName}. Location: ${where}`;
    for (const c of d.emContacts.filter((x) => x.ownerId === u.id && x.notifyOnSos)) {
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
  if (!input.description || input.description.trim().length < 5)
    throw new ApiError("VALIDATION", "Describe what happened", "description");
  if (input.occurredAt && input.occurredAt > now()) throw new ApiError("VALIDATION", "Time can't be in the future", "occurredAt");

  const d = load();
  const today = d.emIncidents.filter((x) => x.reporterId === u.id && x.kind === "REPORT" && x.createdAt > since(86_400_000));
  if (today.length >= EM_RULES.reportsPerDay) throw new ApiError("LIMIT", "Too many reports today");

  const inc = newIncident(u, {
    kind: "REPORT",
    type: input.type,
    severity: input.severity ?? typeMeta(input.type).defaultSeverity,
    description: input.description.trim(),
    photoUrls: input.photoUrls ?? [],
    location: input.location,
    locationSource: input.locationSource,
    accuracyM: input.accuracyM,
    addressHint: input.addressHint?.trim() || undefined,
    provinceId: input.provinceId,
    cityId: input.cityId,
    occurredAt: input.occurredAt ?? now(),
    peopleAffected: input.peopleAffected,
    consent: {
      shareContactWithResponders: input.consent?.shareContactWithResponders ?? false,
      shareWithNews: input.consent?.shareWithNews ?? false,
    },
  });

  // Core feature 10: users with several recent rejected reports go to admin review first.
  const rejected = d.emIncidents.filter(
    (x) => x.reporterId === u.id && x.status === "REJECTED" && x.updatedAt > since(30 * 86_400_000),
  ).length;
  if (rejected < EM_RULES.rejectionsBeforeReview) {
    for (const org of routeOrganizations(inc.type, inc)) dispatchTo(inc, org, "SYSTEM");
  } else {
    inc.history.push({ status: "SUBMITTED", by: "SYSTEM", note: "Held for admin review", at: now() });
  }
  save();
  return delay(forReporter(inc));
}

/** Reporter cancels (false alarm / safe now). Organizations are told. */
export async function cancelIncident(id: string, reason: string): Promise<EmIncidentForReporter> {
  const u = requireUser();
  const inc = getIncidentOr404(id);
  if (inc.reporterId !== u.id) throw new ApiError("FORBIDDEN", "Not your report");
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Already closed");
  if (!reason?.trim()) throw new ApiError("VALIDATION", "Tell responders why", "reason");
  inc.cancelReason = reason.trim();
  setStatus(inc, "CANCELLED", u.id, { note: inc.cancelReason });
  for (const dp of load().emDispatches.filter((x) => x.incidentId === id)) {
    for (const staff of staffOf(dp.organizationId)) {
      notify({ userId: staff.id, type: "EM_STATUS", incidentId: id, message: msg("អ្នករាយការណ៍បានបោះបង់", "Reporter cancelled") });
    }
  }
  save();
  return delay(forReporter(inc));
}

export async function myIncidents(): Promise<EmIncidentForReporter[]> {
  const u = requireUser();
  return delay(
    load()
      .emIncidents.filter((x) => x.reporterId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(forReporter),
  );
}

export async function getMyIncident(id: string): Promise<EmIncidentForReporter> {
  const u = requireUser();
  const inc = getIncidentOr404(id);
  if (inc.reporterId !== u.id && u.role !== "ADMIN") throw new ApiError("FORBIDDEN", "Not your report");
  return delay(forReporter(inc));
}

// =====================================================================
// Organization (Core feature 6 + status updates)
// =====================================================================

function requireOrgUser() {
  const u = requireUser(["ORGANIZATION"]);
  if (!u.organizationId) throw new ApiError("FORBIDDEN", "No organization");
  return u;
}

/** Open dispatches first (most severe, oldest), then closed ones. */
export async function orgInbox(opts: { includeClosed?: boolean } = {}): Promise<EmIncidentForOrg[]> {
  const u = requireOrgUser();
  const d = load();
  const sev = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  const rows = d.emDispatches
    .filter((x) => x.organizationId === u.organizationId)
    .map((x) => ({ dp: x, inc: d.emIncidents.find((i) => i.id === x.incidentId)! }))
    .filter(({ dp, inc }) => opts.includeClosed || (!CLOSED.includes(inc.status) && dp.status !== "RESOLVED" && dp.status !== "DECLINED"))
    .sort((a, b) => sev[a.inc.severity] - sev[b.inc.severity] || a.inc.createdAt.localeCompare(b.inc.createdAt));
  return delay(rows.map(({ dp, inc }) => forOrg(inc, dp)));
}

/** Opening an incident confirms receipt (SENT -> RECEIVED). */
export async function getOrgIncident(incidentId: string): Promise<EmIncidentForOrg> {
  const u = requireOrgUser();
  const inc = getIncidentOr404(incidentId);
  const dp = load().emDispatches.find((x) => x.incidentId === incidentId && x.organizationId === u.organizationId);
  if (!dp) throw new ApiError("FORBIDDEN", "Not sent to your organization");
  if (dp.status === "SENT" && !CLOSED.includes(inc.status)) {
    dp.status = "RECEIVED";
    dp.updatedAt = now();
    recomputeStatus(inc, u.id, dp.organizationId);
    save();
  }
  return delay(forOrg(inc, dp));
}

/** Organization moves its dispatch forward, or declines it (wrong area/type) with a note. */
export async function updateDispatch(
  incidentId: string,
  status: Exclude<EmDispatchStatus, "SENT">,
  opts: { note?: string; responseInfo?: string } = {},
): Promise<EmIncidentForOrg> {
  const u = requireOrgUser();
  const inc = getIncidentOr404(incidentId);
  const dp = load().emDispatches.find((x) => x.incidentId === incidentId && x.organizationId === u.organizationId);
  if (!dp) throw new ApiError("FORBIDDEN", "Not sent to your organization");
  if (CLOSED.includes(inc.status)) throw new ApiError("CONFLICT", "Incident is closed");
  if (dp.status === "DECLINED" || dp.status === "RESOLVED") throw new ApiError("CONFLICT", "Already closed for your organization");

  if (status === "DECLINED") {
    if (!opts.note?.trim()) throw new ApiError("VALIDATION", "Say why you decline", "note");
  } else if (DISPATCH_PROGRESS.indexOf(status) <= DISPATCH_PROGRESS.indexOf(dp.status)) {
    throw new ApiError("CONFLICT", "Status can only move forward");
  }
  dp.status = status;
  dp.note = opts.note?.trim() || dp.note;
  dp.responseInfo = opts.responseInfo?.trim() || dp.responseInfo;
  dp.updatedAt = now();
  if (status !== "DECLINED") recomputeStatus(inc, u.id, dp.organizationId, opts.responseInfo || opts.note);
  save();
  return delay(forOrg(inc, dp));
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
  if (verified) notify({ userId: inc.reporterId, type: "EM_VERIFIED", incidentId: id, message: msg("របាយការណ៍របស់អ្នកត្រូវបានផ្ទៀងផ្ទាត់", "Your report was verified") });
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
  if (load().emDispatches.some((x) => x.incidentId === incidentId && x.organizationId === organizationId && x.status !== "DECLINED"))
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
  const a = await createAnnouncement({ ...input, level: input.level ?? "ALERT", incidentId });
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
    incidentId,
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
    notify({ userId: r.id, type: "EM_NEWS_RELEASE", incidentId, message: nr.title });
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

/** Verified incidents only, no people, location rounded to ~100 m. */
export async function listPublicIncidents(filter: { provinceId?: string; cityId?: string; includeClosed?: boolean } = {}) {
  return delay(
    load()
      .emIncidents.filter(
        (x) =>
          x.verified &&
          (filter.includeClosed || !CLOSED.includes(x.status)) &&
          (!filter.provinceId || x.provinceId === filter.provinceId) &&
          (!filter.cityId || x.cityId === filter.cityId),
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .map(toPublic),
  );
}
