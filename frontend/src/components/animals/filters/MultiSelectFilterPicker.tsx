"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

type MultiSelectFilterPickerProps = {
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
  placeholder?: string;
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

export function MultiSelectFilterPicker({
  label,
  options,
  selected,
  currentFilters,
  filterKey,
  placeholder = `Add ${label.toLowerCase()}…`,
}: MultiSelectFilterPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const available = options.filter((o) => !selected.includes(o));

  function buildHref(next: string[]): string {
    return buildAnimalsHref({ ...currentFilters, [filterKey]: next });
  }

  function navigate(href: string) {
    router.push(href);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, available.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigate(buildHref([...selected, available[activeIndex]]));
      setActiveIndex(-1);
    } else if (e.key === "Backspace" && e.currentTarget.value === "") {
      if (selected.length > 0) {
        navigate(buildHref(selected.slice(0, -1)));
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function toggleItem(item: string) {
    const next = selected.includes(item)
      ? selected.filter((s) => s !== item)
      : [...selected, item];
    navigate(buildHref(next));
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.closest(".picker-root")?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="picker-root relative">
      {/* Selected items */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-pale)] text-[var(--color-primary)] text-xs font-medium px-2.5 py-1"
            >
              {item}
              <button
                onClick={() => toggleItem(item)}
                className="hover:text-[var(--color-primary-deep)] leading-none"
                aria-label={`Remove ${item}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
        />

        {/* Suggestion list */}
        {open && available.length > 0 && (
          <ul
            className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md overflow-hidden"
            role="listbox"
          >
            {available.map((option, i) => (
              <li
                key={option}
                role="option"
                aria-selected={i === activeIndex}
                className={`
                  px-3 py-2 text-sm cursor-pointer flex items-center justify-between
                  ${i === activeIndex ? "bg-[var(--color-primary-pale)] text-[var(--color-primary)]" : "text-[var(--color-ink)] hover:bg-[var(--color-canvas)]"}
                `}
                onClick={() => toggleItem(option)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span>{option}</span>
                {i === activeIndex && (
                  <span className="text-xs text-[var(--color-primary)] font-medium">Add</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {open && available.length === 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md px-3 py-2 text-sm text-[var(--color-ink-faint)]">
            No options available
          </div>
        )}
      </div>
    </div>
  );
}