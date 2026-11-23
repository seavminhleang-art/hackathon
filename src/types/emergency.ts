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
  /** Last verified date for directory data accuracy (reset when pending review) */
  lastVerified?: ISODateString;
  /** Whether the service entry is active or deactivated by admin */
  active: boolean;
  /** Whether changes made by organization staff are pending admin review */
  pendingReview?: boolean;
}

export interface EmServiceView extends EmOrganization {
  openNow: boolean;
  distanceKm?: number;
  isStaleVerified?: boolean;
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
  includeDeactivated?: boolean;
}

export interface EmCreateServiceInput {
  type: EmOrgType;
  name: I18nText;
  provinceId: string;
  cityId: string;
  address: string;
  location: LatLng;
  phone: string;
  hotline?: string;
  hours?: OpeningHours;
  coverageCityIds?: string[];
}

export interface EmUpdateServiceInput {
  name?: I18nText;
  provinceId?: string;
  cityId?: string;
  address?: string;
  location?: LatLng;
  phone?: string;
  hotline?: string;
  hours?: OpeningHours;
  coverageCityIds?: string[];
  active?: boolean;
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

// ---------- Status & Multi-Dispatch Derivation ----------

/**
 * MULTI-DISPATCH STATUS DERIVATION RULE:
 * When an incident is routed to multiple organizations (e.g. Police + Ambulance),
 * the overall incident status is derived from its active (non-DECLINED) dispatches:
 * 1. If all active dispatches are RESOLVED -> incident is RESOLVED.
 * 2. Else if any active dispatch is RESPONDING -> incident is RESPONDING.
 * 3. Else if any active dispatch is ACKNOWLEDGED -> incident is ACKNOWLEDGED.
 * 4. Else if any active dispatch is UNDER_REVIEW -> incident is UNDER_REVIEW.
 * 5. Else if any active dispatch is RECEIVED -> incident is RECEIVED.
 * 6. Else (all active are SENT) -> incident is SUBMITTED.
 * Special cases:
 * - If all dispatches are DECLINED -> incident stays SUBMITTED (awaiting admin reassignment).
 * - REJECTED (admin), CANCELLED (reporter), and DUPLICATE (admin) are terminal overrides.
 *
 * PERMISSION TABLE FOR STATUS TRANSITIONS:
 * - SUBMITTED -> RECEIVED: Assigned ORGANIZATION staff (on opening incident)
 * - RECEIVED -> UNDER_REVIEW: Assigned ORGANIZATION staff
 * - UNDER_REVIEW -> ACKNOWLEDGED: Assigned ORGANIZATION staff
 * - ACKNOWLEDGED -> RESPONDING: Assigned ORGANIZATION staff
 * - RESPONDING -> RESOLVED: Assigned ORGANIZATION staff or ADMIN
 * - Any non-closed -> REJECTED: ADMIN only (reason required)
 * - Any non-closed -> CANCELLED: Incident owner/reporter only (reason required)
 * - Any non-closed -> DUPLICATE: ADMIN only (original incident ID required)
 * - Dispatch -> DECLINED: Assigned ORGANIZATION staff only (reason required)
 */
/**
 * Canonical Incident Status Model:
 * - SUBMITTED: Created by citizen or SOS countdown, delivered into dispatch pipeline.
 * - RECEIVED: At least one assigned organization has opened/viewed the dispatch console.
 * - UNDER_REVIEW: Organization or admin is actively reviewing details/triaging unit availability.
 * - ACKNOWLEDGED: Organization has formally accepted ownership and committed resources (prior to rollout).
 * - RESPONDING: Field units (patrol/ambulance/fire) are actively en route with ETA. Unlocks "Help is on the way".
 * - RESOLVED: Operations completed and formally resolved by organization staff or admin.
 * - CLOSED_BY_USER: Citizen indicated they are safe and closed the incident (does not auto-resolve org dispatches).
 * - CANCELLED: Citizen cancelled (mistake/false alarm with reason or accidental SOS).
 * - REJECTED: Admin rejected report with mandatory explanation.
 * - DUPLICATE: Merged with an existing primary incident.
 * - FAILED_RETRYING: Stored locally in offline queue awaiting network retry.
 */
export type EmIncidentStatus =
  | "SUBMITTED"
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "ACKNOWLEDGED"
  | "RESPONDING"
  | "RESOLVED"
  | "CLOSED_BY_USER"
  | "REJECTED"
  | "FAILED_RETRYING"
  | "CANCELLED"
  | "DUPLICATE";

/** Per-organization delivery status. */
export type EmDispatchStatus =
  | "SENT" // delivered to the channel; nobody has confirmed yet
  | "RECEIVED" // organization opened / confirmed receipt
  | "UNDER_REVIEW" // organization reviewing details
  | "ACKNOWLEDGED" // organization accepted ownership and preparing response
  | "RESPONDING" // field responders actively en route
  | "RESOLVED" // field operations completed
  | "DECLINED" // not theirs (wrong area/type) -> admin reassigns
  | "CANNOT_CONTINUE"; // unit en route encountered roadblock/incident -> returns for reassignment

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
  consentedAt?: ISODateString;
}

/** Specific granular consents for normal incident reporting (Core feature 4, Step 4) */
export interface EmConsents {
  /** Send to relevant emergency response organizations (default: true) */
  shareWithOrganizations: boolean;
  /** Allow responders to call reporter back for details (default: false) */
  allowCallback: boolean;
  /** Share with media in general area only, no names/faces (default: false) */
  shareWithMedia: boolean;
  /** Report anonymously without reporter identity (default: false) */
  anonymous: boolean;
}

