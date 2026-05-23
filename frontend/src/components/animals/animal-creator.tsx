"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AnimalFormFields } from "@/components/animals/animal-form-fields";
import {
  AnimalEditorApiError,
  createAnimalFromEditor,
} from "@/lib/api/animal-editor-client";
import { fetchAuthSession, refreshCsrfToken } from "@/lib/api/auth";
import type {
  AnimalGender,
  AnimalSize,
  AnimalStatusCode,
  BffError,
} from "@/lib/types";
import { readErrorMessage } from "@/lib/utils/animal-editor";
import { SuccessCard } from "@/components/ui/success-card";

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

type CreateFormState = Omit<EditorFormState, "previousOwnerId"> & {
  previousOwnerName: string;
  previousOwnerTelephone: string;
  previousOwnerEmail: string;
  previousOwnerAddress: string;
};

export function AnimalCreator() {
  const router = useRouter();
  const [, setCsrfToken] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(() =>
    createEmptyForm(),
  );
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdAnimalData, setCreatedAnimalData] = useState<{ id: string; name: string; animalType: string; breed: string; status: string } | null>(null);

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
          setErrorMessage(
            "Staff editor security checks could not be prepared. Refresh and try again.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = await refreshCsrfToken();

    if (token) setCsrfToken(token);

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const hasAnyOwnerField = createForm.previousOwnerName.trim() ||
      createForm.previousOwnerTelephone.trim() ||
      createForm.previousOwnerEmail?.trim() ||
      createForm.previousOwnerAddress?.trim();

    if (hasAnyOwnerField && !createForm.previousOwnerName.trim()) {
      setFieldErrors({ 'previousOwner.name': 'Name is required' });
      setIsCreating(false);
      return;
    }

    try {
      const requestBody = {
        name: createForm.name.trim(),
        ...(createForm.animalType.trim()
          ? { animalType: createForm.animalType.trim() }
          : {}),
        ...(createForm.breed.trim() ? { breed: createForm.breed.trim() } : {}),
        status: createForm.status,
        ...(createForm.gender ? { gender: createForm.gender } : {}),
        ...(createForm.size ? { size: createForm.size } : {}),
        ...(createForm.dateOfBirth
          ? { dateOfBirth: createForm.dateOfBirth }
          : {}),
        ...(createForm.intakeDate ? { intakeDate: createForm.intakeDate } : {}),
        ...(createForm.temperament.trim()
          ? { temperament: createForm.temperament.trim() }
          : {}),
        ...(createForm.description.trim()
          ? { description: createForm.description.trim() }
          : {}),
        ...(createForm.imageUrl.trim()
          ? { imageUrl: createForm.imageUrl.trim() }
          : {}),
        ...(createForm.previousOwnerName.trim() &&
        createForm.previousOwnerTelephone.trim()
          ? {
              previousOwner: {
                name: createForm.previousOwnerName.trim(),
                telephone: createForm.previousOwnerTelephone.trim(),
                ...(createForm.previousOwnerEmail.trim()
                  ? { email: createForm.previousOwnerEmail.trim() }
                  : {}),
                ...(createForm.previousOwnerAddress.trim()
                  ? { address: createForm.previousOwnerAddress.trim() }
                  : {}),
              },
            }
          : {}),
      };
      console.log("[DEBUG AnimalCreator] request body:", JSON.stringify(requestBody));
      console.log("[DEBUG AnimalCreator] CSRF token:", token);
      const createdAnimal = await createAnimalFromEditor(requestBody, token);

      setCreateForm(createEmptyForm());
      setCreatedAnimalData({
        id: createdAnimal.id,
        name: createdAnimal.name,
        animalType: createdAnimal.animalType,
        breed: createdAnimal.breed,
        status: createdAnimal.status,
      });
    } catch (error) {
      await handleMutationError(error);
    } finally {
      setIsCreating(false);
    }
  }

  function handleFieldChange(field: string, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  if (createdAnimalData) {
    return (
      <div className="max-w-3xl">
        <SuccessCard
          title="Animal record created"
          fields={[
            { label: "Name", value: createdAnimalData.name },
            { label: "Type", value: createdAnimalData.animalType },
            { label: "Breed", value: createdAnimalData.breed },
            { label: "Status", value: createdAnimalData.status },
          ]}
          primaryHref="/animals"
          primaryLabel="See all animals"
          secondaryHref={`/animals/${createdAnimalData.id}`}
          secondaryLabel="See animal"
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleCreateSubmit}>
      <div className="space-y-5">
        <AnimalFormFields
          formState={{
            name: createForm.name,
            animalType: createForm.animalType,
            breed: createForm.breed,
            status: createForm.status,
            gender: createForm.gender,
            size: createForm.size,
            dateOfBirth: createForm.dateOfBirth,
            intakeDate: createForm.intakeDate,
            temperament: createForm.temperament,
            imageUrl: createForm.imageUrl,
            description: createForm.description,
          }}
          onChange={handleFieldChange}
        />
        {fieldErrors.animalType && <p className="text-sm text-red-500 mt-1">{fieldErrors.animalType}</p>}
        {fieldErrors.dateOfBirth && <p className="text-sm text-red-500 mt-1">{fieldErrors.dateOfBirth}</p>}
        {fieldErrors.intakeDate && <p className="text-sm text-red-500 mt-1">{fieldErrors.intakeDate}</p>}

        <h3 className="text-lg font-extrabold font-[family-name:var(--font-display)] text-[var(--color-ink)] mb-4 mt-8">Previous owner</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-5">
            <label htmlFor="previousOwnerName">
              <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Previous owner name</span>
              <input
                id="previousOwnerName"
                className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
                value={createForm.previousOwnerName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerName: event.target.value }))
                }
              />
            </label>
            {fieldErrors['previousOwner.name'] && <p className="text-sm text-red-500 mt-1">{fieldErrors['previousOwner.name']}</p>}
          </div>

          <div className="space-y-5">
            <label htmlFor="previousOwnerTelephone">
              <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Previous owner telephone</span>
              <input
                id="previousOwnerTelephone"
                className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
                value={createForm.previousOwnerTelephone}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerTelephone: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-5">
            <label htmlFor="previousOwnerEmail">
              <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Previous owner email</span>
              <input
                id="previousOwnerEmail"
                type="email"
                className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
                value={createForm.previousOwnerEmail}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerEmail: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-5">
            <label htmlFor="previousOwnerAddress">
              <span className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">Previous owner address</span>
              <input
                id="previousOwnerAddress"
                className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:outline-none transition-all duration-200"
                value={createForm.previousOwnerAddress}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerAddress: event.target.value }))
                }
              />
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-2xl bg-[var(--color-primary)] text-white px-8 py-3.5 text-sm font-bold shadow-[var(--shadow-md)] hover:bg-[var(--color-primary-deep)] hover:shadow-[var(--shadow-lg)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Add Animal"}
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-2xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] px-8 py-3.5 text-sm font-bold hover:bg-[var(--color-primary-pale)] active:scale-[0.98] transition-all duration-200"
            onClick={() => router.push("/animals")}
          >
            Cancel
          </button>
        </div>
      </div>
      </form>

      {errorMessage ? (
        <p className="rounded-2xl border-2 border-[var(--color-danger)] bg-[var(--color-danger)]/5 p-4 text-sm text-[var(--color-danger)] font-medium mt-6" aria-live="polite" role="status">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-pale)] p-4 text-sm text-[var(--color-primary-deep)] font-medium mt-6" aria-live="polite" role="status">
          {successMessage}
        </p>
      ) : null}
    </div>
  );

  async function handleMutationError(error: unknown) {
    setErrorMessage(toEditorMessage(error));

    if (error instanceof AnimalEditorApiError) {
      if (error.responseError.fieldErrors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(error.responseError.fieldErrors)) {
          fe[k] = Array.isArray(v) ? (v[0] ?? "") : v;
        }
        setFieldErrors(fe);
      }

      if (error.responseError.code === "FORBIDDEN") {
        const nextToken = await refreshCsrfToken();

        if (nextToken) {
          setCsrfToken(nextToken);
        }
      }
    }
  }
}

function toEditorMessage(error: unknown): string {
  if (!(error instanceof AnimalEditorApiError)) {
    return "The animal editor is temporarily unavailable. Please try again shortly.";
  }

  return readErrorMessage(error.responseError);
}

function createEmptyForm(): CreateFormState {
  return {
    name: "",
    animalType: "",
    breed: "",
    status: "AVAILABLE",
    gender: "",
    size: "",
    dateOfBirth: "",
    intakeDate: "",
    temperament: "",
    description: "",
    imageUrl: "",
    previousOwnerName: "",
    previousOwnerTelephone: "",
    previousOwnerEmail: "",
    previousOwnerAddress: "",
  };
}
