// In-memory mock database shared by all mock API modules.
// Saved to localStorage in the browser so data survives a reload.
// Call resetMockDb() to go back to the seed data.

import type { AppNotification, AuthSession, LfClaim, LfComment, LfPost, Report, Role, User, UserRecord } from "@/types";
import * as seed from "@/lib/mock/data";
import * as lfSeed from "@/lib/mock/lost-found";

// Bump the version when the seed shape changes so old browser data is dropped.
const STORAGE_KEY = "cityvoice.mockdb.v2";
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
  reports: Report[];
  notifications: AppNotification[];
  lfPosts: LfPost[];
  lfClaims: LfClaim[];
  lfComments: LfComment[];
  seq: number;
}

function freshDb(): MockDb {
  return structuredClone({
    users: seed.USERS,
    reports: seed.REPORTS,
    notifications: [...seed.NOTIFICATIONS, ...lfSeed.LF_NOTIFICATIONS],
    lfPosts: lfSeed.LF_POSTS,
    lfClaims: lfSeed.LF_CLAIMS,
    lfComments: lfSeed.LF_COMMENTS,
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

/** Accepts 0XXXXXXXX(X) or +855XXXXXXXX(X); returns local 0-prefixed form. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  const local = digits.startsWith("+855")
    ? "0" + digits.slice(4)
    : digits.startsWith("855")
      ? "0" + digits.slice(3)
      : digits;
  return /^0\d{8,9}$/.test(local) ? local : null;
}
