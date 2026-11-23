import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { AnnouncementScreen } from "@/features/community/NewsScreens";
export default function DashboardAnnouncementDetailPage() { return <Suspense fallback={<PageContainer><SkeletonRows rows={4} /></PageContainer>}><AnnouncementScreen /></Suspense>; }
