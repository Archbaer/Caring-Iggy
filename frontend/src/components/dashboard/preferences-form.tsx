"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { saveAdopterPreferences, AdopterApiError } from "@/lib/api/adopter-client";
import { fetchAuthSession } from "@/lib/api/auth";
import type { AdopterPreferences } from "@/lib/types";

type PreferencesField = "preferredAnimalTypes" | "preferredBreeds" | "minAge" | "maxAge" | "preferredGenders" | "preferredSizes" | "preferredTemperaments" | "notes";

type PreferencesFormProps = {
  initialPreferences: AdopterPreferences;
  availableTypes: string[];
  availableBreeds: string[];
};

const EMPTY_FIELD_ERRORS: Record<PreferencesField, string[]> = {
  preferredAnimalTypes: [],
  preferredBreeds: [],
  minAge: [],
  maxAge: [],
  preferredGenders: [],
  preferredSizes: [],
  preferredTemperaments: [],
  notes: [],
};

const GENDER_OPTIONS = ["MALE", "FEMALE", "UNKNOWN"] as const;
const SIZE_OPTIONS = ["SMALL", "MEDIUM", "LARGE"] as const;
const TEMPERAMENT_OPTIONS = ["calm", "energetic", "playful", "gentle", "protective", "anxious", "independent", "affectionate"] as const;

