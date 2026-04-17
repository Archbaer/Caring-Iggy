import Link from "next/link";

export type FilterChipProps = {
  label: string;
  href: string;
  isActive: boolean;
};

export function FilterChip({ label, href, isActive }: FilterChipProps) {
  const baseClasses =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200";

  const activeClasses =
    "bg-[var(--color-accent-pale)] text-[var(--color-accent)] border-[var(--color-accent)]";

  const inactiveClasses =
    "border-[var(--color-border)] bg-transparent text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]";

  return (
    <Link href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
    </Link>
  );
}
