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

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Public route</p>
        <h1 className="page-title">Browse animals ready for their next home.</h1>
        <p className="page-copy">
          Explore the public catalog with server-rendered filters for adoption
          status and animal type.
          {status ? ` Currently filtered to ${toStatusLabel(status)}.` : ""}
        </p>
        <div className="hero-actions">
          <Link href="/" className="secondary-link">
            Return to route map
          </Link>
        </div>
      </section>

      <AnimalFilters status={status} type={type} />

      {result.kind === "error" ? (
        <section className="empty-state">
          <p className="eyebrow">Catalog error</p>
          <h2 className="panel-title">Animal data is not available.</h2>
          <p className="panel-copy">{result.message}</p>
          <Link href="/animals" className="link-chip">
            Retry catalog
          </Link>
        </section>
      ) : result.animals.length ? (
        <section className="route-grid" aria-label="Animal results">
          {result.animals.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <p className="eyebrow">No results</p>
          <h2 className="panel-title">No animals match those filters.</h2>
          <p className="panel-copy">
            Try a different status or remove the type filter to widen the public
            catalog.
          </p>
          <Link href="/animals" className="link-chip">
            Clear filters
          </Link>
        </section>
      )}
    </div>
  );
}
