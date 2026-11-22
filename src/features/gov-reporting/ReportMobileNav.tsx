"use client";

import Link from "next/link";
import { NavIcon } from "@/features/gov-reporting/ReportHeader";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ReportMobileNav() {
  const { t } = useLocale();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-end border-t border-line bg-white px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1 text-center text-[9px] leading-tight text-primary shadow-[0_-4px_16px_rgba(28,26,23,0.06)] sm:hidden" aria-label="Mobile navigation">
      <Link href="/" className="flex min-h-12 flex-col items-center justify-center gap-0.5 pb-1"><NavIcon name="home" /><span>{t.homeNav}</span></Link>
      <Link href="/me/reports" className="flex min-h-12 flex-col items-center justify-center gap-0.5 pb-1 font-semibold"><NavIcon name="report" /><span>{t.reportNav}</span></Link>
      <Link href="/sos" className="flex flex-col items-center justify-end gap-0.5 pb-1 text-danger"><span className="-mt-7 grid size-10 place-items-center rounded-full border-[3px] border-white bg-danger text-base text-white shadow-md"><NavIcon name="siren" className="size-[17px]" /></span><span className="font-semibold">SOS</span></Link>
      <a href="#services" className="flex min-h-12 flex-col items-center justify-center gap-0.5 pb-1"><NavIcon name="location" /><span>{t.location}</span></a>
      <a href="#community" className="flex min-h-12 flex-col items-center justify-center gap-0.5 pb-1"><NavIcon name="community" /><span>{t.communityNav}</span></a>
    </nav>
  );
}
