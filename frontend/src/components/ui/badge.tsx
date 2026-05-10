import type { ReactNode } from "react";

type BadgeVariant = "available" | "pending" | "adopted" | "muted" | "accent" | "admin" | "staff" | "volunteer";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  available:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] text-white px-3 py-1 text-xs font-bold shadow-sm",
  pending:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] text-white px-3 py-1 text-xs font-bold shadow-sm",
  adopted:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success)] text-white px-3 py-1 text-xs font-bold shadow-sm",
  muted:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-pale)] text-[var(--color-primary)] px-3 py-1 text-xs font-bold shadow-sm",
  accent:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-pale)] text-[var(--color-accent)] px-3 py-1 text-xs font-bold shadow-sm",
  admin:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-pale)] text-[var(--color-primary)] px-3 py-1 text-xs font-bold shadow-sm",
  staff:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-pale)] text-[var(--color-accent)] px-2.5 py-0.5 text-xs",
  volunteer:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)] px-3 py-1 text-xs font-bold shadow-sm",
};

export function Badge({ variant = "muted", children, className }: BadgeProps) {
  const classes = [variantClasses[variant], className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
