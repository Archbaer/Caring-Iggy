"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { InterestStatusList } from "@/components/dashboard/interest-status-list";
import { saveAdopterInterests, AdopterApiError } from "@/lib/api/adopter-client";
import type { AnimalSummaryView } from "@/lib/api/animals";
import { fetchAuthSession } from "@/lib/api/auth";
import { MAX_INTERESTS } from "@/lib/types";

type InterestsManagerProps = {
  currentAnimals: AnimalSummaryView[];
  catalogAnimals: AnimalSummaryView[];
};

export function InterestsManager({
  currentAnimals: rawCurrentAnimals,
  catalogAnimals: rawCatalogAnimals,
}: InterestsManagerProps) {
  const router = useRouter();

  const dedupedCurrent = Array.from(
    new Map(rawCurrentAnimals.map((a) => [a.id, a])).values(),
  );
  const dedupedCatalog = Array.from(
    new Map(rawCatalogAnimals.map((a) => [a.id, a])).values(),
  );

  const initialIds = Array.from(new Set(dedupedCurrent.map((a) => a.id)));

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingAnimalId, setPendingAnimalId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(Array.from(new Set(dedupedCurrent.map((a) => a.id))));
  }, [dedupedCurrent]);

  useEffect(() => {
    let cancelled = false;

    void fetchAuthSession()
      .then((session) => {
        if (!cancelled) {
          setCsrfToken(session.csrfToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("Interested animals are temporarily unavailable. Refresh and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const animalsById = useMemo(
    () => new Map([...dedupedCatalog, ...dedupedCurrent].map((animal) => [animal.id, animal])),
    [dedupedCatalog, dedupedCurrent],
  );
  const selectedAnimals = Array.from(new Set(selectedIds))
    .map((animalId) => animalsById.get(animalId))
    .filter((animal): animal is AnimalSummaryView => Boolean(animal));
  const availableAnimals = dedupedCatalog.filter((animal) => !selectedIds.includes(animal.id));
  const capReached = selectedIds.length >= MAX_INTERESTS;

  return (
    <div className="dashboard-stack">
      <section className="panel dashboard-form-panel">
        <p className="eyebrow">Current list</p>
        <h2 className="panel-title">Interested animals</h2>
        <p className="panel-copy">
          You can keep up to {MAX_INTERESTS} interested animals in this release. The limit is enforced in the UI and the protected BFF.
        </p>

        <InterestStatusList
          animals={selectedAnimals}
          emptyTitle="No interested animals yet"
          emptyCopy="Add up to three animal profiles to keep them visible here while matching stays offline."
        />

        {selectedAnimals.length > 0 ? (
          <div className="dashboard-action-list">
            {selectedAnimals.map((animal) => (
              <div key={animal.id} className="dashboard-inline-card">
                <div>
                  <h3 className="dashboard-subtitle">{animal.name}</h3>
                  <p className="panel-copy">{animal.statusLabel}</p>
                </div>
                <button
                  type="button"
                  className="dashboard-action-button"
                  disabled={pendingAnimalId === animal.id}
                  onClick={() => {
                    void updateInterests(
                      selectedIds.filter((selectedId) => selectedId !== animal.id),
                      animal.id,
                    );
                  }}
                >
                  {pendingAnimalId === animal.id ? "Saving..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel dashboard-form-panel">
        <p className="eyebrow">Catalog</p>
        <h2 className="panel-title">Add from the animal list</h2>
        <p className="panel-copy">
          Browse public profiles and save up to {MAX_INTERESTS}. If the cap is full, remove one before adding another.
        </p>

        {availableAnimals.length > 0 ? (
          <div className="dashboard-action-list">
            {availableAnimals.map((animal) => (
              <div key={animal.id} className="dashboard-inline-card">
                <div>
                  <h3 className="dashboard-subtitle">{animal.name}</h3>
                  <p className="panel-copy">
                    {animal.breed} · {animal.animalType} · {animal.statusLabel}
                  </p>
                </div>

                <div className="dashboard-inline-actions">
                  <Link href={`/animals/${animal.id}`} className="link-chip">
                    View profile
                  </Link>
                  <button
                    type="button"
                    className="dashboard-action-button"
                    disabled={capReached || pendingAnimalId === animal.id}
                    onClick={() => {
                      void updateInterests([...selectedIds, animal.id], animal.id);
                    }}
                  >
                    {pendingAnimalId === animal.id ? "Saving..." : capReached ? "Max 3 reached" : "Save interest"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="panel-copy">No additional animal profiles are available to add right now.</p>
        )}
      </section>

      {errorMessage ? (
        <p className="auth-error-banner" aria-live="polite" role="status">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="dashboard-success-banner" aria-live="polite" role="status">
          {successMessage}
        </p>
      ) : null}
    </div>
  );

  async function updateInterests(nextIds: string[], animalId: string) {
    const token = csrfToken ?? (await refreshCsrfToken());

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    if (nextIds.length > MAX_INTERESTS) {
      setErrorMessage(`Choose no more than ${MAX_INTERESTS} interested animals.`);
      return;
    }

    setPendingAnimalId(animalId);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedIds(nextIds);

    try {
      await saveAdopterInterests({ interestedAnimalIds: nextIds }, token);
      setSuccessMessage("Interested animals updated.");
      router.refresh();
    } catch (error) {
      setSelectedIds(Array.from(new Set(dedupedCurrent.map((a) => a.id))));
      setErrorMessage(toDisplayMessage(error));

      if (error instanceof AdopterApiError && error.responseError.code === "FORBIDDEN") {
        const nextToken = await refreshCsrfToken();

        if (nextToken) {
          setCsrfToken(nextToken);
        }
      }
    } finally {
      setPendingAnimalId(null);
    }
  }

  async function refreshCsrfToken() {
    try {
      const session = await fetchAuthSession();
      setCsrfToken(session.csrfToken);

      return session.csrfToken;
    } catch {
      return null;
    }
  }
}

function toDisplayMessage(error: unknown): string {
  if (!(error instanceof AdopterApiError)) {
    return "Interested animals are temporarily unavailable. Please try again shortly.";
  }

  if (error.responseError.code === "FORBIDDEN") {
    return "Your security check expired. Refresh the page and try again.";
  }

  if (error.responseError.code === "VALIDATION_ERROR") {
    return `Choose no more than ${MAX_INTERESTS} interested animals.`;
  }

  return error.responseError.status >= 500
    ? "Interested animals are temporarily unavailable. Please try again shortly."
    : "We couldn't update your interested animals. Please try again.";
}
