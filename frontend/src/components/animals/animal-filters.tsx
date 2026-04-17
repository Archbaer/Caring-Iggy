import Link from "next/link";

import type { AnimalStatusCode } from "@/lib/types";

type AnimalFiltersProps = {
  status?: AnimalStatusCode;
  type?: string;
  sex?: string;
  size?: string;
};

function buildAnimalsHref(filters: {
  status?: string;
  type?: string;
  sex?: string;
  size?: string;
}): string {
  const query = new URLSearchParams();

  if (filters.status) query.set("status", filters.status);
  if (filters.type) query.set("type", filters.type);
  if (filters.sex) query.set("sex", filters.sex);
  if (filters.size) query.set("size", filters.size);

  const serialized = query.toString();

  return serialized ? `/animals?${serialized}` : "/animals";
}

export function AnimalFilters({ status, type, sex, size }: AnimalFiltersProps) {
  const current = { status, type, sex, size };

  return (
    <div className="ci-card" style={{ padding: "var(--space-5)" }}>
      <p className="ci-label" style={{ marginBottom: "var(--space-4)" }}>Filter</p>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "var(--space-2)" }}>Status</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {[{ value: "", label: "All" }, { value: "AVAILABLE", label: "Available" }, { value: "PENDING", label: "Pending" }].map((opt) => (
            <Link
              key={opt.value}
              href={buildAnimalsHref({ ...current, status: opt.value || undefined })}
              className={`ci-btn ci-btn--sm ${(!opt.value && !status) || status === opt.value ? "ci-btn--primary" : "ci-btn--ghost-sm"}`}
              style={status !== opt.value && (opt.value !== "" || status) ? { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" } : {}}
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
              href={buildAnimalsHref({ ...current, type: opt.value || undefined })}
              className={`ci-btn ci-btn--sm ${(!opt.value && !type) || type === opt.value ? "ci-btn--primary" : "ci-btn--ghost-sm"}`}
              style={type !== opt.value && (opt.value !== "" || type) ? { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" } : {}}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "var(--space-2)" }}>Sex</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {[{ value: "", label: "All" }, { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "UNKNOWN", label: "Unknown" }].map((opt) => (
            <Link
              key={opt.value}
              href={buildAnimalsHref({ ...current, sex: opt.value || undefined })}
              className={`ci-btn ci-btn--sm ${(!opt.value && !sex) || sex === opt.value ? "ci-btn--primary" : "ci-btn--ghost-sm"}`}
              style={sex !== opt.value && (opt.value !== "" || sex) ? { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" } : {}}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "var(--space-2)" }}>Size</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {[{ value: "", label: "All" }, { value: "SMALL", label: "Small" }, { value: "MEDIUM", label: "Medium" }, { value: "LARGE", label: "Large" }].map((opt) => (
            <Link
              key={opt.value}
              href={buildAnimalsHref({ ...current, size: opt.value || undefined })}
              className={`ci-btn ci-btn--sm ${(!opt.value && !size) || size === opt.value ? "ci-btn--primary" : "ci-btn--ghost-sm"}`}
              style={size !== opt.value && (opt.value !== "" || size) ? { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" } : {}}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {(status || type || sex || size) && (
        <Link href="/animals" className="ci-btn ci-btn--ghost ci-btn--sm" style={{ width: "100%", justifyContent: "center" }}>
          Clear filters
        </Link>
      )}
    </div>
  );
}
