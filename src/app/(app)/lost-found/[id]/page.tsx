import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { PostDetail } from "@/features/lost-found/PostDetail";

// The post id is only known at request time, so the screen streams in behind a skeleton.
export default function Page() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <SkeletonRows rows={4} />
        </PageContainer>
      }
    >
      <PostDetail />
    </Suspense>
  );
}
