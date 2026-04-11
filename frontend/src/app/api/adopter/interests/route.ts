import type { NextRequest } from "next/server";

import {
  AdopterServiceError,
  readAdopterServiceFieldErrors,
  updateAdopterInterests,
} from "@/lib/api/adopter";
import { bffError, errorResponse, jsonResponse } from "@/lib/api/client";
import {
  CSRF_COOKIE_NAME,
  extractCsrfToken,
  validateCsrfRequest,
} from "@/lib/auth/csrf";
import { getSessionFromRequest } from "@/lib/auth/session";
import { MAX_INTERESTS, type UpdateInterestsRequest } from "@/lib/types";

export async function PUT(request: NextRequest): Promise<Response> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return errorResponse(
      bffError(401, "UNAUTHORIZED", "Sign in to save interested animals."),
    );
  }

  if (session.role !== "ADOPTER" || !session.profileId) {
    return errorResponse(
      bffError(403, "FORBIDDEN", "Only adopter accounts can update interested animals."),
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

  const parsedBody = await parseInterestsBody(request);

  if (!parsedBody.ok) {
    return errorResponse(parsedBody.error);
  }

  try {
    await updateAdopterInterests(session.profileId, parsedBody.body);

    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    return errorResponse(toInterestsMutationError(error));
  }
}

async function parseInterestsBody(
  request: NextRequest,
): Promise<{ ok: true; body: UpdateInterestsRequest } | { ok: false; error: ReturnType<typeof bffError> }> {
  let parsed: unknown;

  try {
    parsed = (await request.json()) as unknown;
  } catch {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.interestedAnimalIds)) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Interested animals payload is required."),
    };
  }

  const interestedAnimalIds = Array.from(
    new Set(
      parsed.interestedAnimalIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (interestedAnimalIds.length > MAX_INTERESTS) {
    return {
      ok: false,
      error: bffError(
        422,
        "VALIDATION_ERROR",
        `Choose no more than ${MAX_INTERESTS} interested animals.`,
        {
          interestedAnimalIds: [`Choose no more than ${MAX_INTERESTS} interested animals.`],
        },
      ),
    };
  }

  return {
    ok: true,
    body: {
      interestedAnimalIds,
    },
  };
}

function toInterestsMutationError(error: unknown) {
  if (!(error instanceof AdopterServiceError)) {
    return bffError(500, "INTERNAL_ERROR", "Interested animals could not be updated right now.");
  }

  if (error.status === 404) {
    return bffError(404, "NOT_FOUND", "The adopter profile could not be found.");
  }

  if (error.status === 400 || error.status === 422) {
    return bffError(
      422,
      "VALIDATION_ERROR",
      `Choose no more than ${MAX_INTERESTS} interested animals.`,
      readAdopterServiceFieldErrors(error),
    );
  }

  if (error.status >= 500) {
    return bffError(502, "UPSTREAM_ERROR", "Interested animals could not be updated right now.");
  }

  return bffError(error.status, "ADOPTER_REQUEST_FAILED", "Interested animals could not be updated right now.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
