import type { NextRequest } from "next/server";

import { AnimalServiceError } from "@/lib/api/animals";
import { bffError, errorResponse } from "@/lib/api/client";
import {
  CSRF_COOKIE_NAME,
  extractCsrfToken,
  validateCsrfRequest,
} from "@/lib/auth/csrf";
import { getSessionFromRequest } from "@/lib/auth/session";
import type {
  AnimalCreateRequest,
  AnimalGender,
  AnimalSize,
  AnimalStatusCode,
  AnimalUpdateRequest,
  BffError,
} from "@/lib/types";

type RouteAccessResult =
  | { ok: true }
  | { ok: false; response: Response };

const STATUS_VALUES: AnimalStatusCode[] = [
  "AVAILABLE",
  "PENDING",
  "ADOPTED",
  "IN_TREATMENT",
  "DECEASED",
];
const GENDER_VALUES: AnimalGender[] = ["MALE", "FEMALE", "UNKNOWN"];
const SIZE_VALUES: AnimalSize[] = ["SMALL", "MEDIUM", "LARGE"];

export async function requireAnimalEditorRequest(
  request: NextRequest,
): Promise<RouteAccessResult> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      ok: false,
      response: errorResponse(
        bffError(401, "UNAUTHORIZED", "Sign in to manage animal records."),
      ),
    };
  }

  if (session.role !== "STAFF" && session.role !== "ADMIN") {
    return {
      ok: false,
      response: errorResponse(
        bffError(403, "FORBIDDEN", "Only staff and admin accounts can manage animals."),
      ),
    };
  }

  return { ok: true };
}

export async function validateAnimalMutationCsrf(
  request: NextRequest,
): Promise<RouteAccessResult> {
  const csrfResult = await validateCsrfRequest({
    method: request.method,
    headers: request.headers,
    cookieValue: request.cookies.get(CSRF_COOKIE_NAME)?.value,
    submittedToken: extractCsrfToken(request.headers),
  });

  if (!csrfResult.ok) {
    return {
      ok: false,
      response: errorResponse(
        bffError(403, "FORBIDDEN", "Security validation failed. Refresh and try again."),
      ),
    };
  }

  return { ok: true };
}

export async function parseCreateAnimalBody(
  request: NextRequest,
): Promise<
  | { ok: true; body: AnimalCreateRequest }
  | { ok: false; error: ReturnType<typeof bffError> }
> {
  const body = await readJsonBody(request);

  if (!body) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }

  const name = readRequiredString(body.name);

  if (!name) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Animal name is required."),
    };
  }

  const previousOwner = readPreviousOwner(body.previousOwner);

  if (body.previousOwner && !previousOwner) {
    return {
      ok: false,
      error: bffError(
        422,
        "VALIDATION_ERROR",
        "Previous owner entries require both a name and telephone.",
      ),
    };
  }

  return {
    ok: true,
    body: {
      name,
      ...(readOptionalDate(body.dateOfBirth) ? { dateOfBirth: readOptionalDate(body.dateOfBirth) } : {}),
      ...(readOptionalString(body.animalType) ? { animalType: readOptionalString(body.animalType) } : {}),
      ...(readOptionalString(body.breed) ? { breed: readOptionalString(body.breed) } : {}),
      ...(readOptionalEnum(body.gender, GENDER_VALUES) ? { gender: readOptionalEnum(body.gender, GENDER_VALUES)! } : {}),
      ...(readOptionalEnum(body.size, SIZE_VALUES) ? { size: readOptionalEnum(body.size, SIZE_VALUES)! } : {}),
      ...(readOptionalString(body.temperament) ? { temperament: readOptionalString(body.temperament) } : {}),
      ...(readOptionalEnum(body.status, STATUS_VALUES) ? { status: readOptionalEnum(body.status, STATUS_VALUES)! } : {}),
      ...(readOptionalDate(body.intakeDate) ? { intakeDate: readOptionalDate(body.intakeDate) } : {}),
      ...(readOptionalString(body.description) ? { description: readOptionalString(body.description) } : {}),
      ...(readOptionalString(body.imageUrl) ? { imageUrl: readOptionalString(body.imageUrl) } : {}),
      ...(previousOwner ? { previousOwner } : {}),
    },
  };
}

