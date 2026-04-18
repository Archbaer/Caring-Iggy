import Link from "next/link";

export type FilterPillProps = {
  label: string;
  href: string;
  isActive: boolean;
};

export function FilterPill({ label, href, isActive }: FilterPillProps) {
  const baseClasses =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200";

  const activeClasses =
    "bg-[var(--color-accent-pale)] text-[var(--color-accent)] border-[var(--color-accent)]";

  const inactiveClasses =
    "border-[var(--color-border)] text-[var(--color-ink-soft)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]";

  return (
    <Link href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
    </Link>
  );
}
