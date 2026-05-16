import type { ElementType, ReactNode } from "react";

type CardProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  variant?: "panel" | "route" | "hero";
};

const variantClassNames: Record<NonNullable<CardProps["variant"]>, string> = {
  panel: "rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] p-6",
  route: "rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] p-5 grid gap-3",
  hero: "rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] p-6 sm:p-8",
};

export function Card({
  as,
  children,
  className,
  variant = "panel",
}: CardProps) {
  const Component = as ?? "article";
  const classes = [variantClassNames[variant], className].filter(Boolean).join(" ");

  return <Component className={classes}>{children}</Component>;
}
