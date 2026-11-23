import { PageContainer } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui";

// Instant fallback while any (app) screen streams in. The shell (navbar, SOS) stays interactive.
export default function Loading() {
  return (
    <PageContainer>
      <PageSkeleton />
    </PageContainer>
  );
}
