import Link from "next/link";

export type FilterChipProps = {
  label: string;
  href: string;
  isActive: boolean;
};

export function FilterChip({ label, href, isActive }: FilterChipProps) {
  const baseClasses =
    "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200";

  const activeClasses =
    "bg-[var(--color-primary)] text-white shadow-sm font-bold";

  const inactiveClasses =
    "bg-white border border-[var(--color-border)] text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]";

  return (
    <Link href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
    </Link>
  );
}
