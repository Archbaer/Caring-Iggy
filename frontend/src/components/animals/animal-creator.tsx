"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AnimalEditorApiError,
  createAnimalFromEditor,
} from "@/lib/api/animal-editor-client";
import { fetchAuthSession } from "@/lib/api/auth";
import type {
  AnimalGender,
  AnimalSize,
  AnimalStatusCode,
  BffError,
} from "@/lib/types";

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

const STATUS_OPTIONS: AnimalStatusCode[] = [
  "AVAILABLE",
  "PENDING",
  "ADOPTED",
  "IN_TREATMENT",
  "DECEASED",
];
const GENDER_OPTIONS: AnimalGender[] = ["MALE", "FEMALE", "UNKNOWN"];
const SIZE_OPTIONS: AnimalSize[] = ["SMALL", "MEDIUM", "LARGE"];

export function AnimalCreator() {
  const router = useRouter();
  const [, setCsrfToken] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(() =>
    createEmptyForm(),
  );
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    if (!token) {
      setErrorMessage("Security checks could not be prepared. Refresh and try again.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const createdAnimal = await createAnimalFromEditor(
        {
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
        },
        token,
      );

      setCreateForm(createEmptyForm());
      setSuccessMessage("Animal record created.");
      router.push(`/animals/${createdAnimal.id}`);
      router.refresh();
    } catch (error) {
      await handleMutationError(error);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Card variant="panel" className="p-0 overflow-hidden">

      <form className="dashboard-form" onSubmit={handleCreateSubmit}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="name">
              <span className="text-sm font-medium text-[var(--color-ink)]">Name</span>
              <input
                id="name"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="animalType">
              <span className="text-sm font-medium text-[var(--color-ink)]">Animal type</span>
              <input
                id="animalType"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.animalType}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, animalType: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="breed">
              <span className="text-sm font-medium text-[var(--color-ink)]">Breed</span>
              <input
                id="breed"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.breed}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, breed: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="status">
              <span className="text-sm font-medium text-[var(--color-ink)]">Status</span>
              <select
                id="status"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.status}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, status: event.target.value as AnimalStatusCode }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="gender">
              <span className="text-sm font-medium text-[var(--color-ink)]">Gender</span>
              <select
                id="gender"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.gender}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, gender: event.target.value as AnimalGender | "" }))
                }
              >
                <option value="">Unspecified</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="size">
              <span className="text-sm font-medium text-[var(--color-ink)]">Size</span>
              <select
                id="size"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.size}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, size: event.target.value as AnimalSize | "" }))
                }
              >
                <option value="">Unspecified</option>
                {SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="dateOfBirth">
              <span className="text-sm font-medium text-[var(--color-ink)]">Date of birth</span>
              <input
                id="dateOfBirth"
                type="date"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.dateOfBirth}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, dateOfBirth: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1.5" htmlFor="intakeDate">
              <span className="text-sm font-medium text-[var(--color-ink)]">Intake date</span>
              <input
                id="intakeDate"
                type="date"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.intakeDate}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, intakeDate: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="flex flex-col gap-1.5" htmlFor="temperament">
              <span className="text-sm font-medium text-[var(--color-ink)]">Temperament</span>
              <input
                id="temperament"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.temperament}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, temperament: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="flex flex-col gap-1.5" htmlFor="imageUrl">
              <span className="text-sm font-medium text-[var(--color-ink)]">Image URL</span>
              <input
                id="imageUrl"
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
                value={createForm.imageUrl}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, imageUrl: event.target.value }))
                }
              />
            </label>
          </div>

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

        <div className="space-y-2">
          <label className="flex flex-col gap-1.5" htmlFor="description">
            <span className="text-sm font-medium text-[var(--color-ink)]">Description</span>
            <textarea
              id="description"
              className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200 resize-none"
              rows={4}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="primary" className="flex-1" disabled={isCreating}>
            {isCreating ? "Creating..." : "Add Animal"}
          </Button>
          <Button
            type="button"
            variant="ghost"
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