export interface EmIncidentAdditionalDetail {
  text?: string;
  photoUrls?: string[];
  addedAt: ISODateString;
  addedBy: string;
}

export interface EmIncident {
  id: string;
  code: string;
  kind: EmIncidentKind;
  submittedByUserId: string;
  /** Alias for backwards-compatibility */
  reporterId: string;
  type: EmIncidentType;
  /** Authoritative final severity (set by Organization or Admin) */
  severity: EmSeverity;
  /** Suggested severity selected by user on submission */
  suggestedSeverity?: EmSeverity;
  description: string;
  photoUrls: string[];
  location: LatLng;
  locationSource: EmLocationSource;
  /** False if GPS was denied or failed and report relies on landmark/manual pin */
  locationConfirmed: boolean;
  locationStatus: "CONFIRMED" | "UNCONFIRMED" | "NOT_SHARED";
  landmark?: string;
  /** GPS accuracy in metres, when known. */
  accuracyM?: number;
  lastKnownLocation?: LatLng;
  addressHint?: string;
  provinceId: string;
  cityId: string;
  /** When it happened (can be earlier than createdAt). */
  occurredAt: ISODateString;
  peopleAffected?: number;
  numInjured?: "0" | "1" | "2-5" | "5+";
  consent: EmConsent;
  consents?: EmConsents;
  status: EmIncidentStatus;
  history: EmStatusChange[];
  /** Flagged for admin review when rapid repeated SOS occurs without hard-blocking */
  flaggedForReview?: boolean;
  flaggedReason?: string;
  /** Marked when reporter explicitly closes SOS safely */
  closedByUser?: boolean;
  /** Flagged if another incident exists with same type within ~150m & 15min */
  isPossibleDuplicate?: boolean;
  possibleDuplicateOf?: string;
  /** Whether uploaded photos are marked sensitive and unapproved for public view */
  sensitiveMedia?: boolean;
  additionalDetails?: EmIncidentAdditionalDetail[];
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
  suggestedSeverity?: EmSeverity;
  description?: string;
  photoUrls?: string[];
  location?: LatLng;
  locationSource?: EmLocationSource;
  locationConfirmed?: boolean;
  locationStatus?: "CONFIRMED" | "UNCONFIRMED" | "NOT_SHARED";
  landmark?: string;
  accuracyM?: number;
  addressHint?: string;
  provinceId: string;
  cityId: string;
  occurredAt?: ISODateString;
  peopleAffected?: number;
  numInjured?: "0" | "1" | "2-5" | "5+";
  consent?: Partial<EmConsent>;
  consents?: Partial<EmConsents>;
  sensitiveMedia?: boolean;
}

export interface EmAddIncidentDetailsInput {
  text?: string;
  photoUrls?: string[];
}

export interface EmSosInput {
  type: EmIncidentType;
  location?: LatLng;
  locationSource?: EmLocationSource;
  locationConfirmed?: boolean;
  locationStatus?: "CONFIRMED" | "UNCONFIRMED" | "NOT_SHARED";
  landmark?: string;
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
  /** True when every routed dispatch has been DECLINED by the assigned organizations */
  allDispatchesDeclined?: boolean;
}

/** Organization view: reporter contact only with consent. */
export interface EmIncidentForOrg extends Omit<EmIncident, "reporterId"> {
  dispatch: EmDispatch;
  reporterContact?: { fullName: string; phone: string };
  /** Warning flag if dispatch has been SENT or RECEIVED for over 5 minutes without acknowledgment */
  isUnacknowledgedStale?: boolean;
  /** Warning flag if citizen closed or cancelled after dispatch marked RESPONDING */
  standDownWarning?: boolean;
  /** Situational awareness: other organizations dispatched to this incident */
  otherDispatches?: (EmDispatch & { organizationName: I18nText; organizationType: EmOrgType })[];
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

export type EmContactStatus = "PENDING" | "CONFIRMED" | "MUTED" | "DECLINED" | "LEFT" | "EXPIRED";

export interface EmTrustedContact {
  id: string;
  ownerId: string;
  name: string;
  phone: string; // canonical format +855XXXXXXXX
  relation?: string;
  priority: number; // 1 to 5
  status: EmContactStatus;
  inviteSentAt: ISODateString;
  inviteExpiresAt: ISODateString;
  shareMedicalInfo: boolean;
  /** Set when the phone belongs to an app user (they get in-app alerts). */
  linkedUserId?: string;
  notifyOnSos: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
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
  /** Maximum number of active (PENDING/CONFIRMED/MUTED) trusted contacts. DECLINED/LEFT/EXPIRED do not count. */
  maxTrustedContacts: 5,
  /** Number of days before a pending invite automatically expires. */
  inviteExpiryDays: 7,
  /** SOS presses per user per hour before incidents are flagged for admin review. Never hard-blocked. */
  sosPerHour: 3,
  /** Incident reports per user per day. */
  reportsPerDay: 10,
  /** Rejected reports in 30 days before new reports need admin review first. */
  rejectionsBeforeReview: 3,
  nearbyRadiusKm: 10,
  /** Minutes a dispatch sits unacknowledged (SENT or RECEIVED) before showing an urgent warning */
  unacknowledgedWarningMinutes: 5,
  /** Public locations rounded to 3 decimals (~100 m). */
  publicLocationDecimals: 3,
} as const;
