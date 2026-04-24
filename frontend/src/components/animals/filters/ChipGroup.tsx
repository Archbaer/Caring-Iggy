"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChipGroupProps = {
  label: string;
  options: string[];
  selected: string[];
  currentFilters: {
    status?: string;
    type?: string;
    sex?: string;
    sizes?: string[];
    breeds?: string[];
  };
  filterKey: "sizes" | "breeds";
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

export function ChipGroup({
  label,
  options,
  selected,
  currentFilters,
  filterKey,
}: ChipGroupProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const available = options.filter((o) => !selected.includes(o));

  function buildHref(next: string[]): string {
    return buildAnimalsHref({ ...currentFilters, [filterKey]: next });
  }

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function toggleItem(item: string) {
    const next = selected.includes(item)
      ? selected.filter((s) => s !== item)
      : [...selected, item];
    navigate(buildHref(next));
  }

  const chipBase =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer";
  const chipActive =
    "bg-[var(--color-accent-pale)] text-[var(--color-accent)] border-[var(--color-accent)]";
  const chipInactive =
    "border-[var(--color-border)] text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]";

  return (
    <div>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((item) => (
            <button
              key={item}
              onClick={() => toggleItem(item)}
              className={`${chipBase} ${chipActive}`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown toggle + options */}
      {available.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors duration-150"
          >
            <span>Add {label.toLowerCase()}</span>
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
            <div className="mt-2 flex flex-col gap-1.5">
              {available.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleItem(option)}
                  className={`${chipBase} ${chipInactive} text-left`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
