import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  bffError,
  errorResponse,
  serviceUrl,
} from "@/lib/api/client";
import {
  CSRF_COOKIE_NAME,
  extractCsrfToken,
  issueCsrfToken,
  validateCsrfRequest,
} from "@/lib/auth/csrf";
import {
  AUTH_ROLE_VALUES,
  decodeSessionState,
  encodeSessionState,
  SESSION_COOKIE_NAME,
  SESSION_STATE_COOKIE_NAME,
  type AuthSession,
  type UserRole,
} from "@/lib/auth/session";
import type { BffError, LoginRequest, SessionUser, SignupRequest } from "@/lib/types";

const AUTH_BACKEND_SESSION_COOKIE_NAME = "session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8;
const LEGACY_STAFF_ROLE_ALIAS = ["EMP", "LOYEE"].join("");
const LEGACY_ADMIN_ROLE_ALIAS = ["ORG", "HEAD"].join("_");

type AuthMutationPath = "/api/auth/login" | "/api/auth/signup";

type AuthRequestBody = LoginRequest | SignupRequest;

interface AuthPayload {
  user: SessionUser;
  csrfToken: string;
}

interface LogoutPayload {
  ok: true;
  csrfToken: string;
}

interface SessionPayload {
  user: SessionUser | null;
  csrfToken: string;
}

interface UpstreamSessionSnapshot {
  token: string;
  user: SessionUser;
  expiresAt: number;
}

interface ExtractedSessionCookie {
  token: string;
  expiresAt: number | null;
}

export async function handleLoginRoute(request: NextRequest): Promise<Response> {
  return handleAuthMutationRoute(request, "/api/auth/login");
}

export async function handleSignupRoute(request: NextRequest): Promise<Response> {
  return handleAuthMutationRoute(request, "/api/auth/signup");
}

