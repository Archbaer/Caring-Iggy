import type {
  AdopterInterest,
  AdopterPreferences,
  AdopterProfile,
  UpdateInterestsRequest,
  UpdatePreferencesRequest,
} from "@/lib/types";
import { serviceUrl } from "./client";

interface BackendAdopterDto {
  id: string;
  name: string;
  telephone: string;
  email: string;
  status: string;
  preferences: Record<string, unknown> | null;
  interestedAnimals: string[] | null;
}

interface BackendValidationError {
  message?: string;
  errors?: Record<string, string[]>;
}

export class AdopterServiceError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AdopterServiceError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchAdopterProfile(adopterId: string): Promise<AdopterProfile | null> {
  const res = await fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}`));

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new AdopterServiceError(
      `Failed to fetch adopter profile: ${res.status}`,
      res.status,
      await safeReadJson(res),
    );
  }

  return mapAdopterProfile((await res.json()) as BackendAdopterDto);
}

export async function updateAdopterPreferences(
  adopterId: string,
  body: UpdatePreferencesRequest,
): Promise<AdopterProfile> {
  const res = await fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      preferences: serializePreferences(body.preferences),
    }),
  });

  if (!res.ok) {
    throw new AdopterServiceError(
      `Failed to update preferences: ${res.status}`,
      res.status,
      await safeReadJson(res),
    );
  }

  return mapAdopterProfile((await res.json()) as BackendAdopterDto);
}

export async function updateAdopterInterests(
  adopterId: string,
  body: UpdateInterestsRequest,
): Promise<AdopterProfile> {
  const res = await fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}/interests`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      interestedAnimals: body.interestedAnimalIds,
    }),
  });

  if (!res.ok) {
    throw new AdopterServiceError(
      `Failed to update interests: ${res.status}`,
      res.status,
      await safeReadJson(res),
    );
  }

  return mapAdopterProfile((await res.json()) as BackendAdopterDto);
}

export function readAdopterServiceFieldErrors(
  error: AdopterServiceError,
): Record<string, string[]> | undefined {
  const body = error.body as BackendValidationError | null;

  if (!body || typeof body !== "object" || !body.errors || typeof body.errors !== "object") {
    return undefined;
  }

  return Object.entries(body.errors).reduce<Record<string, string[]>>((output, [key, value]) => {
    if (Array.isArray(value)) {
      const messages = value.filter((entry): entry is string => typeof entry === "string");

      if (messages.length > 0) {
        output[key] = messages;
      }
    }

    return output;
  }, {});
}

function mapAdopterProfile(input: BackendAdopterDto): AdopterProfile {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    telephone: input.telephone,
    status: input.status,
    preferences: normalizePreferences(input.preferences),
    interests: normalizeInterests(input.interestedAnimals),
  };
}

function normalizePreferences(
  input: Record<string, unknown> | null,
): AdopterPreferences {
  const preferredAnimalTypes = Array.isArray(input?.preferredAnimalTypes)
    ? input.preferredAnimalTypes.filter((value): value is string => typeof value === "string")
    : [];
  const minAge = typeof input?.minAge === "number" ? input.minAge : undefined;
  const maxAge = typeof input?.maxAge === "number" ? input.maxAge : undefined;
  const notes = typeof input?.notes === "string" ? input.notes : undefined;

  return {
    preferredAnimalTypes,
    ...(typeof minAge === "number" ? { minAge } : {}),
    ...(typeof maxAge === "number" ? { maxAge } : {}),
    ...(notes ? { notes } : {}),
  };
}

function serializePreferences(input: AdopterPreferences): Record<string, unknown> {
  return {
    preferredAnimalTypes: input.preferredAnimalTypes,
    ...(Array.isArray(input.preferredBreeds) && input.preferredBreeds.length > 0
      ? { preferredBreeds: input.preferredBreeds }
      : {}),
    ...(typeof input.minAge === "number" ? { minAge: input.minAge } : {}),
    ...(typeof input.maxAge === "number" ? { maxAge: input.maxAge } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
}

function normalizeInterests(input: string[] | null): AdopterInterest[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((animalId): animalId is string => typeof animalId === "string" && animalId.length > 0)
    .map((animalId) => ({ animalId }));
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}
