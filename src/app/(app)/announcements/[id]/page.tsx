import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui";
import { AnnouncementScreen } from "@/features/community/NewsScreens";

// The id is only known at request time, so the screen streams in behind a skeleton.
export default function Page() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageSkeleton variant="detail" rows={2} />
        </PageContainer>
      }
    >
      <AnnouncementScreen />
    </Suspense>
  );
}
