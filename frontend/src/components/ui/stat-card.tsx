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
  links: Array<{ label: string; href: string }>;
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
  links,
}: StatCardProps) {
  const label = value === 1 ? singular : plural;

  return (
    <div className="ci-staff-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-8 flex flex-col gap-6 animate-fade-up">
      {/* Header row: icon badge + eyebrow */}
      <div className="flex items-center gap-3">
        <div className={`ci-stat-icon-badge ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">
          {eyebrow}
        </p>
      </div>

      {/* Stat number */}
      <div className="text-center py-2">
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

      {/* Action links */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-center text-xs font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-pale)] hover:text-[var(--color-accent)] active:scale-95 transition-all duration-200"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}