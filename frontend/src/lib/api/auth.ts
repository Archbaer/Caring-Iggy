import type {
  AuthMutationResult,
  AuthSessionSnapshot,
  BffError,
  LoginRequest,
  LogoutResult,
  SignupRequest,
} from "@/lib/types";

import { CSRF_HEADER_NAME } from "@/lib/auth/csrf";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

export class AuthApiError extends Error {
  readonly responseError: BffError;

  constructor(responseError: BffError) {
    super(responseError.message);
    this.name = "AuthApiError";
    this.responseError = responseError;
  }
}

export async function fetchAuthSession(): Promise<AuthSessionSnapshot> {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readJsonOrThrow<AuthSessionSnapshot>(response, {
    status: 500,
    code: "SESSION_FETCH_FAILED",
    message: "Unable to load the current authentication session.",
  });
}

export async function login(
  body: LoginRequest,
  csrfToken: string,
): Promise<AuthMutationResult> {
  return postAuthMutation<AuthMutationResult>("/api/auth/login", body, csrfToken);
}

export async function signup(
  body: SignupRequest,
  csrfToken: string,
): Promise<AuthMutationResult> {
  return postAuthMutation<AuthMutationResult>("/api/auth/signup", body, csrfToken);
}

export async function logout(csrfToken: string): Promise<LogoutResult> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    headers: {
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: "same-origin",
  });

  return readJsonOrThrow<LogoutResult>(response, {
    status: 500,
    code: "LOGOUT_FAILED",
    message: "Unable to end the current session.",
  });
}

async function postAuthMutation<T>(
  path: "/api/auth/login" | "/api/auth/signup",
  body: LoginRequest | SignupRequest,
  csrfToken: string,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });

  return readJsonOrThrow<T>(response, {
    status: 500,
    code: "AUTH_REQUEST_FAILED",
    message: "Unable to complete the authentication request.",
  });
}

async function readJsonOrThrow<T>(
  response: Response,
  fallbackError: BffError,
): Promise<T> {
  const body = await safeReadJson(response);

  if (!response.ok) {
    throw new AuthApiError(readBffError(body, response.status, fallbackError));
  }

  if (body === null) {
    throw new AuthApiError(fallbackError);
  }

  return body as T;
}

function readBffError(
  body: unknown,
  status: number,
  fallbackError: BffError,
): BffError {
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
