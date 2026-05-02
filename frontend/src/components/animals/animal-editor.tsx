"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AnimalFormFields } from "@/components/animals/animal-form-fields";
import {
  deleteAnimalFromEditor,
  AnimalEditorApiError,
  updateAnimalFromEditor,
} from "@/lib/api/animal-editor-client";
import type { AnimalDetailView } from "@/lib/api/animals";
import { fetchAuthSession, refreshCsrfToken } from "@/lib/api/auth";
import type {
  AnimalGender,
  AnimalSize,
  AnimalStatusCode,
} from "@/lib/types";
import { readErrorMessage } from "@/lib/utils/animal-editor";

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

    if (token) setCsrfToken(token);

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

    if (token) setCsrfToken(token);

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

  function handleFieldChange(field: string, value: string) {
    setUpdateForm((current) => ({ ...current, [field]: value }));
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
            <AnimalFormFields
              formState={{
                name: updateForm.name,
                animalType: updateForm.animalType,
                breed: updateForm.breed,
                status: updateForm.status,
                gender: updateForm.gender,
                size: updateForm.size,
                dateOfBirth: updateForm.dateOfBirth,
                intakeDate: updateForm.intakeDate,
                temperament: updateForm.temperament,
                imageUrl: updateForm.imageUrl,
                description: updateForm.description,
              }}
              onChange={handleFieldChange}
            />

            <div className="space-y-2">
              <label className="flex flex-col gap-1.5" htmlFor="previousOwnerId">
                <span className="text-sm font-medium text-[var(--color-ink)]">Previous owner ID</span>
                <input
                  id="previousOwnerId"
                  className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                  value={updateForm.previousOwnerId}
                  onChange={(event) =>
                    setUpdateForm((current) => ({ ...current, previousOwnerId: event.target.value }))
                  }
                />
              </label>
            </div>

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
