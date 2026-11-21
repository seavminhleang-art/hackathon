// Government Reporting System (core feature 3). Spec: docs/features/gov-reporting.md
//
// Lifecycle: Citizen reports -> Admin reviews -> Department assignment ->
// Staff resolves -> Admin verifies -> Report closes.
//
// Civic problems only. Emergencies (crash, fire, crime, medical, people in
// danger) are incidents in feature 2: see ./emergency.ts.

import type { I18nText, ISODateString, LatLng } from "./index";

// ---------- Categories and departments ----------

export type GrCategory =
  | "ROAD_TRANSPORT"
  | "WASTE"
  | "DRAINAGE_FLOODING"
  | "PUBLIC_LIGHTING"
  | "WATER"
  | "PUBLIC_INFRASTRUCTURE"
  | "OTHER";

export type GrDepartmentType =
  | "ROAD_MAINTENANCE"
  | "WASTE_MANAGEMENT"
  | "DRAINAGE"
  | "PUBLIC_LIGHTING"
  | "WATER_MANAGEMENT"
  | "PUBLIC_PARKS";

export interface GrCategoryMeta {
  id: GrCategory;
  label: I18nText;
  icon: string;
  examples: I18nText;
  /** Hybrid routing: department type the system suggests. null = admin picks. */
  departmentType: GrDepartmentType | null;
}

export interface GrDepartment {
  id: string;
  type: GrDepartmentType;
  name: I18nText;
  provinceId: string;
  /** Cities this department covers. Empty = the whole province. */
  coverageCityIds: string[];
  phone: string;
}

// ---------- Priority and status ----------

/** CRITICAL = immediate safety risk, HIGH = urgent, MEDIUM = normal, LOW = minor. */
export type GrPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Main: SUBMITTED -> UNDER_REVIEW -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED.
 * RESOLVED = department says it's fixed. CLOSED = admin verified it.
 * Side paths: NEED_MORE_INFO, REJECTED, DUPLICATE, REOPENED, CANCELLED (by the citizen).
 */
export type GrStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEED_MORE_INFO"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED"
  | "REOPENED"
  | "DUPLICATE"
  | "CANCELLED";

export type GrAction =
  | "CREATED"
  | "EDITED"
  | "CANCELLED"
  | "REVIEW_STARTED"
  | "INFO_REQUESTED"
  | "INFO_PROVIDED"
  | "APPROVED_ASSIGNED"
  | "REASSIGNED"
  | "ACCEPTED"
  | "WORK_STARTED"
  | "PROGRESS_UPDATE"
  | "RESOLVED"
  | "RESOLUTION_REJECTED"
  | "CLOSED"
  | "REJECTED"
  | "MARKED_DUPLICATE"
  | "REOPENED"
  | "CATEGORY_CHANGED"
  | "PRIORITY_CHANGED";

export type GrActorRole = "CITIZEN" | "ADMIN" | "DEPARTMENT_STAFF" | "SYSTEM";

/** Report history: who did what, when (Core feature 12). */
export interface GrHistoryEntry {
  action: GrAction;
  from?: GrStatus;
  to?: GrStatus;
  by: string; // user id or "SYSTEM"
  byRole: GrActorRole;
  note?: string;
  /** Internal entries are only shown to admins and department staff. */
  internal?: boolean;
  at: ISODateString;
}

// ---------- Photos ----------

export type GrPhotoMime = "image/jpeg" | "image/png" | "image/webp";

export interface GrPhoto {
  id: string;
  url: string;
  mimeType: GrPhotoMime;
  sizeBytes: number;
  /** EVIDENCE = from the citizen, REPAIR = from department staff. */
  kind: "EVIDENCE" | "REPAIR";
  uploadedBy: string;
  uploadedAt: ISODateString;
}

export interface GrPhotoInput {
  url: string;
  mimeType: string;
  sizeBytes: number;
}

// ---------- Reports ----------

export interface GrConfirmation {
  userId: string;
  stillExists: boolean;
  at: ISODateString;
}

