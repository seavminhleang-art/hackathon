// [DEV-ONLY] In-memory & localStorage mock database for prototype development only.
// This is not a production database. All mutations are stored in browser localStorage
// or in-memory mock state and do not persist to any real backend server.
// Call resetMockDb() to go back to the seed data.

import type {
  AppNotification,
  AuditLogEntry,
  AuthSession,
  CsAnnouncement,
  CsComment,
  CsEditSuggestion,
  CsGroup,
  CsGuide,
  CsMember,
  CsPlace,
  CsPost,
  CsWasteSchedule,
  EmDispatch,
  EmIncident,
  EmNewsRelease,
  EmOrganization,
  EmTrustedContact,
  IncidentStatusHistory,
  LfClaim,
  LfComment,
  LfPost,
  GrComment,
  GrReport,
  Role,
  User,
  UserRecord,
} from "@/types";
import * as seed from "@/lib/mock/data";
import * as lfSeed from "@/lib/mock/lost-found";
import * as csSeed from "@/lib/mock/community";
import * as emSeed from "@/lib/mock/emergency";
import * as grSeed from "@/lib/mock/gov-reporting";

// Bump the version when the seed shape changes so old browser data is dropped.
const STORAGE_KEY = "cityvoice.mockdb.v6";
const SESSION_KEY = "cityvoice.session.v1";
const LATENCY_MS = 300;

export type ApiErrorCode = "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "LIMIT";

export class ApiError extends Error {
  code: ApiErrorCode;
  field?: string;
  constructor(code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

export interface MockDb {
  users: UserRecord[];
  auditLogs: AuditLogEntry[];
  incidentStatusHistory: IncidentStatusHistory[];
  // Government reporting (feature 3)
  grReports: GrReport[];
  grComments: GrComment[];
  notifications: AppNotification[];
  lfPosts: LfPost[];
  lfClaims: LfClaim[];
  lfComments: LfComment[];
  // Community & Services
  csPlaces: CsPlace[];
  csWaste: CsWasteSchedule[];
  csEdits: CsEditSuggestion[];
  csGuides: CsGuide[];
  csAnnouncements: CsAnnouncement[];
  csGroups: CsGroup[];
  csMembers: CsMember[];
  csPosts: CsPost[];
  csComments: CsComment[];
  // Emergency
  emOrganizations: EmOrganization[];
  emIncidents: EmIncident[];
  emDispatches: EmDispatch[];
  emContacts: EmTrustedContact[];
  emNews: EmNewsRelease[];
  seq: number;
}

function freshDb(): MockDb {
  return structuredClone({
    users: seed.USERS,
    auditLogs: [],
    incidentStatusHistory: [],
    grReports: grSeed.GR_REPORTS,
    grComments: grSeed.GR_COMMENTS,
    notifications: [...grSeed.GR_NOTIFICATIONS, ...lfSeed.LF_NOTIFICATIONS, ...csSeed.CS_NOTIFICATIONS, ...emSeed.EM_NOTIFICATIONS],
    lfPosts: lfSeed.LF_POSTS,
    lfClaims: lfSeed.LF_CLAIMS,
    lfComments: lfSeed.LF_COMMENTS,
    csPlaces: csSeed.CS_PLACES,
    csWaste: csSeed.CS_WASTE_SCHEDULES,
    csEdits: csSeed.CS_EDITS,
    csGuides: csSeed.CS_GUIDES,
    csAnnouncements: csSeed.CS_ANNOUNCEMENTS,
    csGroups: [...csSeed.CS_AREA_GROUPS, ...csSeed.CS_INTEREST_GROUPS],
    csMembers: csSeed.CS_MEMBERS,
    csPosts: csSeed.CS_POSTS,
    csComments: csSeed.CS_COMMENTS,
    emOrganizations: emSeed.EM_ORGANIZATIONS,
    emIncidents: emSeed.EM_INCIDENTS,
    emDispatches: emSeed.EM_DISPATCHES,
    emContacts: emSeed.EM_TRUSTED_CONTACTS,
    emNews: emSeed.EM_NEWS_RELEASES,
    seq: 5000,
  });
}

const isBrowser = typeof window !== "undefined";
let db: MockDb | null = null;

export function load(): MockDb {
  if (db) return db;
  if (isBrowser) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        db = JSON.parse(raw) as MockDb;
        if (!db.emOrganizations || !db.emOrganizations.length) {
          db.emOrganizations = structuredClone(emSeed.EM_ORGANIZATIONS);
        }
        return db;
      }
    } catch {
      /* storage blocked or corrupt: fall back to seed */
    }
  }
  return (db = freshDb());
}

