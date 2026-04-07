import type { ElementType, ReactNode } from "react";

type CardProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  variant?: "panel" | "route" | "hero";
};

const variantClassNames: Record<NonNullable<CardProps["variant"]>, string> = {
  panel: "panel",
  route: "route-card",
  hero: "page-hero",
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
