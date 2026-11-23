import { Suspense } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { SkeletonRows } from "@/components/ui";
import { OfficeScreen } from "@/features/community/ServicesScreens";
export default function DashboardServiceDetailPage() { return <Suspense fallback={<PageContainer><SkeletonRows rows={4} /></PageContainer>}><OfficeScreen /></Suspense>; }
