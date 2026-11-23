import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

// Every citizen screen lives in this route group and gets the shell:
// navbar (all sizes), bottom tabs + SOS (phone).
// Put full-screen flows that should hide the nav (login, SOS steps) outside (app).
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
