import { CSRF_HEADER_NAME } from "@/lib/auth/csrf";
import type { BffError, UpdateInterestsRequest, UpdatePreferencesRequest } from "@/lib/types";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

export class AdopterApiError extends Error {
  readonly responseError: BffError;

  constructor(responseError: BffError) {
    super(responseError.message);
    this.name = "AdopterApiError";
    this.responseError = responseError;
  }
}

export async function saveAdopterPreferences(
  body: UpdatePreferencesRequest,
  csrfToken: string,
): Promise<void> {
  await postProtectedMutation("/api/adopter/preferences", body, csrfToken);
}

export async function saveAdopterInterests(
  body: UpdateInterestsRequest,
  csrfToken: string,
): Promise<void> {
  await postProtectedMutation("/api/adopter/interests", body, csrfToken);
}

async function postProtectedMutation(
  path: "/api/adopter/preferences" | "/api/adopter/interests",
  body: UpdatePreferencesRequest | UpdateInterestsRequest,
  csrfToken: string,
): Promise<void> {
  const response = await fetch(path, {
    method: "PUT",
    headers: {
      ...JSON_HEADERS,
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });

  await readJsonOrThrow(response, {
    status: 500,
    code: "ADOPTER_REQUEST_FAILED",
    message: "Unable to save adopter dashboard changes.",
  });
}

async function readJsonOrThrow(response: Response, fallbackError: BffError): Promise<void> {
  const body = await safeReadJson(response);

  if (!response.ok) {
    throw new AdopterApiError(readBffError(body, response.status, fallbackError));
  }
}

function readBffError(body: unknown, status: number, fallbackError: BffError): BffError {
  if (isBffError(body)) {
    return body;
  }

  return {
    ...fallbackError,
    status,
  };
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

function isBffError(value: unknown): value is BffError {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "status" in value &&
    typeof value.status === "number" &&
    "code" in value &&
    typeof value.code === "string" &&
    "message" in value &&
    typeof value.message === "string"
  );
}
