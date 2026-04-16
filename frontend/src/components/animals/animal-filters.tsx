import Link from "next/link";

import type { AnimalStatusCode } from "@/lib/types";

type AnimalFiltersProps = {
  status?: AnimalStatusCode;
  type?: string;
};

export function AnimalFilters({ status, type }: AnimalFiltersProps) {
  return (
    <div className="ci-card" style={{ padding: "var(--space-5)" }}>
      <p className="ci-label" style={{ marginBottom: "var(--space-4)" }}>Filter</p>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "var(--space-2)" }}>Status</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {[{ value: "", label: "All" }, { value: "AVAILABLE", label: "Available" }, { value: "PENDING", label: "Pending" }].map((opt) => (
            <Link
              key={opt.value}
              href={opt.value ? `/animals?status=${opt.value}` : "/animals"}
              className={`ci-btn ci-btn--sm ${status === opt.value ? "ci-btn--primary" : "ci-btn--ghost-sm"}`}
              style={status !== opt.value && opt.value !== "" ? { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" } : {}}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "var(--space-2)" }}>Species</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {[{ value: "", label: "All" }, { value: "DOG", label: "Dog" }, { value: "CAT", label: "Cat" }].map((opt) => (
            <Link
              key={opt.value}
              href={opt.value ? `/animals?type=${opt.value}` : "/animals"}
              className={`ci-btn ci-btn--sm ${type === opt.value ? "ci-btn--primary" : "ci-btn--ghost-sm"}`}
              style={type !== opt.value && opt.value !== "" ? { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" } : {}}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {(status || type) && (
        <Link href="/animals" className="ci-btn ci-btn--ghost ci-btn--sm" style={{ width: "100%", justifyContent: "center" }}>
          Clear filters
        </Link>
      )}
    </div>
  );
}