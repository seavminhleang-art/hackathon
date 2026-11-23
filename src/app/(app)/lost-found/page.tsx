import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { ListScreen } from "@/features/lost-found/ListScreen";

export const instant = false;

export default function LostFoundPage() {
  return (
    <Suspense fallback={<PageContainer><SkeletonRows rows={4} /></PageContainer>}>
      <ListScreen />
    </Suspense>
  );
}
