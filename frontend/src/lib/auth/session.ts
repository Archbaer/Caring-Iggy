import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "ci_session";
export const SESSION_STATE_COOKIE_NAME = "ci_session_state";

export const AUTH_ROLE_VALUES = ["ADOPTER", "STAFF", "ADMIN"] as const;

export type UserRole = (typeof AUTH_ROLE_VALUES)[number];

export interface SessionStatePayload {
  version: 1;
  sub: string;
  role: UserRole;
  profileId: string | null;
  iat: number;
  exp: number;
}

export interface AuthSession {
  accountId: string;
  role: UserRole;
  profileId: string | null;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_STATE_VERSION = 1;

export function decodeUserRole(value: string | null | undefined): UserRole | null {
  if (value === null || value === undefined) {
    return null;
  }

  return AUTH_ROLE_VALUES.includes(value as UserRole) ? (value as UserRole) : null;
}

export function isAuthenticatedSession(
  session: AuthSession | null | undefined,
): session is AuthSession {
  return Boolean(session);
}

export async function encodeSessionState(
  input: Omit<SessionStatePayload, "version">,
): Promise<string> {
  const payload: SessionStatePayload = {
    version: SESSION_STATE_VERSION,
    ...input,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await signValue(encodedPayload, getSessionSigningSecret());

  return `${encodedPayload}.${signature}`;
}

export async function decodeSessionState(
  cookieValue: string | null | undefined,
): Promise<AuthSession | null> {
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, providedSignature] = cookieValue.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = await signValue(
    encodedPayload,
    getSessionSigningSecret(),
  );

  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  let parsedPayload: SessionStatePayload;

  try {
    parsedPayload = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as SessionStatePayload;
  } catch {
    return null;
  }

  if (parsedPayload.version !== SESSION_STATE_VERSION) {
    return null;
  }

  const role = decodeUserRole(parsedPayload.role);

  if (
    !role ||
    typeof parsedPayload.sub !== "string" ||
    typeof parsedPayload.iat !== "number" ||
    typeof parsedPayload.exp !== "number" ||
    (parsedPayload.profileId !== null && typeof parsedPayload.profileId !== "string")
  ) {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (parsedPayload.exp <= nowInSeconds) {
    return null;
  }

  return {
    accountId: parsedPayload.sub,
    role,
    profileId: parsedPayload.profileId,
    issuedAt: parsedPayload.iat,
    expiresAt: parsedPayload.exp,
  };
}

export async function getSessionFromRequest(
  request: NextRequest | Request,
): Promise<AuthSession | null> {
  const sessionToken = readCookie(request, SESSION_COOKIE_NAME);
  const stateCookie = readCookie(request, SESSION_STATE_COOKIE_NAME);

  if (!sessionToken || !stateCookie) {
    return null;
  }

  return decodeSessionState(stateCookie);
}

function readCookie(request: NextRequest | Request, cookieName: string): string | null {
  if ("cookies" in request) {
    return request.cookies.get(cookieName)?.value ?? null;
  }

  return readCookieFromHeader(request.headers.get("cookie"), cookieName);
}

function readCookieFromHeader(
  cookieHeader: string | null,
  cookieName: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();

    if (trimmedCookie.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(trimmedCookie.slice(cookieName.length + 1));
    }
  }

  return null;
}

function getSessionSigningSecret(): string {
  const configuredSecret =
    process.env.AUTH_SESSION_STATE_SECRET ?? process.env.AUTH_SIGNING_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "caring-iggy-local-auth-secret";
  }

  throw new Error("Missing AUTH_SESSION_STATE_SECRET for session signing.");
}

async function signValue(value: string, secret: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    textEncoder.encode(value),
  );

  return encodeBytesBase64Url(new Uint8Array(signature));
}

function encodeBase64Url(value: string): string {
  return encodeBytesBase64Url(textEncoder.encode(value));
}

function decodeBase64Url(value: string): string {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
    "=",
  );

  return atob(paddedValue);
}

function encodeBytesBase64Url(value: Uint8Array): string {
  let binary = "";

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

const textEncoder = new TextEncoder();
