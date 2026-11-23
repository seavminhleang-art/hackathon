"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { GoogleProfile, LoginInput, RegisterInput, User } from "@/types";
import type { ProfileUpdate } from "@/lib/api/mock-api";

interface AuthContextValue {
  user: User | null;
  /** false until the saved session has been read on the client. */
  ready: boolean;
  login: (input: LoginInput, redirectTo?: string) => Promise<User>;
  register: (input: RegisterInput, redirectTo?: string) => Promise<User>;
  /** Code login (step 2, after api.requestLoginCode by email or Telegram). */
  loginWithCode: (identifier: string, code: string, redirectTo?: string) => Promise<User>;
  /** Sign-up confirmed with a code (after api.requestSignupCode). */
  registerWithCode: (input: RegisterInput & { code: string }, redirectTo?: string) => Promise<User>;
  /** Google: signs in an existing account; throws ApiError NOT_FOUND for a new email. */
  loginWithGoogle: (profile: GoogleProfile, redirectTo?: string) => Promise<User>;
  updateProfile: (input: ProfileUpdate) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.me().then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const login = useCallback(async (input: LoginInput, redirectTo = "/") => {
    const s = await api.login(input);
    setUser(s.user);
    const destination = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
    router.push(destination);
    return s.user;
  }, [router]);

  const register = useCallback(async (input: RegisterInput, redirectTo = "/") => {
    const s = await api.register(input);
    setUser(s.user);
    router.push(redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/");
    return s.user;
  }, [router]);

  const go = useCallback(
    (redirectTo: string) => router.push(redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/"),
    [router],
  );

  const loginWithCode = useCallback(
    async (identifier: string, code: string, redirectTo = "/") => {
      const s = await api.loginWithCode(identifier, code);
      setUser(s.user);
      go(redirectTo);
      return s.user;
    },
    [go],
  );

  const registerWithCode = useCallback(
    async (input: RegisterInput & { code: string }, redirectTo = "/") => {
      const s = await api.registerWithCode(input);
      setUser(s.user);
      go(redirectTo);
      return s.user;
    },
    [go],
  );

  const loginWithGoogle = useCallback(
    async (profile: GoogleProfile, redirectTo = "/") => {
      const s = await api.loginWithGoogle(profile);
      setUser(s.user);
      go(redirectTo);
      return s.user;
    },
    [go],
  );

  const updateProfile = useCallback(async (input: ProfileUpdate) => {
    const updated = await api.updateProfile(input);
    setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, register, loginWithCode, registerWithCode, loginWithGoogle, updateProfile, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
