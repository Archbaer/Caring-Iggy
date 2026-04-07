export const CSRF_COOKIE_NAME = "ci_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type CsrfValidationResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason:
        | "missing_origin"
        | "invalid_origin"
        | "missing_cookie"
        | "invalid_cookie"
        | "missing_token"
        | "token_mismatch";
    };

export interface CsrfValidationOptions {
  method: string;
  headers: Headers;
  cookieValue: string | null | undefined;
  submittedToken: string | null | undefined;
  allowedOrigins?: readonly string[];
}

export interface IssuedCsrfToken {
  token: string;
  cookieValue: string;
}

export function isCsrfProtectedMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export async function issueCsrfToken(): Promise<IssuedCsrfToken> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = encodeBytesBase64Url(randomBytes);
  const signature = await signValue(token, getCsrfSigningSecret());

  return {
    token,
    cookieValue: `${token}.${signature}`,
  };
}

export async function validateCsrfRequest(
  options: CsrfValidationOptions,
): Promise<CsrfValidationResult> {
  if (!isCsrfProtectedMethod(options.method)) {
    return { ok: true, token: "" };
  }

  if (!hasTrustedSource(options.headers, options.allowedOrigins)) {
    return {
      ok: false,
      reason: getSourceFailureReason(options.headers),
    };
  }

  if (!options.cookieValue) {
    return { ok: false, reason: "missing_cookie" };
  }

  const cookieToken = await readSignedCsrfCookie(options.cookieValue);

  if (!cookieToken) {
    return { ok: false, reason: "invalid_cookie" };
  }

  if (!options.submittedToken) {
    return { ok: false, reason: "missing_token" };
  }

  if (!timingSafeEqual(cookieToken, options.submittedToken)) {
    return { ok: false, reason: "token_mismatch" };
  }

  return { ok: true, token: cookieToken };
}

export function extractCsrfToken(headers: Headers): string | null {
  return headers.get(CSRF_HEADER_NAME);
}

async function readSignedCsrfCookie(
  cookieValue: string,
): Promise<string | null> {
  const [token, providedSignature] = cookieValue.split(".");

  if (!token || !providedSignature) {
    return null;
  }

  const expectedSignature = await signValue(token, getCsrfSigningSecret());

  return timingSafeEqual(expectedSignature, providedSignature) ? token : null;
}

function hasTrustedSource(
  headers: Headers,
  allowedOrigins: readonly string[] = [],
): boolean {
  const sourceHeader = headers.get("origin") ?? headers.get("referer");

  if (!sourceHeader) {
    return false;
  }

  let sourceOrigin: string;

  try {
    sourceOrigin = new URL(sourceHeader).origin;
  } catch {
    return false;
  }

  const trustedOrigins = new Set<string>(allowedOrigins);
  const forwardedHost = headers.get("x-forwarded-host") ?? headers.get("host");
  const forwardedProtocol =
    headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  if (forwardedHost) {
    trustedOrigins.add(`${forwardedProtocol}://${forwardedHost}`);
  }

  if (process.env.APP_ORIGIN) {
    trustedOrigins.add(process.env.APP_ORIGIN);
  }

  return trustedOrigins.has(sourceOrigin);
}

function getSourceFailureReason(
  headers: Headers,
): "missing_origin" | "invalid_origin" {
  return headers.get("origin") ?? headers.get("referer")
    ? "invalid_origin"
    : "missing_origin";
}

function getCsrfSigningSecret(): string {
  const configuredSecret =
    process.env.AUTH_CSRF_SECRET ??
    process.env.AUTH_SIGNING_SECRET ??
    process.env.AUTH_SESSION_STATE_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "caring-iggy-local-csrf-secret";
  }

  throw new Error("Missing AUTH_CSRF_SECRET for CSRF signing.");
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
