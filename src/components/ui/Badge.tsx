import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "warning" | "danger" | "success" | "info" | "secondary";
  children: React.ReactNode;
}

export function Badge({ children, variant = "default", className = "", ...props }: BadgeProps) {
  const styles: Record<string, string> = {
    default: "bg-sand-deep text-ink-muted border-line",
    warning: "bg-reported-tint text-reported-ink border-reported/30 ",
    danger: "bg-danger-tint text-danger border-danger/30",
    success: "bg-fixed-tint text-fixed-ink border-fixed/30 ",
    info: "bg-primary-tint text-primary border-primary/30",
    secondary: "bg-surface text-ink-muted border-line",
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
