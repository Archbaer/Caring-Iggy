"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  deleteAnimalFromEditor,
  AnimalEditorApiError,
  updateAnimalFromEditor,
} from "@/lib/api/animal-editor-client";
import type { AnimalDetailView } from "@/lib/api/animals";
import { fetchAuthSession } from "@/lib/api/auth";
import type {
  AnimalGender,
  AnimalSize,
  AnimalStatusCode,
  BffError,
} from "@/lib/types";

type AnimalEditorProps = {
  animal: AnimalDetailView;
  userRole: "STAFF" | "ADMIN";
};

type EditorFormState = {
  name: string;
  animalType: string;
  breed: string;
  status: AnimalStatusCode;
  gender: AnimalGender | "";
  size: AnimalSize | "";
  dateOfBirth: string;
  intakeDate: string;
  temperament: string;
  description: string;
  imageUrl: string;
  previousOwnerId: string;
};

const STATUS_OPTIONS: AnimalStatusCode[] = [
  "AVAILABLE",
  "PENDING",
  "ADOPTED",
  "IN_TREATMENT",
  "DECEASED",
];
const GENDER_OPTIONS: AnimalGender[] = ["MALE", "FEMALE", "UNKNOWN"];
const SIZE_OPTIONS: AnimalSize[] = ["SMALL", "MEDIUM", "LARGE"];