export async function handleLogoutRoute(request: NextRequest): Promise<Response> {
  const csrfFailure = await validateAuthCsrf(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const currentSessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  const nextCsrf = await issueCsrfToken();

  if (currentSessionToken) {
    const upstreamResponse = await fetchAuthService("/api/auth/logout", {
      method: "POST",
      headers: buildJsonHeaders({
        cookie: serializeBackendSessionCookie(currentSessionToken),
      }),
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 401) {
      return mapUpstreamError(upstreamResponse);
    }
  }

  const response = NextResponse.json<LogoutPayload>(
    { ok: true, csrfToken: nextCsrf.token },
    {
      headers: noStoreHeaders(),
    },
  );

  clearSessionCookies(response);
  setCsrfCookie(response, nextCsrf.cookieValue);

  return response;
}

export async function handleSessionRoute(request: NextRequest): Promise<Response> {
  const nextCsrf = await issueCsrfToken();
  let currentSession: UpstreamSessionSnapshot | null;

  try {
    currentSession = await readSessionFromRequest(request);
  } catch (error) {
    if (error instanceof UpstreamAuthError) {
      return errorResponse(error.responseError);
    }

    return errorResponse(
      bffError(500, "INTERNAL_ERROR", "Unable to resolve the current session."),
    );
  }

  const response = NextResponse.json<SessionPayload>(
    {
      user: currentSession?.user ?? null,
      csrfToken: nextCsrf.token,
    },
    {
      headers: noStoreHeaders(),
    },
  );

  setCsrfCookie(response, nextCsrf.cookieValue);

  if (!currentSession) {
    clearSessionCookies(response);
  } else {
    await applySessionCookies(response, currentSession);
  }

  return response;
}

async function handleAuthMutationRoute(
  request: NextRequest,
  path: AuthMutationPath,
): Promise<Response> {
  const csrfFailure = await validateAuthCsrf(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const parsedBody = await parseRequestBody<AuthRequestBody>(request);

  if (!parsedBody.ok) {
    return errorResponse(parsedBody.error);
  }

  const upstreamResponse = await fetchAuthService(path, {
    method: "POST",
    headers: buildJsonHeaders(),
    body: JSON.stringify(parsedBody.body),
  });

  if (!upstreamResponse.ok) {
    return mapUpstreamError(upstreamResponse);
  }

  const currentSession = await resolveSessionFromUpstream(upstreamResponse);

  if (!currentSession) {
    return errorResponse(
      bffError(
        502,
        "UPSTREAM_AUTH_CONTRACT_ERROR",
        "Authentication service did not return a usable session.",
      ),
    );
  }

  const nextCsrf = await issueCsrfToken();
  const response = NextResponse.json<AuthPayload>(
    {
      user: currentSession.user,
      csrfToken: nextCsrf.token,
    },
    {
      headers: noStoreHeaders(),
    },
  );

  await applySessionCookies(response, currentSession);
  setCsrfCookie(response, nextCsrf.cookieValue);

  return response;
}

async function validateAuthCsrf(request: NextRequest): Promise<Response | null> {
  const result = await validateCsrfRequest({
    method: request.method,
    headers: request.headers,
    cookieValue: request.cookies.get(CSRF_COOKIE_NAME)?.value,
    submittedToken: extractCsrfToken(request.headers),
  });

  if (result.ok) {
    return null;
  }

  return errorResponse(
    bffError(403, "FORBIDDEN", csrfFailureMessage(result.reason)),
  );
}

async function readSessionFromRequest(
  request: NextRequest,
): Promise<UpstreamSessionSnapshot | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  const stateCookie = request.cookies.get(SESSION_STATE_COOKIE_NAME)?.value ?? null;

  if (!sessionToken) {
    return null;
  }

  if (stateCookie) {
    const decodedState = await decodeSessionState(stateCookie);

    if (decodedState) {
      return {
        token: sessionToken,
        user: toSessionUser(decodedState),
        expiresAt: decodedState.expiresAt,
      };
    }
  }

  const upstreamResponse = await fetchAuthService("/api/auth/session", {
    headers: buildJsonHeaders({
      cookie: serializeBackendSessionCookie(sessionToken),
    }),
  });

  if (upstreamResponse.status === 401) {
    return null;
  }

  if (!upstreamResponse.ok) {
    throw new UpstreamAuthError(
      await toBffError(upstreamResponse),
    );
  }

  return resolveSessionFromUpstream(upstreamResponse, sessionToken);
}

async function resolveSessionFromUpstream(
  upstreamResponse: Response,
  fallbackSessionToken?: string,
): Promise<UpstreamSessionSnapshot | null> {
  const upstreamBody = await safeReadJson(upstreamResponse);
  const sessionCookie = extractSessionCookie(
    upstreamResponse.headers.get("set-cookie"),
  );
  const sessionToken = sessionCookie?.token ?? fallbackSessionToken ?? null;

  if (!sessionToken) {
    return null;
  }

  const user = normalizeSessionUser(upstreamBody);

  if (!user) {
    const revalidatedUser = await fetchSessionUser(sessionToken);

    if (!revalidatedUser) {
      return null;
    }

    return {
      token: sessionToken,
      user: revalidatedUser.user,
      expiresAt: sessionCookie?.expiresAt ?? revalidatedUser.expiresAt,
    };
  }

  return {
    token: sessionToken,
    user,
    expiresAt: resolveExpiryEpochSeconds(upstreamBody, sessionCookie),
  };
}

async function fetchSessionUser(
  sessionToken: string,
): Promise<{ user: SessionUser; expiresAt: number } | null> {
  const upstreamResponse = await fetchAuthService("/api/auth/session", {
    headers: buildJsonHeaders({
      cookie: serializeBackendSessionCookie(sessionToken),
    }),
  });

  if (!upstreamResponse.ok) {
    return null;
  }

  const upstreamBody = await safeReadJson(upstreamResponse);
  const user = normalizeSessionUser(upstreamBody);

  if (!user) {
    return null;
  }

  return {
    user,
    expiresAt: resolveExpiryEpochSeconds(
      upstreamBody,
      extractSessionCookie(upstreamResponse.headers.get("set-cookie")),
    ),
  };
}

async function applySessionCookies(
  response: NextResponse,
  session: UpstreamSessionSnapshot,
): Promise<void> {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = Math.max(session.expiresAt, nowInSeconds + 60);
  const maxAge = Math.max(expiresAt - nowInSeconds, 60);
  const stateCookie = await encodeSessionState({
    sub: session.user.accountId,
    role: session.user.role,
    profileId: session.user.profileId ?? null,
    iat: nowInSeconds,
    exp: expiresAt,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge,
  });

  response.cookies.set({
    name: SESSION_STATE_COOKIE_NAME,
    value: stateCookie,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge,
  });
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: SESSION_STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 0,
  });
}

function setCsrfCookie(response: NextResponse, cookieValue: string): void {
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: cookieValue,
    httpOnly: false,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
  });
}

