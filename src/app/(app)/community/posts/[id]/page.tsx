import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui";
import { PostScreen } from "@/features/community/PostScreen";

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
      <PostScreen />
    </Suspense>
  );
}
