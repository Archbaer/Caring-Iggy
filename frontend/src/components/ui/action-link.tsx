import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "chip";
  className?: string;
};

const variantClassNames: Record<NonNullable<ActionLinkProps["variant"]>, string> = {
  primary: "inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline",
  secondary: "inline-flex items-center gap-1 text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
  chip: "inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
};

export function ActionLink({
  href,
  children,
  variant = "primary",
  className,
}: ActionLinkProps) {
  const classes = [variantClassNames[variant], className].filter(Boolean).join(" ");

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