async function parseRequestBody<T>(
  request: NextRequest,
): Promise<{ ok: true; body: T } | { ok: false; error: BffError }> {
  try {
    return {
      ok: true,
      body: (await request.json()) as T,
    };
  } catch {
    return {
      ok: false,
      error: bffError(
        422,
        "VALIDATION_ERROR",
        "Request body must be valid JSON.",
      ),
    };
  }
}

async function fetchAuthService(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(serviceUrl("USER", path), {
      ...init,
      cache: "no-store",
    });
  } catch {
    return errorResponse(
      bffError(
        502,
        "UPSTREAM_UNAVAILABLE",
        "Authentication service is unavailable.",
      ),
    );
  }
}

async function toBffError(response: Response): Promise<BffError> {
  const parsedBody = await safeReadJson(response);
  const fieldErrors = extractFieldErrors(parsedBody);
  const message =
    extractMessage(parsedBody) ??
    defaultErrorMessage(response.status);

  if (response.status === 401) {
    return bffError(401, "UNAUTHORIZED", message);
  }

  if (response.status === 403) {
    return bffError(403, "FORBIDDEN", message);
  }

  if (response.status === 422 || response.status === 400) {
    return bffError(422, "VALIDATION_ERROR", message, fieldErrors);
  }

  if (response.status >= 500) {
    return bffError(
      response.status,
      "UPSTREAM_ERROR",
      "Authentication service failed to process the request.",
    );
  }

  return bffError(response.status, "AUTH_ERROR", message, fieldErrors);
}

async function mapUpstreamError(upstreamResponse: Response): Promise<Response> {
  return errorResponse(await toBffError(upstreamResponse));
}

function normalizeSessionUser(input: unknown): SessionUser | null {
  if (!isRecord(input)) {
    return null;
  }

  const role = normalizeRole(
    pickString(
      input.role,
      input.accountRole,
      input.userRole,
      isRecord(input.account) ? input.account.role : undefined,
    ),
  );
  const accountId = pickString(
    input.accountId,
    input.userId,
    input.id,
    input.sub,
    isRecord(input.account) ? input.account.id : undefined,
  );
  const profileId = pickString(
    input.profileId,
    input.adopterId,
    input.employeeId,
    isRecord(input.profile) ? input.profile.id : undefined,
    isRecord(input.adopter) ? input.adopter.id : undefined,
    isRecord(input.employee) ? input.employee.id : undefined,
  );

  if (!role || !accountId) {
    return null;
  }

  return profileId ? { role, accountId, profileId } : { role, accountId };
}

function normalizeRole(value: string | null): UserRole | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (AUTH_ROLE_VALUES.includes(normalizedValue as UserRole)) {
    return normalizedValue as UserRole;
  }

  if (normalizedValue === LEGACY_STAFF_ROLE_ALIAS) {
    return "STAFF";
  }

  if (normalizedValue === LEGACY_ADMIN_ROLE_ALIAS) {
    return "ADMIN";
  }

  return null;
}

function resolveExpiryEpochSeconds(
  input: unknown,
  sessionCookie: ExtractedSessionCookie | null,
): number {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (sessionCookie?.expiresAt) {
    return sessionCookie.expiresAt;
  }

  if (isRecord(input)) {
    const explicitExpiry = pickNumber(
      input.expiresAt,
      input.expiresAtEpochSeconds,
      input.exp,
      isRecord(input.session) ? input.session.expiresAt : undefined,
    );

    if (explicitExpiry) {
      return explicitExpiry;
    }

    const expiresIn = pickNumber(
      input.expiresIn,
      input.expiresInSeconds,
      isRecord(input.session) ? input.session.expiresIn : undefined,
    );

    if (expiresIn) {
      return nowInSeconds + expiresIn;
    }
  }

  return nowInSeconds + DEFAULT_SESSION_TTL_SECONDS;
}

function extractSessionCookie(setCookieHeader: string | null): ExtractedSessionCookie | null {
  if (!setCookieHeader) {
    return null;
  }

  const parts = splitSetCookieHeader(setCookieHeader);

  for (const part of parts) {
    const [cookiePair, ...attributes] = part.split(";").map((value) => value.trim());

    if (!cookiePair.startsWith(`${AUTH_BACKEND_SESSION_COOKIE_NAME}=`)) {
      continue;
    }

    const token = cookiePair.slice(AUTH_BACKEND_SESSION_COOKIE_NAME.length + 1);
    let expiresAt: number | null = null;

    for (const attribute of attributes) {
      const [key, rawValue] = attribute.split("=");
      const normalizedKey = key.toLowerCase();

      if (normalizedKey === "max-age") {
        const parsedValue = Number.parseInt(rawValue ?? "", 10);

        if (Number.isFinite(parsedValue)) {
          expiresAt = Math.floor(Date.now() / 1000) + parsedValue;
        }
      }

      if (normalizedKey === "expires") {
        const parsedDate = Date.parse(rawValue ?? "");

        if (!Number.isNaN(parsedDate)) {
          expiresAt = Math.floor(parsedDate / 1000);
        }
      }
    }

    return {
      token: decodeURIComponent(token),
      expiresAt,
    };
  }

  return null;
}

