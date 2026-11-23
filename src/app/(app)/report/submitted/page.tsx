import { Suspense } from "react";
import { ReportSubmitted } from "@/features/gov-reporting/ReportForm";

// Reads ?code= from the URL, which is only known at request time.
export default function Page() {
  return (
    <Suspense>
      <ReportSubmitted />
    </Suspense>
  );
}
