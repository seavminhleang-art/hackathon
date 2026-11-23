// Emergency Response & Incident Reporting (core feature 2).
// Spec: docs/features/emergency.md
//
// Process: user presses SOS or reports an incident -> location (with permission)
// -> details -> system routes to the right organizations -> sent through an
// approved channel -> organization confirms receipt -> user tracks status.
//
// Key rules:
// - SOS never replaces calling 117 / 118 / 119. The hotline is always shown first.
// - "Submitted" does NOT mean help is coming. Only organizations move the status.
// - Nothing goes to news reporters automatically: needs reporter consent +
//   admin verification + a separate redacted news release.
// - Phone numbers, names and sensitive photos are never public.

import type { I18nText, ISODateString, LatLng, OpeningHours } from "./index";

// ---------- Organizations (also the emergency service directory) ----------

export type EmOrgType = "POLICE" | "HOSPITAL" | "AMBULANCE" | "FIRE" | "RESCUE" | "NEWS";

/**
 * An emergency organization. Every non-NEWS organization is also an entry in
 * the emergency service directory (Core features 5 and 7) and has an inbox
 * that receives dispatched incidents (Core feature 6).
 */
export interface EmOrganization {
  id: string;
  type: EmOrgType;
  name: I18nText;
  provinceId: string;
  cityId: string;
  address: string;
  location: LatLng;
  phone: string;
  /** Hotline to show for this type (117 police, 118 fire, 119 ambulance). */
  hotline?: string;
  hours: OpeningHours;
  /** Cities this organization covers. Empty = its whole province. */
  coverageCityIds: string[];
  verified: boolean;
}

export interface EmServiceView extends EmOrganization {
  openNow: boolean;
  distanceKm?: number;
}

export interface EmServiceFilter {
  q?: string;
  type?: EmOrgType[];
  provinceId?: string;
  cityId?: string;
  near?: LatLng;
  /** With `near`: only services within this many km. */
  radiusKm?: number;
  openNow?: boolean;
}

// ---------- Incident types and severity ----------

export type EmIncidentType =
  | "ROAD_CRASH"
  | "FIRE"
  | "MEDICAL"
  | "CRIME"
  | "VIOLENCE"
  | "FLOOD_DANGER"
  | "DROWNING"
  | "BUILDING_COLLAPSE"
  | "ELECTRICAL_HAZARD"
  | "MISSING_PERSON"
  | "OTHER";

export interface EmIncidentTypeMeta {
  id: EmIncidentType;
  label: I18nText;
  icon: string;
  /** Hotline the user should call first. */
  hotline: string;
  /** Organization types that receive this incident (Key rule: correct organization). */
  routesTo: EmOrgType[];
  defaultSeverity: EmSeverity;
}

export type EmSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ---------- Status ----------

/**
 * Submitted -> Received -> Under review -> Acknowledged -> Responding -> Resolved.
 * Alternatives: Rejected (with reason), Cancelled (reporter is safe / false alarm),
 * Duplicate (linked to the original incident).
 *
 * Only organizations move an incident past SUBMITTED. The incident status is the
 * furthest status reached by any of its dispatches.
 */
export type EmIncidentStatus =
  | "SUBMITTED"
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "ACKNOWLEDGED"
  | "RESPONDING"
  | "RESOLVED"
  | "REJECTED"
  | "CANCELLED"
  | "DUPLICATE";

/** Per-organization delivery status. */
export type EmDispatchStatus =
  | "SENT" // delivered to the channel; nobody has confirmed yet
  | "RECEIVED" // organization opened / confirmed receipt
  | "UNDER_REVIEW"
  | "ACKNOWLEDGED"
  | "RESPONDING"
  | "RESOLVED"
  | "DECLINED"; // not theirs (wrong area/type) -> admin reassigns

/** Only IN_APP exists in the mock. The others are the future plan. */
export type EmChannel = "IN_APP" | "TELEGRAM" | "SMS" | "API";

