import type { NextRequest } from "next/server";

import {
  AdopterServiceError,
  readAdopterServiceFieldErrors,
  updateAdopterPreferences,
} from "@/lib/api/adopter";
import { bffError, errorResponse, jsonResponse } from "@/lib/api/client";
import {
  CSRF_COOKIE_NAME,
  extractCsrfToken,
  validateCsrfRequest,
} from "@/lib/auth/csrf";
import { getSessionFromRequest } from "@/lib/auth/session";
import type { UpdatePreferencesRequest } from "@/lib/types";

export async function PUT(request: NextRequest): Promise<Response> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return errorResponse(
      bffError(401, "UNAUTHORIZED", "Sign in to save adopter preferences."),
    );
  }

  if (session.role !== "ADOPTER" || !session.profileId) {
    return errorResponse(
      bffError(403, "FORBIDDEN", "Only adopter accounts can update preferences."),
    );
  }

  const csrfResult = await validateCsrfRequest({
    method: request.method,
    headers: request.headers,
    cookieValue: request.cookies.get(CSRF_COOKIE_NAME)?.value,
    submittedToken: extractCsrfToken(request.headers),
  });

  if (!csrfResult.ok) {
    return errorResponse(
      bffError(403, "FORBIDDEN", "Security validation failed. Refresh and try again."),
    );
  }

  const parsedBody = await parsePreferencesBody(request);

  if (!parsedBody.ok) {
    return errorResponse(parsedBody.error);
  }

  try {
    await updateAdopterPreferences(session.profileId, parsedBody.body);

    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    return errorResponse(toPreferencesMutationError(error));
  }
}

async function parsePreferencesBody(
  request: NextRequest,
): Promise<{ ok: true; body: UpdatePreferencesRequest } | { ok: false; error: ReturnType<typeof bffError> }> {
  let parsed: unknown;

  try {
    parsed = (await request.json()) as unknown;
  } catch {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }

  if (!isRecord(parsed) || !isRecord(parsed.preferences)) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Preferences payload is required."),
    };
  }

  const preferences = parsed.preferences;
  const fieldErrors: Record<string, string[]> = {};

  const preferredAnimalTypes = readStringArray(preferences.preferredAnimalTypes, "preferredAnimalTypes", fieldErrors);
  const minAge = readOptionalNumber(preferences.minAge, "minAge", fieldErrors);
  const maxAge = readOptionalNumber(preferences.maxAge, "maxAge", fieldErrors);
  const notes = readOptionalString(preferences.notes, "notes", fieldErrors);

  if (
    typeof minAge === "number" &&
    typeof maxAge === "number" &&
    minAge > maxAge
  ) {
    fieldErrors.minAge = ["Minimum age cannot be greater than maximum age."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: bffError(
        422,
        "VALIDATION_ERROR",
        "Review your preferences and try again.",
        fieldErrors,
      ),
    };
  }

  return {
    ok: true,
    body: {
      preferences: {
        preferredAnimalTypes,
        ...(typeof minAge === "number" ? { minAge } : {}),
        ...(typeof maxAge === "number" ? { maxAge } : {}),
        ...(notes ? { notes } : {}),
      },
    },
  };
}

function toPreferencesMutationError(error: unknown) {
  if (!(error instanceof AdopterServiceError)) {
    return bffError(500, "INTERNAL_ERROR", "Preferences could not be saved right now.");
  }

  if (error.status === 404) {
    return bffError(404, "NOT_FOUND", "The adopter profile could not be found.");
  }

  if (error.status === 400 || error.status === 422) {
    return bffError(
      422,
      "VALIDATION_ERROR",
      "Review your preferences and try again.",
      readAdopterServiceFieldErrors(error),
    );
  }

  if (error.status >= 500) {
    return bffError(502, "UPSTREAM_ERROR", "Preferences could not be saved right now.");
  }

  return bffError(error.status, "ADOPTER_REQUEST_FAILED", "Preferences could not be saved right now.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStringArray(
  value: unknown,
  field: string,
  fieldErrors: Record<string, string[]>,
): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    fieldErrors[field] = ["Enter a valid list."];
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function readOptionalNumber(
  value: unknown,
  field: string,
  fieldErrors: Record<string, string[]>,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    fieldErrors[field] = ["Enter a valid age."];
    return undefined;
  }

  return value;
}

function readOptionalString(
  value: unknown,
  field: string,
  fieldErrors: Record<string, string[]>,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    fieldErrors[field] = ["Enter valid notes."];
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}