export interface GrReport {
  id: string;
  /** Human-readable unique id shown to citizens, e.g. "RPT-2026-00012". */
  code: string;
  reporterId: string;
  category: GrCategory;
  title: string;
  description: string;
  photos: GrPhoto[];
  location: LatLng;
  locationSource: "GPS" | "MAP";
  addressHint?: string;
  provinceId: string;
  cityId: string;
  priority: GrPriority;
  status: GrStatus;
  departmentId?: string;
  /** Department staff member who accepted the task. */
  acceptedBy?: string;
  acceptedAt?: ISODateString;
  assignedAt?: ISODateString;
  /** assignedAt + SLA days for the priority. Past it and not resolved = overdue. */
  dueAt?: ISODateString;
  resolvedAt?: ISODateString;
  closedAt?: ISODateString;
  resolutionNote?: string;
  /** Open question from the admin (NEED_MORE_INFO). */
  infoRequest?: string;
  rejectReason?: string;
  duplicateOf?: string;
  supporters: string[];
  confirmations: GrConfirmation[];
  reopenCount: number;
  history: GrHistoryEntry[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** What a viewer gets. Private fields depend on who is asking. */
export interface GrReportView
  extends Omit<GrReport, "reporterId" | "supporters" | "confirmations" | "history" | "acceptedBy"> {
  isMine: boolean;
  departmentName?: I18nText;
  supportCount: number;
  mySupport: boolean;
  stillExistsCount: number;
  notFixedCount: number;
  overdue: boolean;
  /** Public/citizen view hides internal entries and replaces user ids with roles. */
  history: (Omit<GrHistoryEntry, "by"> & { by?: string })[];
  /** Admin and assigned staff only. Never phone or email. */
  reporter?: { id: string; name: string };
  acceptedByName?: string;
  /** What the viewer may do next (for the UI to show buttons). */
  can: GrPermissions;
}

export interface GrPermissions {
  edit: boolean;
  cancel: boolean;
  respondToInfo: boolean;
  requestReopen: boolean;
  support: boolean;
  comment: boolean;
  review: boolean; // admin: start review, approve, reject, request info, duplicate
  close: boolean; // admin: close or send back a RESOLVED report
  accept: boolean; // staff
  startWork: boolean; // staff
  resolve: boolean; // staff
}

export interface GrCreateReportInput {
  category: GrCategory;
  title: string;
  description: string;
  photos?: GrPhotoInput[];
  location: LatLng;
  locationSource: "GPS" | "MAP";
  addressHint?: string;
  provinceId: string;
  cityId: string;
}

export type GrUpdateReportInput = Partial<Omit<GrCreateReportInput, "provinceId" | "cityId">> & {
  provinceId?: string;
  cityId?: string;
};

export interface GrReportFilter {
  q?: string;
  category?: GrCategory[];
  status?: GrStatus[];
  priority?: GrPriority[];
  provinceId?: string;
  cityId?: string;
  departmentId?: string;
  dateFrom?: string; // YYYY-MM-DD (createdAt)
  dateTo?: string;
  overdueOnly?: boolean;
  /** Sort nearest first. */
  near?: LatLng;
}

export interface GrDuplicateCandidate {
  report: GrReportView;
  distanceM: number;
  score: number; // 0-100
  reasons: ("SAME_CATEGORY" | "NEARBY" | "RECENT" | "SIMILAR_TEXT")[];
}

// ---------- Comments ----------

export interface GrComment {
  id: string;
  reportId: string;
  authorId: string;
  authorRole: GrActorRole;
  body: string;
  /** Internal notes: admins and department staff only. */
  internal: boolean;
  createdAt: ISODateString;
}

export interface GrCommentView {
  id: string;
  body: string;
  internal: boolean;
  authorRole: GrActorRole;
  /** Name for staff and admins; "Reporter" for the citizen. Never phone or email. */
  authorLabel: string;
  isMine: boolean;
  createdAt: ISODateString;
}

// ---------- Dashboard ----------

export interface GrDepartmentStats {
  departmentId: string;
  name: I18nText;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  overdue: number;
  avgResolutionHours: number | null;
}

export interface GrDashboard {
  total: number;
  pendingReview: number; // SUBMITTED + UNDER_REVIEW
  needMoreInfo: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  rejected: number;
  overdue: number;
  byStatus: Record<GrStatus, number>;
  byCategory: Partial<Record<GrCategory, number>>;
  byCity: Record<string, number>;
  /** closed / (total - rejected - duplicate - cancelled). */
  resolutionRate: number | null;
  /** SUBMITTED -> CLOSED, closed reports only. */
  avgResolutionHours: number | null;
  departments: GrDepartmentStats[];
}

// ---------- Rules ----------

export const GR_RULES = {
  maxPhotos: 5,
  maxPhotoBytes: 5 * 1024 * 1024,
  photoTypes: ["image/jpeg", "image/png", "image/webp"] as GrPhotoMime[],
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 2000,
  /** Days to resolve after assignment, by priority. */
  slaDays: { CRITICAL: 1, HIGH: 3, MEDIUM: 7, LOW: 14 } as Record<GrPriority, number>,
  duplicateRadiusM: 200,
  duplicateWindowDays: 30,
  /** A citizen can ask to reopen within this many days of closing, at most maxReopens times. */
  reopenWindowDays: 30,
  maxReopens: 2,
} as const;

/** Statuses anyone can see on the public feed and map (approved reports only). */
export const GR_PUBLIC_STATUSES: GrStatus[] = ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED"];