export function save() {
  if (!isBrowser || !db) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err: any) {
    if (
      err?.name === "QuotaExceededError" ||
      err?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.message?.toLowerCase().includes("quota")
    ) {
      throw new ApiError(
        "LIMIT",
        "Storage quota exceeded. Report draft is preserved in memory. Please remove some photos.",
        "storage"
      );
    }
    /* ignore other minor storage errors */
  }
}

export function resetMockDb() {
  db = freshDb();
  save();
  clearSession();
}

export function nextId(prefix: string) {
  const d = load();
  d.seq += 1;
  return `${prefix}-${d.seq}`;
}

export const delay = <T>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), LATENCY_MS));
export const now = () => new Date().toISOString();

/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- drops password */
export const toUser = ({ password: _password, ...user }: UserRecord): User => user;

export const findUser = (id: string) => load().users.find((u) => u.id === id);

// ---------- session ----------

export function readSession(): AuthSession | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(user: UserRecord): AuthSession {
  const session: AuthSession = { token: `mock-token-${user.id}`, user: toUser(user) };
  if (isBrowser) {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }
  return session;
}

export function clearSession() {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Logged-in user or null (for endpoints visitors can also call). */
export function currentUser(): UserRecord | null {
  const s = readSession();
  return (s && findUser(s.user.id)) || null;
}

export function requireUser(roles?: Role[]): UserRecord {
  const user = currentUser();
  if (!user) throw new ApiError("UNAUTHORIZED", "Please log in first");
  if (roles && !roles.includes(user.role)) throw new ApiError("FORBIDDEN", "Not allowed");
  return user;
}

export function notify(n: Omit<AppNotification, "id" | "read" | "createdAt">) {
  load().notifications.unshift({ ...n, id: nextId("n"), read: false, createdAt: now() });
}

export function recordAudit(
  actor: { id: string; role: Role } | UserRecord,
  action: string,
  targetType: "INCIDENT" | "DISPATCH" | "CONTACT" | "ALERT" | "USER" | "ORGANIZATION",
  targetId: string,
  details?: Record<string, unknown> | string
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: nextId("audit"),
    actorId: actor.id,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    timestamp: now(),
    details,
  };
  load().auditLogs.push(entry);
  save();
  return entry;
}

export function recordStatusHistory(
  incidentId: string,
  actor: { id: string; role: Role | "SYSTEM" } | string,
  fromStatus: string,
  toStatus: string,
  note?: string,
  organizationId?: string
): IncidentStatusHistory {
  const actorId = typeof actor === "string" ? actor : actor.id;
  const actorRole = typeof actor === "string" ? "SYSTEM" : actor.role;
  const entry: IncidentStatusHistory = {
    id: nextId("ish"),
    incidentId,
    actorId,
    actorRole,
    fromStatus,
    toStatus,
    timestamp: now(),
    note,
    organizationId,
  };
  load().incidentStatusHistory.push(entry);
  save();
  return entry;
}

/**
 * Canonical E.164 phone normalization for Cambodia:
 * Accepts 0xx, +855xx, or 855xx; returns canonical +855XXXXXXXX format.
 * Validates subscriber number has 8 or 9 digits.
 */
export function toE164Phone(input: string): string | null {
  if (!input) return null;
  const cleaned = input.trim().replace(/[\s\-()]/g, "");
  let digits = "";
  if (cleaned.startsWith("+855")) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith("855")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    digits = cleaned.slice(1);
  } else {
    return null;
  }
  // Cambodian subscriber numbers are 8 or 9 digits, starting with 1-9
  return /^[1-9]\d{7,8}$/.test(digits) ? `+855${digits}` : null;
}

/** Local 0xx phone normalization for existing accounts and Core auth compatibility */
export function normalizePhone(input: string): string | null {
  const e164 = toE164Phone(input);
  if (!e164) return null;
  return "0" + e164.slice(4);
}

/** Helper to display a phone number in standard Cambodian 0xx format if needed */
export function toLocalPhone(phone: string): string {
  const norm = normalizePhone(phone);
  return norm ?? phone;
}
