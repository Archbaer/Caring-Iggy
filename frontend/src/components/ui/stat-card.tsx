import type { ReactNode } from "react";
import Link from "next/link";

type StatCardProps = {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  eyebrow: string;
  value: number;
  singular: string;
  plural: string;
  subtext: string;
  href: string;
  hint: string;
  twoActions?: { label: string; href: string };
};

export function StatCard({
  icon,
  iconBg,
  iconColor,
  eyebrow,
  value,
  singular,
  plural,
  subtext,
  href,
  hint,
  twoActions,
}: StatCardProps) {
  const label = value === 1 ? singular : plural;

  return (
    <Link
      href={href}
      className="ci-stat-card group flex flex-col rounded-2xl border border-[var(--color-border)] p-6 gap-4 animate-fade-up"
    >
      {/* Centered icon badge */}
      <div className="flex flex-col items-center gap-3">
        <div className={`ci-stat-icon-badge ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">
          {eyebrow}
        </p>
      </div>

      {/* Stat number */}
      <div className="text-center">
        <div className="font-[family-name:var(--font-display)] text-7xl font-medium text-[var(--color-ink)] tracking-[-0.04em] leading-[0.9]">
          {value}
        </div>
        <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
          {label}
        </p>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)] leading-relaxed">
          {subtext}
        </p>
      </div>

      {/* Bottom action hint / dual buttons */}
      <div className="mt-auto pt-2 border-t border-[var(--color-border)]">
        {twoActions ? (
          <div className="flex gap-2">
            <Link
              href={twoActions.href}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center text-xs font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] hover:text-[var(--color-accent)] active:scale-95 transition-all duration-200"
            >
              {twoActions.label}
            </Link>
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center text-xs font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] hover:text-[var(--color-accent)] active:scale-95 transition-all duration-200"
            >
              {hint}
            </Link>
          </div>
        ) : (
          <p className="text-center text-xs font-medium text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent)] transition-colors duration-200">
            {hint}
          </p>
        )}
      </div>
    </Link>
  );
}
