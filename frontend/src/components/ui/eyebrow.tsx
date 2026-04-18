import type { ReactNode } from "react";

type EyebrowProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Eyebrow label — mono uppercase tracked text.
 * Single source of truth replacing: ci-label, ci-section__eyebrow,
 * ci-hero__eyebrow, eyebrow CSS class, page eyebrow elements.
 */
export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <p
      className={[
        "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}
