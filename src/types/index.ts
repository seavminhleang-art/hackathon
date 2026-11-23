// Shared domain types. Mirror these in the Spring Boot DTOs so the
// frontend can swap the mock API for the real one without changes.

export type Locale = "km" | "en";

/** Text shown in both languages. Khmer is the default. */
export interface I18nText {
  km: string;
  en: string;
}

export type ISODateString = string;

export interface LatLng {
  lat: number;
  lng: number;
}

// ---------- Users & auth ----------

/**
 * CITIZEN: residents. OFFICER: local government staff (one city/khan).
 * ADMIN: platform admins. ORGANIZATION: staff of an emergency organization
 * (police, hospital, fire...). REPORTER: verified news reporter.
 * DEPARTMENT_STAFF: staff of a city department that fixes civic reports (feature 3).
 */
export type Role = "CITIZEN" | "OFFICER" | "ADMIN" | "ORGANIZATION" | "REPORTER" | "DEPARTMENT_STAFF";

export interface User {
  id: string;
  /** Unique handle for logging in: a–z, 0–9, "_" and ".", 3–20 characters. */
  username: string;
  /** Given name (នាមខ្លួន). */
  firstName: string;
  /** Family name (នាមត្រកូល). */
  lastName: string;
  /** Display name, Khmer order: family name then given name ("សុខ ដារ៉ា"). */
  fullName: string;
  /** Optional for self-registered users. Needed for Telegram codes. Cambodian format, e.g. "012345678". */
  phone?: string;
  email?: string;
  /** How the account signs in. GOOGLE accounts have no password. */
  authProvider: AuthProvider;
  role: Role;
  /** Set for ORGANIZATION and REPORTER accounts. */
  organizationId?: string;
  /** Set for DEPARTMENT_STAFF accounts. */
  departmentId?: string;
  provinceId: string;
  cityId: string;
  sangkat?: string;
  preferredLocale: Locale;
  createdAt: ISODateString;
}

export type AuthProvider = "PASSWORD" | "GOOGLE";

/** Where a one-time code is delivered. TELEGRAM goes to the Telegram account of the user's phone. */
export type CodeChannel = "EMAIL" | "TELEGRAM";

/** Stored only inside the mock DB. Never returned to the UI. */
export interface UserRecord extends User {
  password?: string; // mock only: the real backend stores a hash. None for GOOGLE accounts.
}

export interface RegisterInput {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Required unless `provider` is GOOGLE. */
  password?: string;
  phone?: string;
  provinceId: string;
  cityId: string;
  sangkat?: string;
  preferredLocale?: Locale;
  provider?: AuthProvider;
}

export interface LoginInput {
  /** Email, phone number or username. */
  identifier: string;
  password: string;
}

/** Demo Google profile (the real backend verifies a Google ID token instead). */
export interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

// ---------- Locations ----------

export interface Province {
  id: string;
  name: I18nText;
  center: LatLng;
}

/** A khan (Phnom Penh) or krong/srok (provinces). */
export interface City {
  id: string;
  provinceId: string;
  name: I18nText;
  center: LatLng;
}

// Civic reports (feature 3): see ./gov-reporting.ts.

// ---------- Notifications ----------

export type NotificationType =
  | "GR_SUBMITTED"
  | "GR_APPROVED"
  | "GR_REJECTED"
  | "GR_INFO_REQUESTED"
  | "GR_ASSIGNED"
  | "GR_NEW_TASK"
  | "GR_WORK_STARTED"
  | "GR_RESOLVED"
  | "GR_CLOSED"
  | "GR_REOPENED"
  | "GR_DUPLICATE"
  | "GR_COMMENT"
  | "LF_CLAIM_RECEIVED"
  | "LF_CLAIM_APPROVED"
  | "LF_CLAIM_REJECTED"
  | "LF_PICKUP_SET"
  | "LF_RETURNED"
  | "LF_COMMENT"
  | "LF_SIGHTING"
  | "LF_MATCH"
  | "LF_POST_HIDDEN"
  | "LF_EXPIRING"
  | "CS_ALERT"
  | "CS_ANNOUNCEMENT"
  | "CS_COMMENT"
  | "CS_REPLY"
  | "CS_ANSWER_ACCEPTED"
  | "CS_EVENT_REMINDER"
  | "CS_GROUP_POST"
  | "CS_EDIT_REVIEWED"
  | "CS_CONTENT_HIDDEN"
  | "EM_STATUS"
  | "EM_NEW_INCIDENT"
  | "EM_SOS_CONTACT"
  | "EM_VERIFIED"
  | "EM_NEWS_RELEASE";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  reportId?: string;
  postId?: string;
  claimId?: string;
  // Community & Services targets
  csPostId?: string;
  announcementId?: string;
  groupId?: string;
  placeId?: string;
  guideId?: string;
  // Emergency targets
  incidentId?: string;
  message: I18nText;
  read: boolean;
  createdAt: ISODateString;
}

// Feature types live in their own files.
export * from "./lost-found";
export * from "./community";
export * from "./emergency";
export * from "./gov-reporting";

// ---------- Emergency ----------

/** Public hotline numbers (117, 118, 119). Not the user's trusted contacts. */
export interface EmergencyHotline {
  id: string;
  name: I18nText;
  number: string;
  icon: string;
}

// Civic services and announcements: see ./community.ts (Community & Services).
