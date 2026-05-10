import Link from "next/link";

export type FilterPillProps = {
  label: string;
  href: string;
  isActive: boolean;
};

export function FilterPill({ label, href, isActive }: FilterPillProps) {
  const baseClasses =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-all duration-200";

  const activeClasses =
    "bg-[var(--color-primary-pale)] text-[var(--color-primary)]";

  const inactiveClasses =
    "border border-[var(--color-border)] text-[var(--color-ink-soft)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]";

  return (
    <Link href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
    </Link>
  );
}
