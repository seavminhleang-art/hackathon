"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import loadingIcon from "react-useanimations/lib/loading";
import { AnimatedIcon, type AnimatedIconData } from "./AnimatedIcon";

/**
 * Button / link-button. One primary per screen.
 * - primary:   main action (blue, filled)
 * - secondary: other actions (white, blue outline)
 * - ghost:     low-emphasis text actions ("See all")
 * - danger:    emergency only (SOS, call 117/118/119)
 * All sizes keep a 48px minimum touch target except `sm` (44px, use in dense rows).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-card",
  secondary: "bg-surface text-primary-ink ring-1 ring-inset ring-primary/35 hover:bg-primary-tint",
  ghost: "text-primary-ink hover:bg-primary-tint",
  danger: "bg-danger text-white hover:bg-danger-hover shadow-card",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-meta gap-1.5 rounded-xl",
  md: "min-h-12 px-5 text-body gap-2 rounded-xl",
  lg: "min-h-14 px-6 text-row gap-2.5 rounded-xl",
};

const BASE =
  "inline-flex items-center justify-center font-semibold transition-colors select-none disabled:pointer-events-none disabled:opacity-45";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A lucide icon, or an animated one from `react-useanimations/lib/<name>` (plays on hover / click). */
  icon?: LucideIcon | AnimatedIconData;
  /** For click-toggle animated icons (thumbUp, star…): true shows the end state. */
  iconActive?: boolean;
  /** Icon after the label (e.g. chevron). */
  trailingIcon?: LucideIcon;
  block?: boolean;
  /** Busy: swaps the icon for a spinner, disables the button and sets aria-busy. Keep the label. */
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonProps = CommonProps & Omit<ComponentProps<"button">, "className" | "children">;
type LinkButtonProps = CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "className" | "children" | "href">;

function Inner({ icon: Icon, iconActive, trailingIcon: Trailing, children, size, loading }: CommonProps) {
  const s = size === "lg" ? 22 : size === "sm" ? 18 : 20;
  return (
    <>
      {loading ? (
        <AnimatedIcon animation={loadingIcon} size={s} />
      ) : Icon && "animationData" in Icon ? (
        <AnimatedIcon animation={Icon} size={s} active={iconActive} />
      ) : Icon ? (
        <Icon aria-hidden size={s} className="flex-none" />
      ) : null}
      <span className="min-w-0">{children}</span>
      {Trailing && <Trailing aria-hidden size={s} className="flex-none" />}
    </>
  );
}

export function Button({ variant, size, icon, iconActive, trailingIcon, block, loading, children, className = "", type = "button", disabled, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, `${block ? "w-full" : ""} ${className}`)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner icon={icon} iconActive={iconActive} trailingIcon={trailingIcon} size={size} loading={loading}>
        {children}
      </Inner>
    </button>
  );
}

export function LinkButton({ variant, size, icon, iconActive, trailingIcon, block, loading, children, className = "", ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, `${block ? "w-full" : ""} ${className}`)} {...rest}>
      <Inner icon={icon} iconActive={iconActive} trailingIcon={trailingIcon} size={size} loading={loading}>
        {children}
      </Inner>
    </Link>
  );
}
