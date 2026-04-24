import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "chip";
  size?: "sm" | "lg";
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
  size,
  className,
}: ActionLinkProps) {
  const chipClasses = size === "lg"
    ? "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-base font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    : variantClassNames[variant];
  const classes = [chipClasses, className].filter(Boolean).join(" ");

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