export function AnimalEditor({ animal, userRole }: AnimalEditorProps) {
  const router = useRouter();
  const [, setCsrfToken] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState<EditorFormState>(() => toUpdateForm(animal));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setUpdateForm(toUpdateForm(animal));
  }, [animal]);

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
          setErrorMessage("Staff editor security checks could not be prepared. Refresh and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const roleCopy = useMemo(
    () => (userRole === "ADMIN" ? "admin" : "staff"),
    [userRole],
  );

  async function handleUpdateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = await refreshCsrfToken();

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateAnimalFromEditor(
        animal.id,
        {
          name: updateForm.name.trim(),
          animalType: updateForm.animalType.trim(),
          breed: updateForm.breed.trim(),
          status: updateForm.status,
          ...(updateForm.gender ? { gender: updateForm.gender } : {}),
          ...(updateForm.size ? { size: updateForm.size } : {}),
          ...(updateForm.dateOfBirth ? { dateOfBirth: updateForm.dateOfBirth } : {}),
          ...(updateForm.intakeDate ? { intakeDate: updateForm.intakeDate } : {}),
          ...(updateForm.temperament.trim() ? { temperament: updateForm.temperament.trim() } : {}),
          ...(updateForm.description.trim() ? { description: updateForm.description.trim() } : {}),
          ...(updateForm.imageUrl.trim() ? { imageUrl: updateForm.imageUrl.trim() } : {}),
          ...(updateForm.previousOwnerId.trim() ? { previousOwnerId: updateForm.previousOwnerId.trim() } : {}),
        },
        token,
      );

      setSuccessMessage("Animal record updated.");
      setTimeout(() => { router.push("/animals"); }, 1200);
    } catch (error) {
      await handleMutationError(error);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    const token = await refreshCsrfToken();

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteAnimalFromEditor(animal.id, token);
      router.push("/animals");
      router.refresh();
    } catch (error) {
      await handleMutationError(error);
      setIsDeleting(false);
    }
  }

  return (
    <div className="page-shell">
      <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto" }}>
        <section className="panel dashboard-form-panel">
          <p className="eyebrow">Authorized {roleCopy}</p>
          <h3 className="panel-title">Update this animal</h3>
          <p className="panel-copy">
            This client shell lazy-loads for {roleCopy} accounts only. Mutations still go through protected BFF routes with server-side role and CSRF checks.
          </p>

          <form className="dashboard-form" onSubmit={handleUpdateSubmit}>
            <div className="auth-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <div className="auth-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  <label className="auth-field">
                    <span className="auth-label">Name</span>
                    <input className="auth-input" value={updateForm.name} onChange={(event) => setUpdateForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className="auth-field">
                    <span className="auth-label">Animal type</span>
                    <input className="auth-input" value={updateForm.animalType} onChange={(event) => setUpdateForm((current) => ({ ...current, animalType: event.target.value }))} />
                  </label>
                </div>
              </div>

              <div>
                <div className="auth-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  <label className="auth-field">
                    <span className="auth-label">Breed</span>
                    <input className="auth-input" value={updateForm.breed} onChange={(event) => setUpdateForm((current) => ({ ...current, breed: event.target.value }))} />
                  </label>
                  <label className="auth-field">
                    <span className="auth-label">Status</span>
                    <select className="auth-input" value={updateForm.status} onChange={(event) => setUpdateForm((current) => ({ ...current, status: event.target.value as AnimalStatusCode }))}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <div className="auth-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  <label className="auth-field">
                    <span className="auth-label">Gender</span>
                    <select className="auth-input" value={updateForm.gender} onChange={(event) => setUpdateForm((current) => ({ ...current, gender: event.target.value as AnimalGender | "" }))}>
                      <option value="">Unspecified</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="auth-field">
                    <span className="auth-label">Size</span>
                    <select className="auth-input" value={updateForm.size} onChange={(event) => setUpdateForm((current) => ({ ...current, size: event.target.value as AnimalSize | "" }))}>
                      <option value="">Unspecified</option>
                      {SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <div className="auth-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  <label className="auth-field">
                    <span className="auth-label">Date of birth</span>
                    <input type="date" className="auth-input" value={updateForm.dateOfBirth} onChange={(event) => setUpdateForm((current) => ({ ...current, dateOfBirth: event.target.value }))} />
                  </label>
                  <label className="auth-field">
                    <span className="auth-label">Intake date</span>
                    <input type="date" className="auth-input" value={updateForm.intakeDate} onChange={(event) => setUpdateForm((current) => ({ ...current, intakeDate: event.target.value }))} />
                  </label>
                </div>
              </div>

              <div>
                <div className="auth-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <label className="auth-field">
                    <span className="auth-label">Temperament</span>
                    <input className="auth-input" value={updateForm.temperament} onChange={(event) => setUpdateForm((current) => ({ ...current, temperament: event.target.value }))} />
                  </label>
                </div>
              </div>

              <div>
                <div className="auth-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <label className="auth-field">
                    <span className="auth-label">Image URL</span>
                    <input className="auth-input" value={updateForm.imageUrl} onChange={(event) => setUpdateForm((current) => ({ ...current, imageUrl: event.target.value }))} />
                  </label>
                </div>
              </div>

              <div>
                <div className="auth-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <label className="auth-field">
                    <span className="auth-label">Previous owner ID</span>
                    <input className="auth-input" value={updateForm.previousOwnerId} onChange={(event) => setUpdateForm((current) => ({ ...current, previousOwnerId: event.target.value }))} />
                  </label>
                </div>
              </div>
            </div>

            <label className="auth-field">
              <span className="auth-label">Description</span>
              <textarea className="dashboard-textarea" rows={4} value={updateForm.description} onChange={(event) => setUpdateForm((current) => ({ ...current, description: event.target.value }))} />
            </label>

            <div className="auth-actions" style={{ justifyContent: "center" }}>
              <button type="submit" className="auth-submit" disabled={isUpdating || isDeleting}>
                {isUpdating ? "Saving..." : "Save animal changes"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div style={{ maxWidth: "var(--max-width-content)", margin: "0 auto" }}>
        <section className="panel dashboard-form-panel">
          <p className="eyebrow">Danger zone</p>
          <h3 className="panel-title">Delete this animal</h3>
          <p className="panel-copy">
            Deletion remains server-authorized. Lazy loading improves page weight only; it is not the authorization boundary.
          </p>
          <div className="auth-actions">
            <button type="button" className="dashboard-action-button" disabled={isUpdating || isDeleting} onClick={() => { void handleDelete(); }}>
              {isDeleting ? "Deleting..." : "Delete animal record"}
            </button>
          </div>
        </section>
      </div>

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

  async function refreshCsrfToken() {
    try {
      const session = await fetchAuthSession();
      setCsrfToken(session.csrfToken);
      return session.csrfToken;
    } catch {
      return null;
    }
  }

  async function handleMutationError(error: unknown) {
    setErrorMessage(toEditorMessage(error));

    if (error instanceof AnimalEditorApiError && error.responseError.code === "FORBIDDEN") {
      const nextToken = await refreshCsrfToken();

      if (nextToken) {
        setCsrfToken(nextToken);
      }
    }
  }
}

function toUpdateForm(animal: AnimalDetailView): EditorFormState {
  return {
    name: animal.name,
    animalType: animal.animalType,
    breed: animal.breed,
    status: animal.status,
    gender: animal.gender ?? "",
    size: animal.size ?? "",
    dateOfBirth: normalizeDate(animal.dateOfBirth),
    intakeDate: normalizeDate(animal.intakeDate),
    temperament: animal.temperament ?? "",
    description: animal.description ?? "",
    imageUrl: animal.imageUrl ?? "",
    previousOwnerId: animal.previousOwner?.id ?? "",
  };
}

function normalizeDate(value: string | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function toEditorMessage(error: unknown): string {
  if (!(error instanceof AnimalEditorApiError)) {
    return "The animal editor is temporarily unavailable. Please try again shortly.";
  }

  return readErrorMessage(error.responseError);
}

function readErrorMessage(error: BffError): string {
  if (error.code === "FORBIDDEN") {
    return "Your security check expired or your role is no longer allowed. Refresh and try again.";
  }

  if (error.code === "VALIDATION_ERROR") {
    return error.message;
  }

  return error.status >= 500
    ? "The animal editor is temporarily unavailable. Please try again shortly."
    : error.message;
}
