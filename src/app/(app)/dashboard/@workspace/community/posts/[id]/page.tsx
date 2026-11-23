import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { PostScreen } from "@/features/community/PostScreen";
export default function DashboardCommunityPostPage() { return <Suspense fallback={<PageContainer><SkeletonRows rows={4} /></PageContainer>}><PostScreen /></Suspense>; }
