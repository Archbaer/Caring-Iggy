import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "chip";
  className?: string;
};

const variantClassNames: Record<NonNullable<ActionLinkProps["variant"]>, string> = {
  primary: "primary-link",
  secondary: "secondary-link",
  chip: "link-chip",
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
