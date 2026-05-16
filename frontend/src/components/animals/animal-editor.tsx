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
import { SuccessCard } from "@/components/ui/success-card";

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
  const [updatedAnimal, setUpdatedAnimal] = useState<{ id: string; name: string; animalType: string; breed: string; status: string } | null>(null);

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
      const updated = await updateAnimalFromEditor(
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

      setUpdatedAnimal({
        id: updated.id,
        name: updated.name,
        animalType: updated.animalType,
        breed: updated.breed,
        status: updated.status,
      });
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

  if (updatedAnimal) {
    return (
      <div className="max-w-3xl">
        <SuccessCard
          title="Animal record updated"
          fields={[
            { label: "Name", value: updatedAnimal.name },
            { label: "Type", value: updatedAnimal.animalType },
            { label: "Breed", value: updatedAnimal.breed },
            { label: "Status", value: updatedAnimal.status },
          ]}
          primaryHref="/animals"
          primaryLabel="See all animals"
          secondaryHref={`/animals/${updatedAnimal.id}`}
          secondaryLabel="See animal"
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Update form section */}
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)] mb-1">Authorized {roleCopy}</p>
        <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--color-ink)] mb-2">Update this animal</h3>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
          This client shell lazy-loads for {roleCopy} accounts only. Mutations still go through protected BFF routes with server-side role and CSRF checks.
        </p>

        <form onSubmit={handleUpdateSubmit}>
          <div className="space-y-5">
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

            <div className="space-y-5">
              <label htmlFor="previousOwnerId">
                <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Previous owner ID</span>
                <input
                  id="previousOwnerId"
                  className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
                  value={updateForm.previousOwnerId}
                  onChange={(event) =>
                    setUpdateForm((current) => ({ ...current, previousOwnerId: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="inline-flex items-center rounded-2xl bg-[var(--color-primary)] text-white px-8 py-3.5 text-sm font-bold shadow-[var(--shadow-md)] hover:bg-[var(--color-primary-deep)] hover:shadow-[var(--shadow-lg)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                disabled={isUpdating || isDeleting}
              >
                {isUpdating ? "Saving..." : "Save animal changes"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Danger zone section */}
      <section className="rounded-3xl border border-[var(--color-danger)]/30 bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-danger)] mb-1">Danger zone</p>
        <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--color-ink)] mb-2">Delete this animal</h3>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
          Deletion remains server-authorized. Lazy loading improves page weight only; it is not the authorization boundary.
        </p>
        <div>
          <button
            type="button"
            className="inline-flex items-center rounded-2xl bg-[var(--color-danger)] text-white px-8 py-3.5 text-sm font-bold shadow-[var(--shadow-sm)] hover:bg-[var(--color-danger-deep)] hover:shadow-[var(--shadow-md)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            disabled={isUpdating || isDeleting}
            onClick={() => { void handleDelete(); }}
          >
            {isDeleting ? "Deleting..." : "Delete animal record"}
          </button>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-2xl border-2 border-[var(--color-danger)] bg-[var(--color-danger)]/5 p-4 text-sm text-[var(--color-danger)] font-medium" aria-live="polite" role="status">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-pale)] p-4 text-sm text-[var(--color-primary-deep)] font-medium" aria-live="polite" role="status">
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
