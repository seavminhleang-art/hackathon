import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportDetailView } from "@/features/gov-reporting/ReportDetailView";
import { ReportHeader } from "@/features/gov-reporting/ReportHeader";
import { ReportMobileNav } from "@/features/gov-reporting/ReportMobileNav";
import { GR_REPORTS } from "@/lib/mock/gov-reporting";

const extraDemoCodes = [
  "RPT-2026-00031",
  "RPT-2026-00024",
  "RPT-2026-00018",
];

export function generateStaticParams() {
  const codes = new Set([...GR_REPORTS.map((report) => report.code), ...extraDemoCodes]);
  return Array.from(codes, (code) => ({ code }));
}

export default function ReportDetailPage({ params }: PageProps<"/reports/[code]">) {
  return (
    <>
      <ReportHeader />
      <Suspense fallback={<div className="mx-auto min-h-96 w-full max-w-7xl animate-pulse p-6" />}>
        <ReportDetailRoute params={params} />
      </Suspense>
      <ReportMobileNav />
    </>
  );
}

async function ReportDetailRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const report = GR_REPORTS.find((item) => item.code === code);
  if (!report && !extraDemoCodes.includes(code)) notFound();
  return <ReportDetailView code={code} />;
}