export async function parseUpdateAnimalBody(
  request: NextRequest,
): Promise<
  | { ok: true; body: AnimalUpdateRequest }
  | { ok: false; error: ReturnType<typeof bffError> }
> {
  const body = await readJsonBody(request);

  if (!body) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }

  const nextBody: AnimalUpdateRequest = {
    ...(readOptionalString(body.name) ? { name: readOptionalString(body.name) } : {}),
    ...(readOptionalDate(body.dateOfBirth) ? { dateOfBirth: readOptionalDate(body.dateOfBirth) } : {}),
    ...(readOptionalString(body.animalType) ? { animalType: readOptionalString(body.animalType) } : {}),
    ...(readOptionalString(body.breed) ? { breed: readOptionalString(body.breed) } : {}),
    ...(readOptionalEnum(body.gender, GENDER_VALUES) ? { gender: readOptionalEnum(body.gender, GENDER_VALUES)! } : {}),
    ...(readOptionalEnum(body.size, SIZE_VALUES) ? { size: readOptionalEnum(body.size, SIZE_VALUES)! } : {}),
    ...(readOptionalString(body.temperament) ? { temperament: readOptionalString(body.temperament) } : {}),
    ...(readOptionalEnum(body.status, STATUS_VALUES) ? { status: readOptionalEnum(body.status, STATUS_VALUES)! } : {}),
    ...(readOptionalDate(body.intakeDate) ? { intakeDate: readOptionalDate(body.intakeDate) } : {}),
    ...(readOptionalString(body.description) ? { description: readOptionalString(body.description) } : {}),
    ...(readOptionalString(body.imageUrl) ? { imageUrl: readOptionalString(body.imageUrl) } : {}),
    ...(readOptionalString(body.previousOwnerId) ? { previousOwnerId: readOptionalString(body.previousOwnerId) } : {}),
  };

  if (Object.keys(nextBody).length === 0) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Provide at least one field to update."),
    };
  }

  return { ok: true, body: nextBody };
}

export function toAnimalBffError(error: unknown, fallbackMessage: string): BffError {
  if (!(error instanceof AnimalServiceError)) {
    return bffError(500, "INTERNAL_ERROR", fallbackMessage);
  }

  if (error.status === 404) {
    return bffError(404, "NOT_FOUND", "The requested animal record could not be found.");
  }

  if (error.status === 400 || error.status === 422) {
    return bffError(422, "VALIDATION_ERROR", fallbackMessage, readFieldErrors(error.body));
  }

  if (error.status >= 500) {
    return bffError(502, "UPSTREAM_ERROR", fallbackMessage);
  }

  return bffError(error.status, "ANIMAL_REQUEST_FAILED", fallbackMessage);
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readRequiredString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readOptionalDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : undefined;
}

function readOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : undefined;
}

function readPreviousOwner(
  value: unknown,
): AnimalCreateRequest["previousOwner"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const input = value as Record<string, unknown>;

  const name = readRequiredString(input.name);
  const telephone = readRequiredString(input.telephone);

  if (!name || !telephone) {
    return undefined;
  }

  return {
    name,
    telephone,
    ...(readOptionalString(input.email) ? { email: readOptionalString(input.email) } : {}),
    ...(readOptionalString(input.address) ? { address: readOptionalString(input.address) } : {}),
  };
}

function readFieldErrors(body: unknown): Record<string, string[]> | undefined {
  if (!body || typeof body !== "object" || !("errors" in body)) {
    return undefined;
  }

  const fieldErrors = body.errors;

  if (!fieldErrors || typeof fieldErrors !== "object") {
    return undefined;
  }

  return Object.entries(fieldErrors).reduce<Record<string, string[]>>((output, [key, value]) => {
    if (Array.isArray(value)) {
      const messages = value.filter((entry): entry is string => typeof entry === "string");

      if (messages.length > 0) {
        output[key] = messages;
      }
    }

    return output;
  }, {});
}
