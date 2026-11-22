import type { Locale } from "@/types";

// Many Android browsers ship without Khmer locale data, so Intl falls back to
// English. Format dates ourselves, always in Cambodia time (UTC+7).

const KM_DAYS = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Date parts in Cambodia time, independent of the device time zone. */
export function cambodiaParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return {
    weekday: d.getUTCDay(),
    day: d.getUTCDate(),
    month: d.getUTCMonth(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

export function formatDateParts(iso: string, locale: Locale) {
  const p = cambodiaParts(iso);
  return {
    weekday: (locale === "km" ? KM_DAYS : EN_DAYS)[p.weekday],
    day: String(p.day),
    month: (locale === "km" ? KM_MONTHS : EN_MONTHS)[p.month],
    time: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
  };
}

const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 } as const;

/** Short weekday name for "mon" | "tue" | … */
export function weekdayLabel(day: keyof typeof WEEKDAY_INDEX, locale: Locale): string {
  return (locale === "km" ? KM_DAYS : EN_DAYS)[WEEKDAY_INDEX[day]];
}

/** "22 Nov" / "22 វិច្ឆិកា" in Cambodia time. */
export function shortDate(iso: string, locale: Locale): string {
  const p = formatDateParts(iso, locale);
  return `${p.day} ${p.month}`;
}
