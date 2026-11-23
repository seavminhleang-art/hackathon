// Core mock API: auth, notifications, reference data (provinces, cities, hotlines).
// Features: ./lost-found-api.ts (api.lf), ./emergency-api.ts (api.em),
// ./gov-reporting-api.ts (api.gr), ./community-api.ts (api.cs).

import type { AppNotification, AuthSession, CodeChannel, GoogleProfile, LoginInput, RegisterInput, User, UserRecord } from "@/types";
import * as seed from "@/lib/mock/data";
import { findCity, findProvince } from "@/lib/mock/locations";
import {
  ApiError,
  clearSession,
  currentUser,
  delay,
  load,
  nextId,
  normalizePhone,
  now,
  requireUser,
  save,
  toUser,
  writeSession,
} from "./mock-db";

export { ApiError, normalizePhone, readSession, resetMockDb } from "./mock-db";

// ---------- auth ----------
// Accounts have a username, first + last name, email and password (or Google).
// Log in with email, phone or username + password, with Google, or with a one-time
// code sent by email or Telegram. Sign-up is confirmed with a code (Google sign-ups
// skip it: Google already verified the email).

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const displayName = (firstName: string, lastName: string) => `${lastName} ${firstName}`.trim();

/** Find a user by email, phone or username (case-insensitive for email/username). */
function findByIdentifier(identifier: string): UserRecord | undefined {
  const id = identifier.trim().toLowerCase();
  if (!id) return undefined;
  const users = load().users;
  if (id.includes("@")) return users.find((u) => u.email?.toLowerCase() === id);
  const phone = normalizePhone(id);
  return (phone && users.find((u) => u.phone === phone)) || users.find((u) => u.username === id);
}

/** Validates a sign-up and returns the cleaned values. Throws field-level ApiErrors. */
function checkSignup(input: RegisterInput) {
  const users = load().users;
  const username = input.username?.trim().toLowerCase() ?? "";
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const provider = input.provider ?? "PASSWORD";
  if (!USERNAME_RE.test(username)) throw new ApiError("VALIDATION", "Username: 3–20 of a–z, 0–9, _ or .", "username");
  if (users.some((u) => u.username === username)) throw new ApiError("CONFLICT", "Username taken", "username");
  if (!firstName) throw new ApiError("VALIDATION", "First name is required", "firstName");
  if (!lastName) throw new ApiError("VALIDATION", "Last name is required", "lastName");
  if (!EMAIL_RE.test(email)) throw new ApiError("VALIDATION", "Invalid email", "email");
  if (users.some((u) => u.email?.toLowerCase() === email)) throw new ApiError("CONFLICT", "Email already registered", "email");
  let phone: string | undefined;
  if (input.phone?.trim()) {
    phone = normalizePhone(input.phone) ?? undefined;
    if (!phone) throw new ApiError("VALIDATION", "Phone must look like 012345678", "phone");
    if (users.some((u) => u.phone === phone)) throw new ApiError("CONFLICT", "Phone already registered", "phone");
  }
  if (provider === "PASSWORD" && (!input.password || input.password.length < 8))
    throw new ApiError("VALIDATION", "Password must be at least 8 characters", "password");
  if (!findProvince(input.provinceId)) throw new ApiError("VALIDATION", "Choose a province", "provinceId");
  if (findCity(input.cityId)?.provinceId !== input.provinceId) throw new ApiError("VALIDATION", "Choose a city", "cityId");
  return { username, firstName, lastName, email, phone, provider };
}

function createUser(input: RegisterInput): AuthSession {
  const v = checkSignup(input);
  const user: UserRecord = {
    id: nextId("u"),
    username: v.username,
    firstName: v.firstName,
    lastName: v.lastName,
    fullName: displayName(v.firstName, v.lastName),
    phone: v.phone,
    email: v.email,
    authProvider: v.provider,
    role: "CITIZEN", // self-registration is always citizen
    provinceId: input.provinceId,
    cityId: input.cityId,
    sangkat: input.sangkat?.trim() || undefined,
    preferredLocale: input.preferredLocale ?? "km",
    createdAt: now(),
    password: v.provider === "PASSWORD" ? input.password : undefined,
  };
  load().users.push(user);
  save();
  return writeSession(user);
}

