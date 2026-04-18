import type { ReactNode } from "react";

export type FilterGroupProps = {
  label: string;
  children: ReactNode;
};

export function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-faint)] mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
