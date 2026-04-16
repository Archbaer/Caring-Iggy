"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { saveAdopterPreferences, AdopterApiError } from "@/lib/api/adopter-client";
import { fetchAuthSession } from "@/lib/api/auth";
import type { AdopterPreferences } from "@/lib/types";

type PreferencesField = "preferredAnimalTypes" | "preferredBreeds" | "minAge" | "maxAge" | "notes";

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
  notes: [],
};

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
    <form className="dashboard-form" onSubmit={handleSubmit}>
      <section className="panel dashboard-form-panel">
        <p className="eyebrow">Animal types</p>
        <h2 className="panel-title">Preferred profiles</h2>
        <p className="panel-copy">
          Select the species you are most interested in adopting.
        </p>

        {sortedTypes.length > 0 ? (
          <div className="dashboard-checkbox-grid">
            {sortedTypes.map((animalType) => {
              const checked = selectedTypes.includes(animalType);

              return (
                <label key={animalType} className="dashboard-checkbox-chip">
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
          <p className="panel-copy">Animal type options will appear here when the catalog is available.</p>
        )}

        {fieldErrors.preferredAnimalTypes[0] ? (
          <p className="auth-field-error">{fieldErrors.preferredAnimalTypes[0]}</p>
        ) : null}
      </section>

      <section className="panel dashboard-form-panel">
        <p className="eyebrow">Breeds</p>
        <h2 className="panel-title">Preferred breeds</h2>
        <p className="panel-copy">
          Select any specific breeds you are interested in. Leave all unchecked to see all breeds.
        </p>

        {availableBreeds.length > 0 ? (
          <div className="dashboard-checkbox-grid">
            {availableBreeds.map((breed) => {
              const checked = selectedBreeds.includes(breed);

              return (
                <label key={breed} className="dashboard-checkbox-chip">
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
          <p className="panel-copy">No breed options available right now.</p>
        )}
      </section>

      <section className="panel dashboard-form-panel">
        <p className="eyebrow">Age range</p>
        <h2 className="panel-title">Preferred age window</h2>
        <div className="auth-grid">
          <label className="auth-field" htmlFor="preference-min-age">
            <span className="auth-label">Minimum age</span>
            <input
              id="preference-min-age"
              type="number"
              min="0"
              step="1"
              className="auth-input"
              value={minAge}
              aria-invalid={fieldErrors.minAge.length > 0}
              onChange={(event) => {
                setMinAge(event.target.value);
              }}
            />
            {fieldErrors.minAge[0] ? (
              <span className="auth-field-error">{fieldErrors.minAge[0]}</span>
            ) : null}
          </label>

          <label className="auth-field" htmlFor="preference-max-age">
            <span className="auth-label">Maximum age</span>
            <input
              id="preference-max-age"
              type="number"
              min="0"
              step="1"
              className="auth-input"
              value={maxAge}
              aria-invalid={fieldErrors.maxAge.length > 0}
              onChange={(event) => {
                setMaxAge(event.target.value);
              }}
            />
            {fieldErrors.maxAge[0] ? (
              <span className="auth-field-error">{fieldErrors.maxAge[0]}</span>
            ) : null}
          </label>
        </div>
      </section>

      <section className="panel dashboard-form-panel">
        <p className="eyebrow">Additional context</p>
        <h2 className="panel-title">Tell us about your home</h2>
        <p className="panel-copy">
          Include relevant details about your living situation, schedule, other pets, and what you are looking for in a companion. The more specific you are, the better we can match you.
        </p>
        <label className="auth-field" htmlFor="preference-notes">
          <span className="auth-label">Additional notes <span className="auth-label-hint">(max 500 characters)</span></span>
          <textarea
            id="preference-notes"
            className="dashboard-textarea"
            rows={5}
            maxLength={500}
            value={notes}
            aria-invalid={fieldErrors.notes.length > 0}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
            placeholder="e.g. I have a large backyard, no other pets, work from home, looking for a calm dog around 2–5 years old..."
          />
          <div className="auth-field-footer">
            <span className="auth-char-count" aria-live="polite">
              {notes.length}/500
            </span>
            {fieldErrors.notes[0] ? (
              <span className="auth-field-error">{fieldErrors.notes[0]}</span>
            ) : null}
          </div>
        </label>
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

      <div className="auth-actions">
        <button type="submit" className="auth-submit" disabled={isPending}>
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
