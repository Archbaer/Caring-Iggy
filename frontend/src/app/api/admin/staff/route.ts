import type { NextRequest } from "next/server";

import {
  fetchAdminEmployees,
  provisionStaff,
  toAdminBffError,
  type ProvisionStaffRequest,
} from "@/lib/api/admin";
import { bffError, errorResponse, jsonResponse } from "@/lib/api/client";

import { requireAdminRequest, validateMutationCsrf } from "../_helpers";

export async function GET(request: NextRequest): Promise<Response> {
  const access = await requireAdminRequest(request);

  if (!access.ok) {
    return access.response;
  }

  try {
    return jsonResponse(await fetchAdminEmployees(), { status: 200 });
  } catch (error) {
    return errorResponse(
      toAdminBffError(error, "Employee records could not be loaded right now."),
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const access = await requireAdminRequest(request);

  if (!access.ok) {
    return access.response;
  }

  const csrf = await validateMutationCsrf(request);

  if (!csrf.ok) {
    return csrf.response;
  }

  const parsedBody = await parseProvisionBody(request);

  if (!parsedBody.ok) {
    return errorResponse(parsedBody.error);
  }

  try {
    return jsonResponse(await provisionStaff(parsedBody.body), { status: 201 });
  } catch (error) {
    return errorResponse(
      toAdminBffError(error, "Staff provisioning could not be completed right now."),
    );
  }
}

async function parseProvisionBody(
  request: NextRequest,
): Promise<
  | { ok: true; body: ProvisionStaffRequest }
  | { ok: false; error: ReturnType<typeof bffError> }
> {
  const body = await readJsonBody(request);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }

  const name = readRequiredString(body.name);
  const email = readRequiredString(body.email);
  const password = readRequiredString(body.password);
  const telephone = readOptionalString(body.telephone);
  const role = body.role === "ADMIN" ? "ADMIN" : body.role === "STAFF" ? "STAFF" : null;

  if (!name || !email || !password || !role) {
    return {
      ok: false,
      error: bffError(
        422,
        "VALIDATION_ERROR",
        "Name, email, password, and a valid employee role are required.",
      ),
    };
  }

  return {
    ok: true,
    body: {
      name,
      email,
      password,
      role,
      ...(telephone ? { telephone } : {}),
    },
  };
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