export function PreferencesForm({
  initialPreferences,
  availableTypes,
  availableBreeds,
}: PreferencesFormProps) {
  const router = useRouter();
  const [selectedTypes, setSelectedTypes] = useState(initialPreferences.preferredAnimalTypes);
  const [selectedBreeds, setSelectedBreeds] = useState<string[]>(initialPreferences.preferredBreeds ?? []);
  const [minAge, setMinAge] = useState(initialPreferences.minAge?.toString() ?? "");
  const [maxAge, setMaxAge] = useState(initialPreferences.maxAge?.toString() ?? "");
  const [selectedGenders, setSelectedGenders] = useState<string[]>(initialPreferences.preferredGenders ?? []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initialPreferences.preferredSizes ?? []);
  const [selectedTemperaments, setSelectedTemperaments] = useState<string[]>(initialPreferences.preferredTemperaments ?? []);
  const [notes, setNotes] = useState(initialPreferences.notes ?? "");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<PreferencesField, string[]>>(EMPTY_FIELD_ERRORS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const sortedTypes = useMemo(
    () => [...availableTypes].sort((left, right) => left.localeCompare(right)),
    [availableTypes],
  );

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
          setErrorMessage("Preferences are temporarily unavailable. Refresh and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = csrfToken ?? (await refreshCsrfToken());

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors(EMPTY_FIELD_ERRORS);

    try {
      await saveAdopterPreferences(
        {
          preferences: {
            preferredAnimalTypes: selectedTypes,
            preferredBreeds: selectedBreeds.length > 0 ? selectedBreeds : undefined,
            ...(minAge ? { minAge: Number(minAge) } : {}),
            ...(maxAge ? { maxAge: Number(maxAge) } : {}),
            preferredGenders: selectedGenders.length > 0 ? selectedGenders as ("MALE" | "FEMALE" | "UNKNOWN")[] : undefined,
            preferredSizes: selectedSizes.length > 0 ? selectedSizes as ("SMALL" | "MEDIUM" | "LARGE")[] : undefined,
            preferredTemperaments: selectedTemperaments.length > 0 ? selectedTemperaments : undefined,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          },
        },
        token,
      );
      setSuccessMessage("Preferences saved.");
      router.refresh();
    } catch (error) {
      setErrorMessage(toDisplayMessage(error));
      setFieldErrors(readFieldErrors(error));

      if (error instanceof AdopterApiError && error.responseError.code === "FORBIDDEN") {
        const nextToken = await refreshCsrfToken();

        if (nextToken) {
          setCsrfToken(nextToken);
        }
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      {/* Row 1: Animal types + Age range — 50/50 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Animal types</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Preferred profiles</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Select the species you are most interested in adopting.
          </p>

          {sortedTypes.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto_fit,minmax(8rem,1fr))] gap-2">
              {sortedTypes.map((animalType) => {
                const checked = selectedTypes.includes(animalType);

                return (
                  <label key={animalType} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] hover:border-[var(--color-accent)]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedTypes((current) =>
                          checked
                            ? current.filter((value) => value !== animalType)
                            : [...current, animalType],
                        );
                      }}
                    />
                    <span>{animalType}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">Animal type options will appear here when the catalog is available.</p>
          )}

          {fieldErrors.preferredAnimalTypes[0] ? (
            <p className="text-sm text-red-600">{fieldErrors.preferredAnimalTypes[0]}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Age range</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Preferred age window</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5" htmlFor="preference-min-age">
              <span className="text-sm font-medium text-[var(--color-ink)]">Minimum age</span>
              <input
                id="preference-min-age"
                type="number"
                min="0"
                step="1"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={minAge}
                aria-invalid={fieldErrors.minAge.length > 0}
                onChange={(event) => {
                  setMinAge(event.target.value);
                }}
              />
              {fieldErrors.minAge[0] ? (
                <span className="text-sm text-red-600">{fieldErrors.minAge[0]}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5" htmlFor="preference-max-age">
              <span className="text-sm font-medium text-[var(--color-ink)]">Maximum age</span>
              <input
                id="preference-max-age"
                type="number"
                min="0"
                step="1"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={maxAge}
                aria-invalid={fieldErrors.maxAge.length > 0}
                onChange={(event) => {
                  setMaxAge(event.target.value);
                }}
              />
              {fieldErrors.maxAge[0] ? (
                <span className="text-sm text-red-600">{fieldErrors.maxAge[0]}</span>
              ) : null}
            </label>
          </div>
        </section>
      </div>

      {/* Row 2: Breeds + Gender+Size — 50/50 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Breeds</p>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Preferred breeds</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Select any specific breeds you are interested in. Leave all unchecked to see all breeds.
          </p>

          {availableBreeds.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto_fit,minmax(8rem,1fr))] gap-2">
              {availableBreeds.map((breed) => {
                const checked = selectedBreeds.includes(breed);

                return (
                  <label key={breed} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] hover:border-[var(--color-accent)]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedBreeds((current) =>
                          checked
                            ? current.filter((value) => value !== breed)
                            : [...current, breed],
                        );
                      }}
                    />
                    <span>{breed}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">No breed options available right now.</p>
          )}
        </section>

        <div className="flex flex-col gap-6 flex-1 items-stretch">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Gender</p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Preferred gender</h2>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((gender) => {
                const checked = selectedGenders.includes(gender);
                return (
                  <label key={gender} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] hover:border-[var(--color-accent)]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedGenders((current) =>
                          checked
                            ? current.filter((v) => v !== gender)
                            : [...current, gender],
                        );
                      }}
                    />
                    <span>{gender}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Size</p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Preferred size</h2>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((size) => {
                const checked = selectedSizes.includes(size);
                return (
                  <label key={size} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] hover:border-[var(--color-accent)]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedSizes((current) =>
                          checked
                            ? current.filter((v) => v !== size)
                            : [...current, size],
                        );
                      }}
                    />
                    <span>{size}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Row 3: Temperament — full width */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Temperament</p>
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">Preferred temperament</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
          {TEMPERAMENT_OPTIONS.map((temperament) => {
            const checked = selectedTemperaments.includes(temperament);
            return (
              <label key={temperament} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] hover:border-[var(--color-accent)]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedTemperaments((current) =>
                      checked
                        ? current.filter((v) => v !== temperament)
                        : [...current, temperament],
                    );
                  }}
                />
                <span className="capitalize">{temperament}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Row 4: Notes — full width */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">Additional context</p>
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">Tell us about your home</h2>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Include relevant details about your living situation, schedule, other pets, and what you are looking for in a companion. The more specific you are, the better we can match you.
        </p>
        <label className="flex flex-col gap-1.5" htmlFor="preference-notes">
          <span className="text-sm font-medium text-[var(--color-ink)]">Additional notes <span className="text-xs text-[var(--color-ink-soft)]">(max 500 characters)</span></span>
          <textarea
            id="preference-notes"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200 resize-none"
            rows={5}
            maxLength={500}
            value={notes}
            aria-invalid={fieldErrors.notes.length > 0}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
            placeholder="e.g. I have a large backyard, no other pets, work from home, looking for a calm dog around 2–5 years old..."
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-ink-soft)]" aria-live="polite">
              {notes.length}/500
            </span>
            {fieldErrors.notes[0] ? (
              <span className="text-sm text-red-600">{fieldErrors.notes[0]}</span>
            ) : null}
          </div>
        </label>
      </section>

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" aria-live="polite" role="status">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700" aria-live="polite" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 items-center">
        <button type="submit" className="ci-btn ci-btn--primary" disabled={isPending}>
          {isPending ? "Saving..." : "Save preferences"}
        </button>
      </div>
    </form>
  );

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

function readFieldErrors(error: unknown): Record<PreferencesField, string[]> {
  if (!(error instanceof AdopterApiError) || !error.responseError.fieldErrors) {
    return EMPTY_FIELD_ERRORS;
  }

  return {
    preferredAnimalTypes: error.responseError.fieldErrors?.preferredAnimalTypes ?? [],
    preferredBreeds: error.responseError.fieldErrors?.preferredBreeds ?? [],
    minAge: error.responseError.fieldErrors?.minAge ?? [],
    maxAge: error.responseError.fieldErrors?.maxAge ?? [],
    preferredGenders: error.responseError.fieldErrors?.preferredGenders ?? [],
    preferredSizes: error.responseError.fieldErrors?.preferredSizes ?? [],
    preferredTemperaments: error.responseError.fieldErrors?.preferredTemperaments ?? [],
    notes: error.responseError.fieldErrors?.notes ?? [],
  };
}

function toDisplayMessage(error: unknown): string {
  if (!(error instanceof AdopterApiError)) {
    return "Preferences are temporarily unavailable. Please try again shortly.";
  }

  if (error.responseError.code === "FORBIDDEN") {
    return "Your security check expired. Refresh the page and try again.";
  }

  if (error.responseError.code === "VALIDATION_ERROR") {
    return "Review your preferences and try again.";
  }

  return error.responseError.status >= 500
    ? "Preferences are temporarily unavailable. Please try again shortly."
    : "We couldn't save those preferences. Please try again.";
}
