import Link from "next/link";

import { AnimalCard } from "@/components/animals/animal-card";
import { AnimalFilters } from "@/components/animals/animal-filters";
import { fetchAnimalsForView } from "@/lib/api/animals";
import { isAnimalStatusCode, toStatusLabel } from "@/lib/constants/status-map";
import type { AnimalStatusCode } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string | string[];
    type?: string | string[];
  }>;
};

type AnimalsResult =
  | { kind: "success"; animals: Awaited<ReturnType<typeof fetchAnimalsForView>> }
  | { kind: "error"; message: string };

function readQueryValue(value?: string | string[]): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

async function loadAnimals(
  status?: AnimalStatusCode,
  type?: string,
): Promise<AnimalsResult> {
  try {
    const animals = await fetchAnimalsForView({ status, type });

    return { kind: "success", animals };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "The catalog is temporarily unavailable.",
    };
  }
}

export default async function AnimalsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const rawStatus = readQueryValue(resolvedSearchParams.status);
  const rawType = readQueryValue(resolvedSearchParams.type)?.trim();
  const status = rawStatus && isAnimalStatusCode(rawStatus) ? rawStatus : undefined;
  const type = rawType || undefined;
  const result = await loadAnimals(status, type);

  const totalCount = result.kind === "success" ? result.animals.length : undefined;

  return (
    <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto", padding: "var(--space-7) var(--space-6)" }}>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <p className="ci-label" style={{ color: "var(--color-accent)" }}>Adoption Catalog</p>
        <h1 className="ci-h1" style={{ marginTop: "var(--space-2)" }}>Meet our animals.</h1>
        {totalCount !== undefined && (
          <p className="ci-body" style={{ marginTop: "var(--space-2)" }}>
            {totalCount} {totalCount === 1 ? "animal" : "animals"} available
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--space-7)", alignItems: "start" }}>
        <aside style={{ position: "sticky", top: "calc(var(--space-7) + 1rem)" }}>
          <AnimalFilters status={status} type={type} />
        </aside>

        <div>
          {result.kind === "error" ? (
            <div className="ci-card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
              <p className="ci-label" style={{ marginBottom: "var(--space-2)" }}>Catalog error</p>
              <h2 className="ci-h3" style={{ marginBottom: "var(--space-3)" }}>Animal data is not available.</h2>
              <p className="ci-body" style={{ marginBottom: "var(--space-4)" }}>{result.message}</p>
              <Link href="/animals" className="ci-btn ci-btn--primary">Retry catalog</Link>
            </div>
          ) : result.animals.length > 0 ? (
            <div className="ci-animal-grid">
              {result.animals.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} />
              ))}
            </div>
          ) : (
            <div className="ci-card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
              <p className="ci-label" style={{ marginBottom: "var(--space-2)" }}>No results</p>
              <h2 className="ci-h3" style={{ marginBottom: "var(--space-3)" }}>No animals match those filters.</h2>
              <p className="ci-body" style={{ marginBottom: "var(--space-4)" }}>
                Try a different status or remove the type filter to widen the public catalog.
              </p>
              <Link href="/animals" className="ci-btn ci-btn--ghost">Clear filters</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}