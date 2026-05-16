"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { saveAdopterPreferences, AdopterApiError } from "@/lib/api/adopter-client";
import { fetchAuthSession, refreshCsrfToken } from "@/lib/api/auth";
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

    if (token) setCsrfToken(token);

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
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4">
          <label className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Animal types</label>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Preferred profiles</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Select the species you are most interested in adopting.
          </p>

          {sortedTypes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sortedTypes.map((animalType) => {
                const checked = selectedTypes.includes(animalType);

                return (
                  <label key={animalType} htmlFor={`pref-type-${animalType}`} className={`rounded-2xl border-2 border-[var(--color-border)] p-3 cursor-pointer hover:border-[var(--color-primary)] transition-all ${checked ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)]" : ""}`}>
                    <input
                      id={`pref-type-${animalType}`}
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
                    <span className="ml-2 text-sm text-[var(--color-ink)]">{animalType}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">Animal type options will appear here when the catalog is available.</p>
          )}

          {fieldErrors.preferredAnimalTypes[0] ? (
            <p className="text-sm text-[var(--color-danger)]">{fieldErrors.preferredAnimalTypes[0]}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4">
          <label className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Age range</label>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Preferred age window</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5" htmlFor="preference-min-age">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Minimum age</span>
              <input
                id="preference-min-age"
                type="number"
                min="0"
                step="1"
                className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
                value={minAge}
                aria-invalid={fieldErrors.minAge.length > 0}
                onChange={(event) => {
                  setMinAge(event.target.value);
                }}
              />
              {fieldErrors.minAge[0] ? (
                <span className="text-sm text-[var(--color-danger)]">{fieldErrors.minAge[0]}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5" htmlFor="preference-max-age">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Maximum age</span>
              <input
                id="preference-max-age"
                type="number"
                min="0"
                step="1"
                className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
                value={maxAge}
                aria-invalid={fieldErrors.maxAge.length > 0}
                onChange={(event) => {
                  setMaxAge(event.target.value);
                }}
              />
              {fieldErrors.maxAge[0] ? (
                <span className="text-sm text-[var(--color-danger)]">{fieldErrors.maxAge[0]}</span>
              ) : null}
            </label>
          </div>
        </section>
      </div>

      {/* Row 2: Breeds + Gender+Size — 50/50 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4">
          <label className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Breeds</label>
          <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Preferred breeds</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Select any specific breeds you are interested in. Leave all unchecked to see all breeds.
          </p>

          {availableBreeds.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableBreeds.map((breed) => {
                const checked = selectedBreeds.includes(breed);

                return (
                  <label key={breed} htmlFor={`pref-breed-${breed}`} className={`rounded-2xl border-2 border-[var(--color-border)] p-3 cursor-pointer hover:border-[var(--color-primary)] transition-all ${checked ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)]" : ""}`}>
                    <input
                      id={`pref-breed-${breed}`}
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
                    <span className="ml-2 text-sm text-[var(--color-ink)]">{breed}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)]">No breed options available right now.</p>
          )}
        </section>

        <div className="flex flex-col gap-6 flex-1 items-stretch">
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4 flex-1 justify-center">
            <label className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Gender</label>
            <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Preferred gender</h2>
            <div className="grid grid-cols-3 gap-3">
              {GENDER_OPTIONS.map((gender) => {
                const checked = selectedGenders.includes(gender);
                return (
                  <label key={gender} htmlFor={`pref-gender-${gender}`} className={`rounded-2xl border-2 border-[var(--color-border)] p-3 cursor-pointer hover:border-[var(--color-primary)] transition-all ${checked ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)]" : ""}`}>
                    <input
                      id={`pref-gender-${gender}`}
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
                    <span className="ml-2 text-sm text-[var(--color-ink)]">{gender}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4 flex-1 justify-center">
            <label className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Size</label>
            <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Preferred size</h2>
            <div className="grid grid-cols-3 gap-3">
              {SIZE_OPTIONS.map((size) => {
                const checked = selectedSizes.includes(size);
                return (
                  <label key={size} htmlFor={`pref-size-${size}`} className={`rounded-2xl border-2 border-[var(--color-border)] p-3 cursor-pointer hover:border-[var(--color-primary)] transition-all ${checked ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)]" : ""}`}>
                    <input
                      id={`pref-size-${size}`}
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
                    <span className="ml-2 text-sm text-[var(--color-ink)]">{size}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Row 3: Temperament — full width */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4">
        <label className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Temperament</label>
        <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Preferred temperament</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEMPERAMENT_OPTIONS.map((temperament) => {
            const checked = selectedTemperaments.includes(temperament);
            return (
              <label key={temperament} htmlFor={`pref-temperament-${temperament}`} className={`rounded-2xl border-2 border-[var(--color-border)] p-3 cursor-pointer hover:border-[var(--color-primary)] transition-all ${checked ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)]" : ""}`}>
                <input
                  id={`pref-temperament-${temperament}`}
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
                <span className="ml-2 text-sm text-[var(--color-ink)] capitalize">{temperament}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Row 4: Notes — full width */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 flex flex-col gap-4">
        <label className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Additional context</label>
        <h2 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)]">Tell us about your home</h2>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Include relevant details about your living situation, schedule, other pets, and what you are looking for in a companion. The more specific you are, the better we can match you.
        </p>
        <label className="flex flex-col gap-1.5" htmlFor="preference-notes">
          <span className="text-sm font-semibold text-[var(--color-ink)]">Additional notes <span className="text-xs text-[var(--color-ink-soft)]">(max 500 characters)</span></span>
          <textarea
            id="preference-notes"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200 resize-none"
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
              <span className="text-sm text-[var(--color-danger)]">{fieldErrors.notes[0]}</span>
            ) : null}
          </div>
        </label>
      </section>

      {errorMessage ? (
        <p className="rounded-2xl border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger)]" aria-live="polite" role="status">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-2xl border border-[var(--color-primary-pale)] bg-[var(--color-primary-pale)] p-4 text-sm text-[var(--color-primary)]" aria-live="polite" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 items-center justify-center">
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 disabled:pointer-events-none disabled:opacity-50 bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-deep)] hover:shadow-[var(--shadow-md)] active:scale-[0.97] h-10 px-5" disabled={isPending}>
          {isPending ? "Saving..." : "Save preferences"}
        </button>
      </div>
    </form>
  );

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
