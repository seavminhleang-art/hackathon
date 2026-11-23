"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>{children}</AuthProvider>
      <ToastContainer position="top-right" autoClose={3500} newestOnTop closeOnClick pauseOnFocusLoss pauseOnHover theme="light" />
    </LocaleProvider>
  );
}
