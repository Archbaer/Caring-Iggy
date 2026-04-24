"use client";

import { useState } from "react";
import Link from "next/link";

import type { AnimalStatusCode } from "@/lib/types";
import { FilterChip } from "./filters/FilterChip";
import { FilterPill } from "./filters/FilterPill";

type AnimalFiltersProps = {
  status?: AnimalStatusCode;
  type?: string;
  sex?: string;
  sizes?: string[];
  breeds?: string[];
  availableSizes?: string[];
  availableBreeds?: string[];
};

function buildAnimalsHref(filters: {
  status?: string;
  type?: string;
  sex?: string;
  sizes?: string[];
  breeds?: string[];
}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.sex) params.set("sex", filters.sex);
  (filters.sizes ?? []).forEach((s) => params.append("size", s));
  (filters.breeds ?? []).forEach((b) => params.append("breed", b));
  const serialized = params.toString();
  return serialized ? `/animals?${serialized}` : "/animals";
}

function FilterSection({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between w-full py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors duration-150">
          {label}
        </span>
        <svg
          className={`w-3 h-3 text-[var(--color-ink-faint)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2 4 6 8 10 4" />
        </svg>
      </button>
      {open && (
        <div className="pb-3 flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

// Multi-select chip row (Size, Breed)
function MultiChipRow({
  options,
  selected,
  buildHref,
}: {
  options: string[];
  selected: string[];
  buildHref: (next: string[]) => string;
}) {
  return (
    <>
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        const next = isActive
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        return (
          <button
            key={opt}
            onClick={() => buildHref(next)}
            className={`
              rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200
              ${isActive
                ? "bg-[var(--color-accent-pale)] text-[var(--color-accent)] border-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
              }
            `}
          >
            {opt}
          </button>
        );
      })}
    </>
  );
}



export function AnimalFilters({
  status,
  type,
  sex,
  sizes = [],
  breeds = [],
  availableSizes = ["SMALL", "MEDIUM", "LARGE"],
  availableBreeds = [],
}: AnimalFiltersProps) {
  const current = { status, type, sex, sizes, breeds };
  const hasActiveFilters = status || type || sex || sizes.length > 0 || breeds.length > 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="p-4 space-y-0">
        <FilterSection label="Status" defaultOpen={!!status}>
          <div className="flex flex-wrap gap-2">
            <FilterPill label="All" href={buildAnimalsHref({ ...current, status: undefined })} isActive={!status} />
            <FilterChip label="Available" href={buildAnimalsHref({ ...current, status: "AVAILABLE" })} isActive={status === "AVAILABLE"} />
            <FilterChip label="Pending" href={buildAnimalsHref({ ...current, status: "PENDING" })} isActive={status === "PENDING"} />
          </div>
        </FilterSection>

        <FilterSection label="Species" defaultOpen={!!type}>
          <div className="flex flex-wrap gap-2">
            <FilterPill label="All" href={buildAnimalsHref({ ...current, type: undefined })} isActive={!type} />
            <FilterChip label="Dog" href={buildAnimalsHref({ ...current, type: "DOG" })} isActive={type === "DOG"} />
            <FilterChip label="Cat" href={buildAnimalsHref({ ...current, type: "CAT" })} isActive={type === "CAT"} />
          </div>
        </FilterSection>

        <FilterSection label="Sex" defaultOpen={!!sex}>
          <div className="flex flex-wrap gap-2">
            <FilterPill label="All" href={buildAnimalsHref({ ...current, sex: undefined })} isActive={!sex} />
            <FilterChip label="Male" href={buildAnimalsHref({ ...current, sex: "MALE" })} isActive={sex === "MALE"} />
            <FilterChip label="Female" href={buildAnimalsHref({ ...current, sex: "FEMALE" })} isActive={sex === "FEMALE"} />
            <FilterChip label="Unknown" href={buildAnimalsHref({ ...current, sex: "UNKNOWN" })} isActive={sex === "UNKNOWN"} />
          </div>
        </FilterSection>

        <FilterSection label="Size" defaultOpen={sizes.length > 0}>
          <div className="flex flex-wrap gap-2">
            <MultiChipRow
              options={availableSizes}
              selected={sizes}
              buildHref={(next) => buildAnimalsHref({ ...current, sizes: next })}
            />
          </div>
        </FilterSection>

        {availableBreeds.length > 0 && (
          <FilterSection label="Breed" defaultOpen={breeds.length > 0}>
            <div className="flex flex-wrap gap-2">
              <MultiChipRow
                options={availableBreeds}
                selected={breeds}
                buildHref={(next) => buildAnimalsHref({ ...current, breeds: next })}
              />
            </div>
          </FilterSection>
        )}

        {hasActiveFilters && (
          <div className="pt-4">
            <Link
              href="/animals"
              className="inline-flex items-center justify-center w-full rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-soft)] px-4 py-2 hover:bg-[var(--color-canvas)] transition-colors duration-150"
            >
              Clear filters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
