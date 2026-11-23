import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

/** White surface, 16px radius, soft shadow. The default container for content. */
export function Card({
  children,
  className = "",
  padded = true,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  as?: "div" | "section" | "article" | "li" | "ul" | "ol";
}) {
  return <Tag className={`rounded-2xl bg-surface shadow-card ${padded ? "p-4 lg:p-5" : ""} ${className}`}>{children}</Tag>;
}

/**
 * Feature color for icon tiles. One accent per feature so users learn where they are:
 * report = blue, lost & found = gold, services = green, community = orange, emergency = red.
 */
export type Accent = "primary" | "gold" | "fixed" | "reported" | "danger" | "neutral";

const ACCENT: Record<Accent, string> = {
  primary: "bg-primary-tint text-primary",
  gold: "bg-gold-tint text-gold-ink",
  fixed: "bg-fixed-tint text-fixed-ink",
  reported: "bg-reported-tint text-reported-ink",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-sand-deep text-ink",
};

/** Rounded square with an icon. Use at the start of list rows and feature tiles. */
export function IconTile({ icon: Icon, accent = "neutral", size = "md" }: { icon: LucideIcon; accent?: Accent; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-14 rounded-2xl" : size === "sm" ? "size-9 rounded-lg" : "size-11 rounded-xl";
  const icon = size === "lg" ? 28 : size === "sm" ? 18 : 22;
  return (
    <span className={`flex flex-none items-center justify-center ${box} ${ACCENT[accent]}`}>
      <Icon aria-hidden size={icon} />
    </span>
  );
}

/**
 * One row in a list: icon, title, optional subtitle and meta (chips), trailing chevron when it links.
 * Put rows inside <Card padded={false} as="ul"> to get dividers.
 */
export function ListRow({
  icon,
  accent,
  title,
  subtitle,
  meta,
  href,
  trailing,
  media,
  children,
}: {
  icon?: LucideIcon;
  /** Replaces the icon tile, e.g. a <Thumb> photo. */
  media?: ReactNode;
  accent?: Accent;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Chips, counts. Shown under the subtitle. */
  meta?: ReactNode;
  href?: string;
  trailing?: ReactNode;
  /** Extra content under the row (e.g. an action button). Kept outside the link. */
  children?: ReactNode;
}) {
  const head = (
    <>
      {media ?? (icon && <IconTile icon={icon} accent={accent} />)}
      <span className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        <span className="text-row leading-snug font-semibold text-ink">{title}</span>
        {subtitle && <span className="text-meta leading-snug text-ink-muted">{subtitle}</span>}
      </span>
      {trailing ?? (href && <ChevronRight aria-hidden size={20} className="mt-2.5 flex-none text-ink-muted" />)}
    </>
  );
  return (
    <li className="list-none border-b border-line px-4 py-4 last:border-b-0 lg:px-5">
      {href ? (
        <Link href={href} className="-m-1 flex items-start gap-3 rounded-xl p-1 hover:bg-sand">
          {head}
        </Link>
      ) : (
        <div className="flex items-start gap-3">{head}</div>
      )}
      {(meta || children) && (
        <div className={`mt-2.5 flex flex-col gap-3 ${media ? "pl-15" : icon ? "pl-14" : ""}`}>
          {meta && <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">{meta}</div>}
          {children}
        </div>
      )}
    </li>
  );
}