/** Direct sign-up without a code (used by tests and by Google sign-up). */
export async function register(input: RegisterInput): Promise<AuthSession> {
  return delay(createUser(input));
}

export async function login({ identifier, password }: LoginInput): Promise<AuthSession> {
  const user = findByIdentifier(identifier ?? "");
  if (!user || !user.password || user.password !== password) throw new ApiError("UNAUTHORIZED", "Wrong email/phone or password");
  return delay(writeSession(user));
}

// ---------- one-time codes (mock) ----------
// The real backend emails the code or sends it through a Telegram bot. The mock returns
// it as `demoCode` so the demo works without either. Codes live in memory only, expire
// after 5 minutes, allow 5 wrong tries and work once.

export type CodePurpose = "LOGIN" | "SIGNUP";
export interface CodeSent {
  channel: CodeChannel;
  /** Masked destination for the UI, e.g. "da•••@example.com" or "Telegram · +855 12 ••• 001". */
  sentTo: string;
  expiresInSec: number;
  /** Seconds before "send again" is allowed. */
  resendInSec: number;
  /** Mock only: the code, so the demo works without email/Telegram. Never returned by the real API. */
  demoCode: string;
}

const CODE_TTL_MS = 5 * 60_000;
const CODE_MAX_TRIES = 5;
const codes = new Map<string, { code: string; purpose: CodePurpose; expires: number; tries: number }>();

const maskPhone = (local: string) => `+855 ${local.slice(1, 3)} ••• ${local.slice(-3)}`;
const maskEmail = (email: string) => { const [n, d] = email.split("@"); return `${n.slice(0, 2)}•••@${d}`; };
const toLatinDigits = (s: string) => s.replace(/[\u17E0-\u17E9]/g, (d) => String(d.charCodeAt(0) - 0x17e0));

function issueCode(key: string, purpose: CodePurpose, channel: CodeChannel, dest: { email?: string; phone?: string }): CodeSent {
  if (channel === "TELEGRAM" && !dest.phone)
    throw new ApiError("VALIDATION", "Telegram needs a phone number on the account", "channel");
  if (channel === "EMAIL" && !dest.email) throw new ApiError("VALIDATION", "No email on the account", "channel");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(key, { code, purpose, expires: Date.now() + CODE_TTL_MS, tries: 0 });
  const sentTo = channel === "EMAIL" ? maskEmail(dest.email!) : `Telegram · ${maskPhone(dest.phone!)}`;
  return { channel, sentTo, expiresInSec: CODE_TTL_MS / 1000, resendInSec: 60, demoCode: code };
}

function checkCode(key: string, purpose: CodePurpose, input: string) {
  const entry = codes.get(key);
  if (!entry || entry.purpose !== purpose || entry.expires < Date.now())
    throw new ApiError("VALIDATION", "Code expired. Send a new one.", "code");
  if (entry.tries >= CODE_MAX_TRIES) throw new ApiError("LIMIT", "Too many tries. Send a new code.", "code");
  if (toLatinDigits(input.replace(/\s/g, "")) !== entry.code) {
    entry.tries += 1;
    throw new ApiError("VALIDATION", "Wrong code", "code");
  }
  codes.delete(key);
}

/** Passwordless login, step 1: send a code to the account's email or Telegram. */
export async function requestLoginCode(identifier: string, channel: CodeChannel): Promise<CodeSent> {
  const user = findByIdentifier(identifier);
  if (!user) throw new ApiError("NOT_FOUND", "No account with this email or phone", "identifier");
  return delay(issueCode(`login:${user.id}`, "LOGIN", channel, user));
}

export async function loginWithCode(identifier: string, code: string): Promise<AuthSession> {
  const user = findByIdentifier(identifier);
  if (!user) throw new ApiError("NOT_FOUND", "No account with this email or phone", "identifier");
  checkCode(`login:${user.id}`, "LOGIN", code);
  return delay(writeSession(user));
}

