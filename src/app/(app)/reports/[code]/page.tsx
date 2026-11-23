import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { ReportDetail } from "@/features/gov-reporting/ReportDetail";

// The code is only known at request time, so the screen streams in behind a skeleton.
export default function Page() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <SkeletonRows rows={4} />
        </PageContainer>
      }
    >
      <ReportDetail />
    </Suspense>
  );
}
