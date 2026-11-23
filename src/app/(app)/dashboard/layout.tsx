import { Suspense, type ReactNode } from "react";
import { MeShell } from "@/features/dashboard/userDashboard/MeShell";

// "Me" area: overview, activity, profile. Lives inside the shared app shell (navbar, tabs, SOS);
// MeShell only adds the greeting and in-page tabs. MeShell reads the URL, hence Suspense.
export default function MeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <MeShell>{children}</MeShell>
    </Suspense>
  );
}
