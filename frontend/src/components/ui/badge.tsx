import type { ReactNode } from "react";

type BadgeVariant = "available" | "pending" | "adopted" | "muted" | "accent" | "admin" | "staff" | "volunteer";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  available:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] px-2.5 py-1 text-xs font-medium",
  pending:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)] px-2.5 py-1 text-xs font-medium",
  adopted:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-pale)] text-[var(--color-primary)] px-2.5 py-1 text-xs font-medium",
  muted:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-warm)] text-[var(--color-ink-faint)] px-2.5 py-1 text-xs font-medium",
  accent:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-pale)] text-[var(--color-accent)] px-2.5 py-1 text-xs font-medium",
  admin:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-pale)] text-[var(--color-primary)] px-2.5 py-1 text-xs font-medium",
  staff:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-pale)] text-[var(--color-accent)] px-2.5 py-1 text-xs font-medium",
  volunteer:
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)] px-2.5 py-1 text-xs font-medium",
};

export function Badge({ variant = "muted", children, className }: BadgeProps) {
  const classes = [variantClasses[variant], className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
