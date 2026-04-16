import type { NextRequest } from "next/server";

import {
  fetchAdminAdopterDetail,
  toAdminBffError,
  updateAdopter,
  type UpdateAdopterRequest,
} from "@/lib/api/admin";
import { bffError, errorResponse, jsonResponse } from "@/lib/api/client";

import { requireAdminRequest, validateMutationCsrf } from "../../_helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const access = await requireAdminRequest(request);

  if (!access.ok) {
    return access.response;
  }

  try {
    const { id } = await context.params;
    return jsonResponse(await fetchAdminAdopterDetail(id), { status: 200 });
  } catch (error) {
    return errorResponse(
      toAdminBffError(error, "Adopter details could not be loaded right now."),
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const access = await requireAdminRequest(request);

  if (!access.ok) {
    return access.response;
  }

  const csrf = await validateMutationCsrf(request);

  if (!csrf.ok) {
    return csrf.response;
  }

  const parsedBody = await parseUpdateBody(request);

  if (!parsedBody.ok) {
    return errorResponse(parsedBody.error);
  }

  try {
    const { id } = await context.params;
    return jsonResponse(await updateAdopter(id, parsedBody.body), { status: 200 });
  } catch (error) {
    return errorResponse(
      toAdminBffError(error, "Adopter details could not be updated right now."),
    );
  }
}

async function parseUpdateBody(
  request: NextRequest,
): Promise<
  | { ok: true; body: UpdateAdopterRequest }
  | { ok: false; error: ReturnType<typeof bffError> }
> {
  const body = await readJsonBody(request);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }

  const status = readOptionalString(body.status);
  const nextBody: UpdateAdopterRequest = {
    ...(readOptionalString(body.name) ? { name: readOptionalString(body.name) } : {}),
    ...(readOptionalString(body.telephone) ? { telephone: readOptionalString(body.telephone) } : {}),
    ...(readOptionalString(body.email) ? { email: readOptionalString(body.email) } : {}),
    ...(readOptionalString(body.address) ? { address: readOptionalString(body.address) } : {}),
    ...(status ? { status } : {}),
    ...(body.preferences && typeof body.preferences === "object" ? { preferences: body.preferences as Record<string, unknown> } : {}),
  };

  if (Object.keys(nextBody).length === 0) {
    return {
      ok: false,
      error: bffError(422, "VALIDATION_ERROR", "Provide at least one field to update."),
    };
  }

  return { ok: true, body: nextBody };
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}