import type { NextRequest } from "next/server";

import { AnimalServiceError } from "@/lib/api/animals";
import { bffError, errorResponse } from "@/lib/api/client";
import {
  CSRF_COOKIE_NAME,
  extractCsrfToken,
  validateCsrfRequest,
} from "@/lib/auth/csrf";
import { readSessionFromRequest } from "@/lib/auth/server";
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
  const session = await readSessionFromRequest(request);

  if (!session) {
    return {
      ok: false,
      response: errorResponse(
        bffError(401, "UNAUTHORIZED", "Sign in to manage animal records."),
      ),
    };
  }

  if (session.user.role !== "STAFF" && session.user.role !== "ADMIN") {
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

  const fieldErrors: Record<string, string[]> = {};

  const name = readRequiredString(body.name);

  if (!name) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Animal name is required."),
    };
  }

  const previousOwner = readPreviousOwner(body.previousOwner, fieldErrors);

  if (body.previousOwner && !previousOwner) {
    return {
      ok: false,
      error: bffError(
        422,
        "VALIDATION_ERROR",
        "Previous owner entries require both a name and telephone.",
        fieldErrors,
      ),
    };
  }

  const parsedBody = {
    name,
    ...(readOptionalDate(body.dateOfBirth, "dateOfBirth", fieldErrors) ? { dateOfBirth: readOptionalDate(body.dateOfBirth, "dateOfBirth", fieldErrors) } : {}),
    ...(readOptionalString(body.animalType) ? { animalType: readOptionalString(body.animalType) } : {}),
    ...(readOptionalString(body.breed) ? { breed: readOptionalString(body.breed) } : {}),
    ...(readOptionalEnum(body.gender, GENDER_VALUES, "gender", fieldErrors) ? { gender: readOptionalEnum(body.gender, GENDER_VALUES, "gender", fieldErrors)! } : {}),
    ...(readOptionalEnum(body.size, SIZE_VALUES, "size", fieldErrors) ? { size: readOptionalEnum(body.size, SIZE_VALUES, "size", fieldErrors)! } : {}),
    ...(readOptionalString(body.temperament) ? { temperament: readOptionalString(body.temperament) } : {}),
    ...(readOptionalEnum(body.status, STATUS_VALUES, "status", fieldErrors) ? { status: readOptionalEnum(body.status, STATUS_VALUES, "status", fieldErrors)! } : {}),
    ...(readOptionalDate(body.intakeDate, "intakeDate", fieldErrors) ? { intakeDate: readOptionalDate(body.intakeDate, "intakeDate", fieldErrors) } : {}),
    ...(readOptionalString(body.description) ? { description: readOptionalString(body.description) } : {}),
    ...(readOptionalString(body.imageUrl) ? { imageUrl: readOptionalString(body.imageUrl) } : {}),
    ...(previousOwner ? { previousOwner } : {}),
  };

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "One or more fields contain invalid values.", fieldErrors),
    };
  }

  return { ok: true, body: parsedBody };
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

  const fieldErrors: Record<string, string[]> = {};

  const nextBody: AnimalUpdateRequest = {
    ...(readOptionalString(body.name) ? { name: readOptionalString(body.name) } : {}),
    ...(readOptionalDate(body.dateOfBirth, "dateOfBirth", fieldErrors) ? { dateOfBirth: readOptionalDate(body.dateOfBirth, "dateOfBirth", fieldErrors) } : {}),
    ...(readOptionalString(body.animalType) ? { animalType: readOptionalString(body.animalType) } : {}),
    ...(readOptionalString(body.breed) ? { breed: readOptionalString(body.breed) } : {}),
    ...(readOptionalEnum(body.gender, GENDER_VALUES, "gender", fieldErrors) ? { gender: readOptionalEnum(body.gender, GENDER_VALUES, "gender", fieldErrors)! } : {}),
    ...(readOptionalEnum(body.size, SIZE_VALUES, "size", fieldErrors) ? { size: readOptionalEnum(body.size, SIZE_VALUES, "size", fieldErrors)! } : {}),
    ...(readOptionalString(body.temperament) ? { temperament: readOptionalString(body.temperament) } : {}),
    ...(readOptionalEnum(body.status, STATUS_VALUES, "status", fieldErrors) ? { status: readOptionalEnum(body.status, STATUS_VALUES, "status", fieldErrors)! } : {}),
    ...(readOptionalDate(body.intakeDate, "intakeDate", fieldErrors) ? { intakeDate: readOptionalDate(body.intakeDate, "intakeDate", fieldErrors) } : {}),
    ...(readOptionalString(body.description) ? { description: readOptionalString(body.description) } : {}),
    ...(readOptionalString(body.imageUrl) ? { imageUrl: readOptionalString(body.imageUrl) } : {}),
    ...(readOptionalString(body.previousOwnerId) ? { previousOwnerId: readOptionalString(body.previousOwnerId) } : {}),
  };

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "One or more fields contain invalid values.", fieldErrors),
    };
  }

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

function readOptionalDate(
  value: unknown,
  fieldName: string,
  fieldErrors: Record<string, string[]>,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    (fieldErrors[fieldName] ??= []).push(`Invalid date format for ${fieldName}`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    (fieldErrors[fieldName] ??= []).push(`Invalid date format for ${fieldName}. Expected YYYY-MM-DD`);
    return undefined;
  }
  return trimmed;
}

function readOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
  fieldErrors: Record<string, string[]>,
): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    (fieldErrors[fieldName] ??= []).push(`Invalid value for ${fieldName}`);
    return undefined;
  }
  if (!allowed.includes(value.toUpperCase() as T)) {
    (fieldErrors[fieldName] ??= []).push(`Invalid value for ${fieldName}: "${value}"`);
    return undefined;
  }
  return value.toUpperCase() as T;
}

function readPreviousOwner(
  value: unknown,
  fieldErrors: Record<string, string[]>,
): AnimalCreateRequest["previousOwner"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const input = value as Record<string, unknown>;

  const name = readOptionalString(input.name);
  const telephone = readOptionalString(input.telephone);
  const email = readOptionalString(input.email);
  const address = readOptionalString(input.address);

  if (!name && !telephone && !email && !address) return undefined;

  if (!name) {
    (fieldErrors["previousOwnerName"] ??= []).push("Previous owner name is required when providing owner details");
  }
  if (!telephone) {
    (fieldErrors["previousOwnerTelephone"] ??= []).push("Previous owner telephone is required when providing owner details");
  }

  if (!name || !telephone) return undefined;

  return {
    name,
    telephone,
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
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
