import Link from "next/link";

import { Eyebrow } from "@/components/ui/eyebrow";
import { AnimalCard } from "@/components/animals/animal-card";
import { AnimalFilters } from "@/components/animals/animal-filters";
import { fetchAnimals } from "@/lib/api/animals";
import type { AnimalSummaryView } from "@/lib/api/animals";
import { isAnimalStatusCode } from "@/lib/constants/status-map";
import { getCurrentSession } from "@/lib/auth/server-session";
import { readQueryValue } from "@/lib/utils/url";

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

function readQueryArray(value?: string | string[]): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value;
  return [];
}

export default async function AnimalsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  const sizes = readQueryArray(resolvedSearchParams.size)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => ["SMALL", "MEDIUM", "LARGE"].includes(s));
  const breeds = readQueryArray(resolvedSearchParams.breed)
    .map((b) => b.trim())
    .filter(Boolean);

  const rawStatus = readQueryValue(resolvedSearchParams.status);
  const rawType = readQueryValue(resolvedSearchParams.type)?.trim();
  const rawSex = readQueryValue(resolvedSearchParams.sex)?.trim().toUpperCase();

  const status = rawStatus && isAnimalStatusCode(rawStatus) ? rawStatus : undefined;
  const type = rawType || undefined;
  const sex = rawSex && ["MALE", "FEMALE", "UNKNOWN"].includes(rawSex) ? rawSex : undefined;

  const [session, animalsResult] = await Promise.all([
    getCurrentSession(),
    fetchAnimals().then((animals) => ({ kind: "success" as const, animals })).catch((error) => ({
      kind: "error" as const,
      message: error instanceof Error ? error.message : "The catalog is temporarily unavailable.",
    })),
  ]);

  const canEditAnimal = session?.role === "STAFF" || session?.role === "ADMIN";

  const allAnimals = animalsResult.kind === "success" ? animalsResult.animals : [];
  const totalCount = allAnimals.length;

  // Derive available breeds from summary data (breed is in summary)
  const availableBreeds = [...new Set(allAnimals.map((a) => a.breed).filter(Boolean))].sort();

  // Filter using fields now present on summary
  let visibleAnimals = allAnimals;
  if (status) visibleAnimals = visibleAnimals.filter((a) => a.status === status);
  if (type) visibleAnimals = visibleAnimals.filter((a) => a.animalType === type);
  if (sex) visibleAnimals = visibleAnimals.filter((a) => a.gender === sex);
  if (sizes.length > 0) visibleAnimals = visibleAnimals.filter((a) => sizes.includes(a.size ?? ""));
  if (breeds.length > 0) visibleAnimals = visibleAnimals.filter((a) => breeds.includes((a.breed ?? "").trim()));

  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6 pt-20 pb-8 bg-canvas-pattern">
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-[var(--color-border)]">
        <div>
          <Eyebrow>Shelter catalog</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)]">Find your companion</h1>
        </div>
        <span className="rounded-full bg-[var(--color-primary)] text-white text-sm font-bold px-4 py-1.5">
          {totalCount} animals
        </span>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        <div className="w-4/5 mx-auto lg:w-full lg:mx-0 lg:sticky lg:top-[5rem] lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <AnimalFilters
            status={status}
            type={type}
            sex={sex}
            sizes={sizes}
            breeds={breeds}
            availableBreeds={availableBreeds}
          />
        </div>

        <div className="w-full">
          {animalsResult.kind === "error" ? (
            <div className="rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-md)] p-8 text-center">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.1em] text-[var(--color-ink-faint)] mb-2">Catalog error</p>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)] mb-3">Animal data is not available.</h2>
              <p className="text-sm text-[var(--color-ink-soft)] mb-4">{animalsResult.message}</p>
              <Link href="/animals" className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold px-6 py-2.5 hover:bg-[var(--color-primary-deep)] transition-colors duration-150">Retry catalog</Link>
            </div>
          ) : visibleAnimals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {visibleAnimals.map((animal, index) => (
                <AnimalCard key={animal.id} animal={animal as AnimalSummaryView} enterIndex={index} canEdit={canEditAnimal} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-md)] p-12 text-center">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.1em] text-[var(--color-ink-faint)] mb-2">No results</p>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink-soft)] mb-3">No animals match those filters.</h2>
              <p className="text-sm text-[var(--color-ink-soft)] mb-4">Try a different status or remove the type filter to widen the public catalog.</p>
              <Link href="/animals" className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold px-6 py-2.5 hover:bg-[var(--color-primary-deep)] transition-colors duration-150">Clear filters</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
