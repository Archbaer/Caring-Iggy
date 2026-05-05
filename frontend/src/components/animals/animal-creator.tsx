"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AnimalFormFields } from "@/components/animals/animal-form-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <Card variant="panel" className="p-0 overflow-hidden">

      <form className="dashboard-form" onSubmit={handleCreateSubmit}>
      <div className="space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="previousOwnerName">
              <span className="text-sm font-medium text-[var(--color-ink)]">Previous owner name</span>
              <input
                id="previousOwnerName"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.previousOwnerName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerName: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="previousOwnerTelephone">
              <span className="text-sm font-medium text-[var(--color-ink)]">Previous owner telephone</span>
              <input
                id="previousOwnerTelephone"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.previousOwnerTelephone}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerTelephone: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="previousOwnerEmail">
              <span className="text-sm font-medium text-[var(--color-ink)]">Previous owner email</span>
              <input
                id="previousOwnerEmail"
                type="email"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.previousOwnerEmail}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerEmail: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="previousOwnerAddress">
              <span className="text-sm font-medium text-[var(--color-ink)]">Previous owner address</span>
              <input
                id="previousOwnerAddress"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.previousOwnerAddress}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, previousOwnerAddress: event.target.value }))
                }
              />
            </label>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="default" className="flex-1" disabled={isCreating}>
            {isCreating ? "Creating..." : "Add Animal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/animals")}
          >
            Cancel
          </Button>
        </div>
      </div>
      </form>
      </Card>

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
