import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { GuideScreen } from "@/features/community/GuidesScreens";

// The id is only known at request time, so the screen streams in behind a skeleton.
export default function Page() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <SkeletonRows rows={4} />
        </PageContainer>
      }
    >
      <GuideScreen />
    </Suspense>
  );
}
