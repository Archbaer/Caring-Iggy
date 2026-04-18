"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => router.push("/animals")}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Animals
          </Button>

          <Eyebrow className="mb-3">Staff workspace</Eyebrow>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-gray-900 mb-2">
            Add New Animal
          </h1>
          <p className="text-gray-600">
            Register a new animal in the shelter catalog
          </p>
        </div>

        <Card variant="panel" className="p-0 overflow-hidden">

        <form className="dashboard-form" onSubmit={handleCreateSubmit}>
          <div className="auth-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <div
                className="auth-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <label className="auth-field">
                  <span className="auth-label">Name</span>
                  <input
                    className="auth-input"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Animal type</span>
                  <input
                    className="auth-input"
                    value={createForm.animalType}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        animalType: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <div
                className="auth-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <label className="auth-field">
                  <span className="auth-label">Breed</span>
                  <input
                    className="auth-input"
                    value={createForm.breed}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        breed: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Status</span>
                  <select
                    className="auth-input"
                    value={createForm.status}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        status: event.target.value as AnimalStatusCode,
                      }))
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <div
                className="auth-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <label className="auth-field">
                  <span className="auth-label">Gender</span>
                  <select
                    className="auth-input"
                    value={createForm.gender}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        gender: event.target.value as AnimalGender | "",
                      }))
                    }
                  >
                    <option value="">Unspecified</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span className="auth-label">Size</span>
                  <select
                    className="auth-input"
                    value={createForm.size}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        size: event.target.value as AnimalSize | "",
                      }))
                    }
                  >
                    <option value="">Unspecified</option>
                    {SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <div
                className="auth-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <label className="auth-field">
                  <span className="auth-label">Date of birth</span>
                  <input
                    type="date"
                    className="auth-input"
                    value={createForm.dateOfBirth}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Intake date</span>
                  <input
                    type="date"
                    className="auth-input"
                    value={createForm.intakeDate}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        intakeDate: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="auth-grid" style={{ gridTemplateColumns: "1fr" }}>
                <label className="auth-field">
                  <span className="auth-label">Temperament</span>
                  <input
                    className="auth-input"
                    value={createForm.temperament}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        temperament: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="auth-grid" style={{ gridTemplateColumns: "1fr" }}>
                <label className="auth-field">
                  <span className="auth-label">Image URL</span>
                  <input
                    className="auth-input"
                    value={createForm.imageUrl}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        imageUrl: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <div
                className="auth-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <label className="auth-field">
                  <span className="auth-label">Previous owner name</span>
                  <input
                    className="auth-input"
                    value={createForm.previousOwnerName}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        previousOwnerName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Previous owner telephone</span>
                  <input
                    className="auth-input"
                    value={createForm.previousOwnerTelephone}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        previousOwnerTelephone: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <div
                className="auth-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <label className="auth-field">
                  <span className="auth-label">Previous owner email</span>
                  <input
                    className="auth-input"
                    value={createForm.previousOwnerEmail}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        previousOwnerEmail: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Previous owner address</span>
                  <input
                    className="auth-input"
                    value={createForm.previousOwnerAddress}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        previousOwnerAddress: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <label className="auth-field">
            <span className="auth-label">Description</span>
            <textarea
              className="dashboard-textarea"
              rows={4}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>

          <div className="auth-actions" style={{ justifyContent: "center" }}>
            <button type="submit" className="auth-submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create animal record"}
            </button>
          </div>
        </form>
        </Card>
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
