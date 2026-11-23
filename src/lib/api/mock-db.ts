// In-memory mock database shared by all mock API modules.
// Saved to localStorage in the browser so data survives a reload.
// Call resetMockDb() to go back to the seed data.

import type {
  AppNotification,
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
  EmTrustedContact,
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
const STORAGE_KEY = "cityvoice.mockdb.v7";
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
  // Emergency (organizations and incident types are static seed data)
  emIncidents: EmIncident[];
  emDispatches: EmDispatch[];
  emContacts: EmTrustedContact[];
  emNews: EmNewsRelease[];
  seq: number;
}

function freshDb(): MockDb {
  return structuredClone({
    users: seed.USERS,
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
      if (raw) return (db = JSON.parse(raw) as MockDb);
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
  } catch {
    /* ignore */
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

/**
 * Accepts 0XXXXXXXX(X) or +855XXXXXXXX(X); returns local 0-prefixed form.
 * Khmer digits (០–៩, what Khmer keyboards type) are converted to 0–9 first;
 * spaces, dashes, dots and brackets are ignored.
 */
export function normalizePhone(input: string): string | null {
  const latin = input.replace(/[\u17E0-\u17E9]/g, (d) => String(d.charCodeAt(0) - 0x17e0));
  const digits = latin.replace(/[\s\-.()]/g, "");
  const local = digits.startsWith("+855")
    ? "0" + digits.slice(4)
    : digits.startsWith("855")
      ? "0" + digits.slice(3)
      : digits;
  return /^0\d{8,9}$/.test(local) ? local : null;
}
