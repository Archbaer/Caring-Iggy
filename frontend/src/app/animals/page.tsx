import Link from "next/link";

import { AnimalCard } from "@/components/animals/animal-card";
import { AnimalFilters } from "@/components/animals/animal-filters";
import { fetchAnimals, fetchAnimalForView } from "@/lib/api/animals";
import type { AnimalSummaryView } from "@/lib/api/animals";
import { isAnimalStatusCode } from "@/lib/constants/status-map";
import type { AnimalSummary } from "@/lib/types";
import { getCurrentSession } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string | string[];
    type?: string | string[];
    sex?: string | string[];
    size?: string | string[];
    breed?: string | string[];
  }>;
};

type AnimalsResult =
  | { kind: "success"; animals: Awaited<ReturnType<typeof fetchAnimals>> }
  | { kind: "error"; message: string };

function readQueryValue(value?: string | string[]): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function readQueryArray(value?: string | string[]): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value;
  return [];
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export default async function AnimalsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  // Multi-value params for client-side filtering
  const sizes = readQueryArray(resolvedSearchParams.size).map((s) => s.trim().toUpperCase()).filter((s) => ["SMALL", "MEDIUM", "LARGE"].includes(s));
  const breeds = readQueryArray(resolvedSearchParams.breed).map((b) => b.trim()).filter(Boolean);

  // Single-value params (backend-filtered)
  const rawStatus = readQueryValue(resolvedSearchParams.status);
  const rawType = readQueryValue(resolvedSearchParams.type)?.trim();
  const rawSex = readQueryValue(resolvedSearchParams.sex)?.trim().toUpperCase();

  const status = rawStatus && isAnimalStatusCode(rawStatus) ? rawStatus : undefined;
  const type = rawType || undefined;
  const sex = rawSex && ["MALE", "FEMALE", "UNKNOWN"].includes(rawSex) ? rawSex : undefined;

  // Fetch ALL animals (no size/status filter — client-side filtering)
  let result: AnimalsResult;
  try {
    const animals = await fetchAnimals();
    result = { kind: "success", animals };
  } catch (error) {
    result = {
      kind: "error",
      message: error instanceof Error ? error.message : "The catalog is temporarily unavailable.",
    };
  }

  const [animalsResult, session] = await Promise.all([Promise.resolve(result), getCurrentSession()]);
  const canEditAnimal = session?.role === "STAFF" || session?.role === "ADMIN";

  // Fetch details for all animals to get gender, size, breed for filtering
  let viewAnimals: (AnimalSummary & { gender?: string; size?: string; breed?: string })[] = [];
  if (animalsResult.kind === "success") {
    const allAnimals = animalsResult.animals;
    // Fetch details with bounded concurrency (5 at a time)
    const detailResults = await Promise.all(
      chunk(allAnimals, 5).map((batch) => Promise.all(batch.map((a) => fetchAnimalForView(a.id).catch(() => null))))
    );
    const flatDetails = detailResults.flat();
    viewAnimals = allAnimals.map((a, i) => ({
      ...a,
      ...(flatDetails[i] ?? {}),
    }));
  }

  // Derive available breeds and sizes from full list
  const availableBreeds = [...new Set(
    viewAnimals.map((a) => a.breed).filter(Boolean)
  )].sort();

  const availableSizes = [...new Set(
    viewAnimals.map((a) => a.size).filter(Boolean)
  )].filter((s): s is string => Boolean(s));

  // Apply filters client-side
  let visibleAnimals = viewAnimals;
  if (status) visibleAnimals = visibleAnimals.filter((a) => a.status === status);
  if (type) visibleAnimals = visibleAnimals.filter((a) => a.animalType === type);
  if (sex) visibleAnimals = visibleAnimals.filter((a) => a.gender === sex);
  if (sizes.length > 0) visibleAnimals = visibleAnimals.filter((a) => sizes.includes(a.size ?? ""));
  if (breeds.length > 0) visibleAnimals = visibleAnimals.filter((a) => breeds.includes((a.breed ?? "").trim()));

  const totalCount = viewAnimals.length;
  const filteredCount = visibleAnimals.length;

  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-4 sm:px-6 pt-[calc(var(--space-5)+4rem)] pb-8">
      {/* Page header — centered banner */}
      <div className="w-full mb-8 pt-4 text-center">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--color-accent)] font-semibold">Adoption Catalog</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-medium text-[var(--color-ink)] mt-2 text-wrap-balance">Meet our animals.</h1>
        <p className="text-base text-[var(--color-ink-soft)] mt-3">
          {filteredCount} {filteredCount === 1 ? "animal" : "animals"} available
          {filteredCount !== totalCount && ` (filtered from ${totalCount})`}
        </p>
      </div>

      {/* Responsive layout: vertical stack on mobile with gap, grid on desktop */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* Mobile: filter bar 80% centered. Desktop: sticky sidebar */}
        <div className="w-4/5 mx-auto lg:w-full lg:mx-0 lg:sticky lg:top-[calc(var(--space-5)+4rem)] lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <AnimalFilters
            status={status}
            type={type}
            sex={sex}
            sizes={sizes}
            breeds={breeds}
            availableSizes={availableSizes}
            availableBreeds={availableBreeds}
          />
        </div>

        {/* Animal cards — 2 cols on mobile, 3 cols on lg */}
        <div className="w-full">
          {animalsResult.kind === "error" ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 text-center">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.1em] text-[var(--color-ink-faint)] mb-2">Catalog error</p>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-3">Animal data is not available.</h2>
              <p className="text-sm text-[var(--color-ink-soft)] mb-4">{animalsResult.message}</p>
              <Link href="/animals" className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-medium px-6 py-2.5 hover:bg-[var(--color-primary-deep)] transition-colors duration-150">Retry catalog</Link>
            </div>
          ) : visibleAnimals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {visibleAnimals.map((animal, index) => (
                <AnimalCard key={animal.id} animal={animal as AnimalSummaryView} enterIndex={index} canEdit={canEditAnimal} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 text-center">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.1em] text-[var(--color-ink-faint)] mb-2">No results</p>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-3">No animals match those filters.</h2>
              <p className="text-sm text-[var(--color-ink-soft)] mb-4">
                Try a different status or remove the type filter to widen the public catalog.
              </p>
              <Link href="/animals" className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-soft)] px-6 py-2.5 hover:bg-[var(--color-canvas)] transition-colors duration-150">Clear filters</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
