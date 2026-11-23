import type { ReactNode } from "react";
import { DashboardShell } from "@/features/dashboard/userDashboard/DashboardShell";

export default function DashboardLayout({ children, workspace }: { children: ReactNode; workspace: ReactNode }) {
  return <DashboardShell><>{children}{workspace}</></DashboardShell>;
}
