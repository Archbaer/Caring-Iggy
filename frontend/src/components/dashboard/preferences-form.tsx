"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { saveAdopterPreferences, AdopterApiError } from "@/lib/api/adopter-client";
import { fetchAuthSession } from "@/lib/api/auth";
import type { AdopterPreferences } from "@/lib/types";

type PreferencesField = "preferredAnimalTypes" | "minAge" | "maxAge" | "notes";

type PreferencesFormProps = {
  initialPreferences: AdopterPreferences;
  availableTypes: string[];
};

const EMPTY_FIELD_ERRORS: Record<PreferencesField, string[]> = {
  preferredAnimalTypes: [],
  minAge: [],
  maxAge: [],
  notes: [],
};

export function PreferencesForm({
  initialPreferences,
  availableTypes,
}: PreferencesFormProps) {
  const router = useRouter();
  const [selectedTypes, setSelectedTypes] = useState(initialPreferences.preferredAnimalTypes);
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
          Save the animal types you want the team to keep in mind while matching remains offline.
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
        <p className="eyebrow">Notes</p>
        <h2 className="panel-title">Context for the team</h2>
        <label className="auth-field" htmlFor="preference-notes">
          <span className="auth-label">Additional notes</span>
          <textarea
            id="preference-notes"
            className="dashboard-textarea"
            rows={5}
            value={notes}
            aria-invalid={fieldErrors.notes.length > 0}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
          />
          {fieldErrors.notes[0] ? (
            <span className="auth-field-error">{fieldErrors.notes[0]}</span>
          ) : null}
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
    preferredAnimalTypes: error.responseError.fieldErrors.preferredAnimalTypes ?? [],
    minAge: error.responseError.fieldErrors.minAge ?? [],
    maxAge: error.responseError.fieldErrors.maxAge ?? [],
    notes: error.responseError.fieldErrors.notes ?? [],
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
