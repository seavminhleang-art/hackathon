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

export type Role = "CITIZEN" | "OFFICER" | "ADMIN";

export interface User {
  id: string;
  fullName: string;
  phone: string; // Cambodian format, e.g. "012345678"
  email?: string;
  role: Role;
  provinceId: string;
  cityId: string;
  sangkat?: string;
  preferredLocale: Locale;
  createdAt: ISODateString;
}

/** Stored only inside the mock DB. Never returned to the UI. */
export interface UserRecord extends User {
  password: string; // mock only: the real backend stores a hash
}

export interface RegisterInput {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  provinceId: string;
  cityId: string;
  sangkat?: string;
  preferredLocale?: Locale;
}

export interface LoginInput {
  phone: string;
  password: string;
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

// ---------- Reports (government reporting + emergency) ----------

export type ReportCategory =
  | "DRAIN_BLOCKED"
  | "FLOODING"
  | "WASTE_OVERFLOW"
  | "ILLEGAL_DUMPING"
  | "POTHOLE"
  | "STREETLIGHT"
  | "TRAFFIC_JAM"
  | "ROAD_CRASH"
  | "NEED_POLICE"
  | "OTHER";

export type Urgency = "LOW" | "MEDIUM" | "HIGH";

export type ReportStatus = "REPORTED" | "ASSIGNED" | "IN_PROGRESS" | "FIXED" | "REJECTED";

export interface CategoryMeta {
  id: ReportCategory;
  label: I18nText;
  icon: string; // emoji placeholder until real icons exist
  defaultUrgency: Urgency;
  /** Agency that normally handles it (shown to admins). */
  agency: I18nText;
  /** HIGH-urgency categories show the emergency call screen first. */
  emergency: boolean;
}

export interface StatusChange {
  from: ReportStatus | null;
  to: ReportStatus;
  changedBy: string; // user id
  note?: string;
  at: ISODateString;
}

export interface Report {
  id: string;
  reporterId: string;
  category: ReportCategory;
  urgency: Urgency;
  title: string;
  description: string;
  location: LatLng;
  cityId: string;
  addressHint?: string;
  photoUrl?: string;
  status: ReportStatus;
  assignedTo?: string; // officer user id
  upvotes: number;
  history: StatusChange[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** What anyone can see on the public map: no reporter identity. */
export type PublicReport = Omit<Report, "reporterId" | "assignedTo" | "history"> & {
  history: Omit<StatusChange, "changedBy">[];
};

export interface CreateReportInput {
  category: ReportCategory;
  urgency: Urgency;
  title: string;
  description: string;
  location: LatLng;
  cityId: string;
  addressHint?: string;
  photoUrl?: string;
}

export interface ReportFilter {
  status?: ReportStatus[];
  category?: ReportCategory[];
  cityId?: string;
  urgency?: Urgency[];
}

// ---------- Notifications ----------

export type NotificationType =
  | "REPORT_STATUS"
  | "LF_CLAIM_RECEIVED"
  | "LF_CLAIM_APPROVED"
  | "LF_CLAIM_REJECTED"
  | "LF_PICKUP_SET"
  | "LF_RETURNED"
  | "LF_COMMENT"
  | "LF_SIGHTING"
  | "LF_MATCH"
  | "LF_POST_HIDDEN"
  | "LF_EXPIRING";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  reportId?: string;
  postId?: string;
  claimId?: string;
  message: I18nText;
  read: boolean;
  createdAt: ISODateString;
}

// Lost & Found types live in their own file.
export * from "./lost-found";

// ---------- Emergency & community ----------

export interface EmergencyContact {
  id: string;
  name: I18nText;
  number: string;
  icon: string;
}

export type ServiceType = "WASTE_SCHEDULE" | "WATER" | "ELECTRICITY" | "HOSPITAL" | "POLICE_POST" | "SANGKAT_OFFICE";

export interface CityService {
  id: string;
  type: ServiceType;
  name: I18nText;
  cityId: string;
  location?: LatLng;
  phone?: string;
  hours?: string;
  note?: I18nText;
}

export interface Announcement {
  id: string;
  title: I18nText;
  body: I18nText;
  cityId?: string; // undefined = city-wide
  level: "INFO" | "WARNING" | "ALERT";
  createdAt: ISODateString;
}

// ---------- Stats (public dashboard) ----------

export interface StatsSummary {
  total: number;
  byStatus: Record<ReportStatus, number>;
  byCategory: Partial<Record<ReportCategory, number>>;
  byCity: Record<string, number>;
  avgHoursToFixed: number | null;
}
