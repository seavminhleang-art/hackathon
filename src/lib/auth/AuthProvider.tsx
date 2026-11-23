"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { LoginInput, RegisterInput, User } from "@/types";
import type { ProfileUpdate } from "@/lib/api/mock-api";

interface AuthContextValue {
  user: User | null;
  /** false until the saved session has been read on the client. */
  ready: boolean;
  login: (input: LoginInput, redirectTo?: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
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

  const register = useCallback(async (input: RegisterInput) => {
    const s = await api.register(input);
    setUser(s.user);
    router.push("/");
    return s.user;
  }, [router]);

  const updateProfile = useCallback(async (input: ProfileUpdate) => {
    const updated = await api.updateProfile(input);
    setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, register, updateProfile, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