/** Sign-up, last step: validate everything, then send the confirmation code. */
export async function requestSignupCode(input: RegisterInput, channel: CodeChannel): Promise<CodeSent> {
  const v = checkSignup(input);
  return delay(issueCode(`signup:${v.email}`, "SIGNUP", channel, v));
}

export async function registerWithCode(input: RegisterInput & { code: string }): Promise<AuthSession> {
  const v = checkSignup(input);
  checkCode(`signup:${v.email}`, "SIGNUP", input.code);
  return delay(createUser(input));
}

// ---------- Google (mock) ----------

/** Demo Google accounts for the account chooser. The real app uses Google Identity Services. */
export const DEMO_GOOGLE_ACCOUNTS: GoogleProfile[] = [
  { email: "dara@example.com", firstName: "ដារ៉ា", lastName: "សុខ" },
  { email: "new.resident@example.com", firstName: "Sreyneang", lastName: "Chan" },
];

/**
 * Log in with Google. Existing email → signed in. New email → NOT_FOUND, and the UI
 * continues sign-up with `register({ ..., provider: "GOOGLE" })` (no password, no code).
 */
export async function loginWithGoogle(profile: GoogleProfile): Promise<AuthSession> {
  const user = load().users.find((u) => u.email?.toLowerCase() === profile.email.toLowerCase());
  if (!user) throw new ApiError("NOT_FOUND", "No account for this Google email yet", "google");
  return delay(writeSession(user));
}

export async function logout(): Promise<void> {
  clearSession();
  return delay(undefined);
}

export async function me(): Promise<User | null> {
  const u = currentUser();
  return delay(u ? toUser(u) : null);
}

export type ProfileUpdate = Pick<User, "fullName" | "phone" | "provinceId" | "cityId" | "preferredLocale"> & Pick<User, "email" | "sangkat">;

export async function updateProfile(input: ProfileUpdate): Promise<User> {
  const user = requireUser();
  const fullName = input.fullName.trim();
  const phone = input.phone?.trim() ? normalizePhone(input.phone) : undefined;
  const email = input.email?.trim() || undefined;
  if (fullName.length < 2) throw new ApiError("VALIDATION", "Name is required", "fullName");
  if (phone === null) throw new ApiError("VALIDATION", "Phone must look like 012345678", "phone");
  if (phone && load().users.some((other) => other.id !== user.id && other.phone === phone))
    throw new ApiError("CONFLICT", "Phone already registered", "phone");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new ApiError("VALIDATION", "Invalid email", "email");
  if (!findProvince(input.provinceId) || findCity(input.cityId)?.provinceId !== input.provinceId)
    throw new ApiError("VALIDATION", "Choose a province and city", "cityId");

  if (fullName !== user.fullName) {
    const [last, ...rest] = fullName.split(" ");
    user.lastName = last;
    user.firstName = rest.join(" ") || last;
  }
  user.fullName = fullName;
  user.phone = phone;
  user.email = email;
  user.provinceId = input.provinceId;
  user.cityId = input.cityId;
  user.sangkat = input.sangkat?.trim() || undefined;
  user.preferredLocale = input.preferredLocale;
  save();
  return delay(writeSession(user).user);
}

// ---------- notifications ----------

export async function myNotifications(): Promise<AppNotification[]> {
  const u = requireUser();
  return delay(
    load()
      .notifications.filter((n) => n.userId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function unreadCount(): Promise<number> {
  const u = currentUser();
  return delay(u ? load().notifications.filter((n) => n.userId === u.id && !n.read).length : 0);
}

export async function markNotificationRead(id: string): Promise<void> {
  const u = requireUser();
  const n = load().notifications.find((x) => x.id === id && x.userId === u.id);
  if (n) n.read = true;
  save();
  return delay(undefined);
}

// ---------- reference data ----------

export const getProvinces = async () => delay(seed.PROVINCES);
export const getCities = async (provinceId?: string) =>
  delay(seed.CITIES.filter((c) => !provinceId || c.provinceId === provinceId));
export const getEmergencyHotlines = async () => delay(seed.EMERGENCY_HOTLINES);
