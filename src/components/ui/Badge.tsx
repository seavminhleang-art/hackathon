import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "warning" | "danger" | "success" | "info" | "secondary";
  children: React.ReactNode;
}

export function Badge({ children, variant = "default", className = "", ...props }: BadgeProps) {
  const styles: Record<string, string> = {
    default: "bg-surface-sunken text-ink-muted border-line",
    warning: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    danger: "bg-danger-soft text-danger border-danger/30",
    success: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    info: "bg-primary-soft text-primary border-primary/30",
    secondary: "bg-surface text-ink-subtle border-line",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-semibold transition-colors ${
        styles[variant] || styles.default
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