function splitSetCookieHeader(value: string): string[] {
  const cookies: string[] = [];
  let current = "";
  let inExpiresAttribute = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === ",") {
      if (inExpiresAttribute) {
        current += character;
        continue;
      }

      cookies.push(current.trim());
      current = "";
      continue;
    }

    current += character;

    if (current.toLowerCase().endsWith("expires=")) {
      inExpiresAttribute = true;
    } else if (inExpiresAttribute && character === ";") {
      inExpiresAttribute = false;
    }
  }

  if (current.trim()) {
    cookies.push(current.trim());
  }

  return cookies;
}

export function serializeBackendSessionCookie(sessionToken: string): string {
  return `${AUTH_BACKEND_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`;
}

function buildJsonHeaders(extraHeaders?: Record<string, string>): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function extractMessage(input: unknown): string | null {
  if (!isRecord(input)) {
    return null;
  }

  return pickString(input.message, input.error, input.detail, input.title);
}

function extractFieldErrors(input: unknown): Record<string, string[]> | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const directFieldErrors = toFieldErrorsRecord(input.fieldErrors ?? input.errors);

  if (directFieldErrors) {
    return directFieldErrors;
  }

  if (Array.isArray(input.violations)) {
    const aggregated: Record<string, string[]> = {};

    for (const violation of input.violations) {
      if (!isRecord(violation)) {
        continue;
      }

      const field = pickString(violation.field, violation.property, violation.path);
      const message = pickString(violation.message);

      if (!field || !message) {
        continue;
      }

      aggregated[field] ??= [];
      aggregated[field].push(message);
    }

    return Object.keys(aggregated).length > 0 ? aggregated : undefined;
  }

  return undefined;
}

function toFieldErrorsRecord(input: unknown): Record<string, string[]> | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const output: Record<string, string[]> = {};

  for (const [field, value] of Object.entries(input)) {
    if (typeof value === "string" && value) {
      output[field] = [value];
      continue;
    }

    if (Array.isArray(value)) {
      const messages = value.filter(
        (entry): entry is string => typeof entry === "string" && entry.length > 0,
      );

      if (messages.length > 0) {
        output[field] = messages;
      }
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.clone().json()) as unknown;
  } catch {
    return null;
  }
}

function toSessionUser(session: AuthSession): SessionUser {
  return session.profileId
    ? {
        accountId: session.accountId,
        role: session.role,
        profileId: session.profileId,
      }
    : {
        accountId: session.accountId,
        role: session.role,
      };
}

function csrfFailureMessage(
  reason:
    | "missing_origin"
    | "invalid_origin"
    | "missing_cookie"
    | "invalid_cookie"
    | "missing_token"
    | "token_mismatch",
): string {
  switch (reason) {
    case "missing_origin":
      return "CSRF validation failed: missing request origin.";
    case "invalid_origin":
      return "CSRF validation failed: request origin is not trusted.";
    case "missing_cookie":
      return "CSRF validation failed: token cookie is missing.";
    case "invalid_cookie":
      return "CSRF validation failed: token cookie is invalid.";
    case "missing_token":
      return "CSRF validation failed: header token is missing.";
    case "token_mismatch":
      return "CSRF validation failed: submitted token does not match cookie.";
  }
}

function defaultErrorMessage(status: number): string {
  if (status === 401) {
    return "Authentication is required.";
  }

  if (status === 403) {
    return "You are not allowed to perform this action.";
  }

  if (status === 400 || status === 422) {
    return "Request validation failed.";
  }

  if (status >= 500) {
    return "Authentication service failed to process the request.";
  }

  return "Authentication request failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
  };
}

class UpstreamAuthError extends Error {
  readonly responseError: BffError;

  constructor(responseError: BffError) {
    super(responseError.message);
    this.responseError = responseError;
  }
}
