// Core mock API: auth, notifications, reference data (provinces, cities, hotlines).
// Features: ./lost-found-api.ts (api.lf), ./emergency-api.ts (api.em),
// ./gov-reporting-api.ts (api.gr), ./community-api.ts (api.cs).

import type { AppNotification, AuthSession, LoginInput, RegisterInput, User, UserRecord } from "@/types";
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

export async function register(input: RegisterInput): Promise<AuthSession> {
  const d = load();
  const fullName = input.fullName?.trim();
  if (!fullName || fullName.length < 2) throw new ApiError("VALIDATION", "Name is required", "fullName");
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) throw new ApiError("VALIDATION", "Phone must look like 012345678", "phone");
  if (!input.password || input.password.length < 6)
    throw new ApiError("VALIDATION", "Password must be at least 6 characters", "password");
  if (!findProvince(input.provinceId)) throw new ApiError("VALIDATION", "Choose a province", "provinceId");
  if (findCity(input.cityId)?.provinceId !== input.provinceId)
    throw new ApiError("VALIDATION", "Choose a city", "cityId");
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) throw new ApiError("VALIDATION", "Invalid email", "email");
  if (d.users.some((u) => u.phone === phone)) throw new ApiError("CONFLICT", "Phone already registered", "phone");

  const user: UserRecord = {
    id: nextId("u"),
    fullName,
    phone,
    email: input.email?.trim() || undefined,
    role: "CITIZEN", // self-registration is always citizen
    provinceId: input.provinceId,
    cityId: input.cityId,
    sangkat: input.sangkat?.trim() || undefined,
    preferredLocale: input.preferredLocale ?? "km",
    createdAt: now(),
    password: input.password,
  };
  d.users.push(user);
  save();
  return delay(writeSession(user));
}

export async function login({ phone, password }: LoginInput): Promise<AuthSession> {
  const p = normalizePhone(phone);
  const user = load().users.find((u) => (normalizePhone(u.phone) === p || u.phone === phone) && u.password === password);
  if (!user) throw new ApiError("UNAUTHORIZED", "Wrong phone or password");
  return delay(writeSession(user));
}

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string; otp: string }> {
  const norm = normalizePhone(phone);
  if (!norm) throw new ApiError("VALIDATION", "Invalid phone number", "phone");
  const otp = "123456";
  return delay({ success: true, message: `OTP sent to ${norm} (Mock: ${otp})`, otp });
}

export async function verifyOtp(phone: string, otp: string): Promise<AuthSession> {
  const norm = normalizePhone(phone);
  if (!norm) throw new ApiError("VALIDATION", "Invalid phone number", "phone");
  if (otp.trim() !== "123456") throw new ApiError("UNAUTHORIZED", "Invalid OTP code");
  let user = load().users.find((u) => normalizePhone(u.phone) === norm || u.phone === norm);
  if (!user) {
    const d = load();
    user = {
      id: nextId("u"),
      fullName: `Citizen ${norm.slice(-4)}`,
      phone: norm,
      role: "CITIZEN",
      provinceId: "phnom-penh",
      cityId: "tuol-kouk",
      preferredLocale: "km",
      createdAt: now(),
      password: "otp-login",
    };
    d.users.push(user);
    save();
  }
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