export interface EmDispatch {
  id: string;
  incidentId: string;
  organizationId: string;
  channel: EmChannel;
  status: EmDispatchStatus;
  /** Who routed it: the system (automatic) or an admin. */
  routedBy: "SYSTEM" | string;
  note?: string;
  /** Shown to the reporter, e.g. "Ambulance on the way, ETA 10 min". */
  responseInfo?: string;
  sentAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EmStatusChange {
  status: EmIncidentStatus;
  /** User id, or "SYSTEM". */
  by: string;
  organizationId?: string;
  note?: string;
  at: ISODateString;
}

// ---------- Incidents ----------

export type EmIncidentKind = "SOS" | "REPORT";
export type EmLocationSource = "GPS" | "MAP" | "TEXT";

/** Consent is per incident and defaults to the safest choice (false). */
export interface EmConsent {
  /** Responders may see the reporter's name and phone. */
  shareContactWithResponders: boolean;
  /** A redacted public version may be shared with news reporters after verification. */
  shareWithNews: boolean;
}

export interface EmIncident {
  id: string;
  kind: EmIncidentKind;
  reporterId: string;
  type: EmIncidentType;
  severity: EmSeverity;
  description: string;
  photoUrls: string[];
  location: LatLng;
  locationSource: EmLocationSource;
  /** GPS accuracy in metres, when known. */
  accuracyM?: number;
  addressHint?: string;
  provinceId: string;
  cityId: string;
  /** When it happened (can be earlier than createdAt). */
  occurredAt: ISODateString;
  peopleAffected?: number;
  consent: EmConsent;
  status: EmIncidentStatus;
  history: EmStatusChange[];
  /** Admin verification (needed for public alerts and news). Does not block delivery. */
  verified: boolean;
  verifiedBy?: string;
  rejectReason?: string;
  cancelReason?: string;
  duplicateOf?: string;
  /** Announcement id in Community & Services, if a public alert was published. */
  alertAnnouncementId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EmCreateIncidentInput {
  type: EmIncidentType;
  severity?: EmSeverity;
  description: string;
  photoUrls?: string[];
  location: LatLng;
  locationSource: EmLocationSource;
  accuracyM?: number;
  addressHint?: string;
  provinceId: string;
  cityId: string;
  occurredAt?: ISODateString;
  peopleAffected?: number;
  consent?: Partial<EmConsent>;
}

export interface EmSosInput {
  type: EmIncidentType;
  location: LatLng;
  locationSource: EmLocationSource;
  accuracyM?: number;
  provinceId: string;
  cityId: string;
  note?: string;
  /** Default true for SOS: responders need to reach the person. */
  shareContactWithResponders?: boolean;
  /** Default true: alert the user's trusted contacts. */
  notifyTrustedContacts?: boolean;
}

export interface EmSosResult {
  incident: EmIncidentForReporter;
  /** Call this first. */
  hotline: string;
  /** App users among trusted contacts got an in-app alert. */
  notifiedInApp: string[];
  /**
   * Trusted contacts who are not app users: a ready `sms:` link the user taps
   * to send their location themselves (a website can't send SMS on its own).
   */
  smsLinks: { name: string; phone: string; href: string }[];
}

/** Reporter's own view: everything, including dispatches. */
export interface EmIncidentForReporter extends EmIncident {
  dispatches: (EmDispatch & { organizationName: I18nText; organizationType: EmOrgType })[];
}

/** Organization view: reporter contact only with consent. */
export interface EmIncidentForOrg extends Omit<EmIncident, "reporterId"> {
  dispatch: EmDispatch;
  reporterContact?: { fullName: string; phone?: string };
}

/** Public / visitor view: verified incidents only, no people, rounded location. */
export interface EmPublicIncident {
  id: string;
  type: EmIncidentType;
  severity: EmSeverity;
  status: EmIncidentStatus;
  approxLocation: LatLng;
  provinceId: string;
  cityId: string;
  occurredAt: ISODateString;
  alertAnnouncementId?: string;
}

export interface EmIncidentFilter {
  status?: EmIncidentStatus[];
  type?: EmIncidentType[];
  provinceId?: string;
  cityId?: string;
  kind?: EmIncidentKind;
  verified?: boolean;
}

// ---------- Trusted contacts (Core feature 3) ----------

export interface EmTrustedContact {
  id: string;
  ownerId: string;
  name: string;
  phone: string; // normalized 0XXXXXXXX
  relation?: string;
  /** Set when the phone belongs to an app user (they get in-app alerts). */
  linkedUserId?: string;
  notifyOnSos: boolean;
  createdAt: ISODateString;
}

// ---------- News releases (approved public information) ----------

/**
 * A redacted, admin-approved version of a verified incident for news reporters.
 * Only created when the reporter consented (consent.shareWithNews).
 */
export interface EmNewsRelease {
  id: string;
  incidentId: string;
  title: I18nText;
  summary: I18nText;
  type: EmIncidentType;
  approxLocation: LatLng;
  provinceId: string;
  cityId: string;
  /** Only photos an admin checked (no faces, plates or victims). */
  approvedPhotoUrls: string[];
  approvedBy: string;
  publishedAt: ISODateString;
}

// ---------- Rules (Core feature 10) ----------

export const EM_RULES = {
  maxTrustedContacts: 5,
  /** SOS presses per user per hour before the app only shows the hotline. */
  sosPerHour: 3,
  /** Incident reports per user per day. */
  reportsPerDay: 10,
  /** Rejected reports in 30 days before new reports need admin review first. */
  rejectionsBeforeReview: 3,
  nearbyRadiusKm: 10,
  /** Public locations rounded to 3 decimals (~100 m). */
  publicLocationDecimals: 3,
} as const;
