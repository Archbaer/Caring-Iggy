import Link from "next/link";

import type { AnimalStatusCode } from "@/lib/types";
import { FilterChip } from "./filters/FilterChip";
import { FilterGroup } from "./filters/FilterGroup";
import { FilterPill } from "./filters/FilterPill";

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
        <FilterGroup label="Status">
          <FilterPill
            label="All"
            href={buildAnimalsHref({ ...current, status: undefined })}
            isActive={!status}
          />
          <FilterChip
            label="Available"
            href={buildAnimalsHref({ ...current, status: "AVAILABLE" })}
            isActive={status === "AVAILABLE"}
          />
          <FilterChip
            label="Pending"
            href={buildAnimalsHref({ ...current, status: "PENDING" })}
            isActive={status === "PENDING"}
          />
        </FilterGroup>
      </div>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <FilterGroup label="Species">
          <FilterPill
            label="All"
            href={buildAnimalsHref({ ...current, type: undefined })}
            isActive={!type}
          />
          <FilterChip
            label="Dog"
            href={buildAnimalsHref({ ...current, type: "DOG" })}
            isActive={type === "DOG"}
          />
          <FilterChip
            label="Cat"
            href={buildAnimalsHref({ ...current, type: "CAT" })}
            isActive={type === "CAT"}
          />
        </FilterGroup>
      </div>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <FilterGroup label="Sex">
          <FilterPill
            label="All"
            href={buildAnimalsHref({ ...current, sex: undefined })}
            isActive={!sex}
          />
          <FilterChip
            label="Male"
            href={buildAnimalsHref({ ...current, sex: "MALE" })}
            isActive={sex === "MALE"}
          />
          <FilterChip
            label="Female"
            href={buildAnimalsHref({ ...current, sex: "FEMALE" })}
            isActive={sex === "FEMALE"}
          />
          <FilterChip
            label="Unknown"
            href={buildAnimalsHref({ ...current, sex: "UNKNOWN" })}
            isActive={sex === "UNKNOWN"}
          />
        </FilterGroup>
      </div>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <FilterGroup label="Size">
          <FilterPill
            label="All"
            href={buildAnimalsHref({ ...current, size: undefined })}
            isActive={!size}
          />
          <FilterChip
            label="Small"
            href={buildAnimalsHref({ ...current, size: "SMALL" })}
            isActive={size === "SMALL"}
          />
          <FilterChip
            label="Medium"
            href={buildAnimalsHref({ ...current, size: "MEDIUM" })}
            isActive={size === "MEDIUM"}
          />
          <FilterChip
            label="Large"
            href={buildAnimalsHref({ ...current, size: "LARGE" })}
            isActive={size === "LARGE"}
          />
        </FilterGroup>
      </div>

      {(status || type || sex || size) && (
        <Link href="/animals" className="ci-btn ci-btn--ghost ci-btn--sm" style={{ width: "100%", justifyContent: "center" }}>
          Clear filters
        </Link>
      )}
    </div>
  );
}
