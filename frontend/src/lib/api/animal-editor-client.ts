import type {
  AnimalCreateRequest,
  AnimalDetail,
  AnimalUpdateRequest,
  BffError,
} from "@/lib/types";

import { CSRF_HEADER_NAME } from "@/lib/auth/csrf";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

export class AnimalEditorApiError extends Error {
  readonly responseError: BffError;

  constructor(responseError: BffError) {
    super(responseError.message);
    this.name = "AnimalEditorApiError";
    this.responseError = responseError;
  }
}

export async function createAnimalFromEditor(
  body: AnimalCreateRequest,
  csrfToken: string,
): Promise<AnimalDetail> {
  return writeJson<AnimalDetail>("/api/animals/create", {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
}

export async function updateAnimalFromEditor(
  animalId: string,
  body: AnimalUpdateRequest,
  csrfToken: string,
): Promise<AnimalDetail> {
  return writeJson<AnimalDetail>(`/api/animals/${animalId}/edit`, {
    method: "PUT",
    headers: {
      ...JSON_HEADERS,
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
}

export async function deleteAnimalFromEditor(
  animalId: string,
  csrfToken: string,
): Promise<{ ok: true }> {
  return writeJson<{ ok: true }>(`/api/animals/${animalId}/delete`, {
    method: "DELETE",
    headers: {
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: "same-origin",
  });
}

async function writeJson<T>(input: RequestInfo | URL, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await safeReadJson(response);

  if (!response.ok) {
    throw new AnimalEditorApiError(readBffError(body, response.status));
  }

  if (body === null) {
    throw new AnimalEditorApiError({
      status: 500,
      code: "EMPTY_RESPONSE",
      message: "The animal editor did not receive a usable response.",
    });
  }

  return body as T;
}

function readBffError(body: unknown, status: number): BffError {
  if (
    body &&
    typeof body === "object" &&
    "status" in body &&
    typeof body.status === "number" &&
    "code" in body &&
    typeof body.code === "string" &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body as BffError;
  }

  return {
    status,
    code: "ANIMAL_EDITOR_REQUEST_FAILED",
    message: "The animal editor request could not be completed.",
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
