import type { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "ghost" | "white" | "accent" | "subtle" | "chip";
type ButtonSize = "sm" | "md" | "lg";

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    as?: "button";
    href?: never;
  };

type ButtonAsLink = ButtonOwnProps & {
  as: "a";
  href: string;
  target?: string;
  rel?: string;
};

type ButtonAsNextLink = ButtonOwnProps & {
  as: typeof Link;
  href: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsNextLink;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all duration-200",
  ghost:
    "rounded-full border border-[var(--color-border)] bg-transparent text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] active:scale-[0.97] transition-all duration-200",
  white:
    "rounded-full bg-white text-[var(--color-primary)] border border-white hover:bg-[var(--color-canvas)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200",
  accent:
    "rounded-full bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-deep)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all duration-200",
  subtle:
    "rounded-full bg-[var(--color-surface-warm)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-all duration-200",
  chip:
    "rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] active:scale-95 transition-all duration-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm font-medium",
  md: "px-5 py-2.5 text-sm font-semibold",
  lg: "px-8 py-4 text-base font-semibold",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [variantClasses[variant], sizeClasses[size], className]
    .filter(Boolean)
    .join(" ");

  if (props.as === "a" && "href" in props) {
    const { href, target, rel, ...rest } = props as ButtonAsLink & { href: string };
    return (
      <a href={href} target={target} rel={rel} className={classes} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    );
  }

  if (props.as === Link || (props as ButtonAsNextLink).href !== undefined) {
    const { href } = props as ButtonAsNextLink;
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonAsButton)}>
      {children}
    </button>
  );
}
