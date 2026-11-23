import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { GuideScreen } from "@/features/community/GuidesScreens";
export default function DashboardGuideDetailPage() { return <Suspense fallback={<PageContainer><SkeletonRows rows={4} /></PageContainer>}><GuideScreen /></Suspense>; }
