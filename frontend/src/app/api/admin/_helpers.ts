import type { NextRequest } from "next/server";

import { bffError, errorResponse } from "@/lib/api/client";
import {
  CSRF_COOKIE_NAME,
  extractCsrfToken,
  validateCsrfRequest,
} from "@/lib/auth/csrf";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function requireAdminRequest(
  request: NextRequest,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      ok: false,
      response: errorResponse(
        bffError(401, "UNAUTHORIZED", "Sign in to access admin routes."),
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      ok: false,
      response: errorResponse(
        bffError(403, "FORBIDDEN", "Only admin accounts can access this route."),
      ),
    };
  }

  return { ok: true };
}

export async function validateMutationCsrf(
  request: NextRequest,
): Promise<{ ok: true } | { ok: false; response: Response }> {
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
