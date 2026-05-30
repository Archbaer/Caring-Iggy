import type { NextRequest } from "next/server";

import { revalidateTag } from "next/cache";

import { deleteAnimal } from "@/lib/api/animals";
import { errorResponse, jsonResponse } from "@/lib/api/client";
import { checkTestSimulateFailure } from "@/lib/auth/server";

import {
  requireAnimalEditorRequest,
  toAnimalBffError,
  validateAnimalMutationCsrf,
} from "../../_helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const access = await requireAnimalEditorRequest(request);

  if (!access.ok) {
    return access.response;
  }

  const csrf = await validateAnimalMutationCsrf(request);

  if (!csrf.ok) {
    return csrf.response;
  }

  const simulatedFailure = checkTestSimulateFailure(request);
  if (simulatedFailure) return simulatedFailure;

  try {
    const { id } = await context.params;
    await deleteAnimal(id);
    revalidateTag("animals", "default");
    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    return errorResponse(
      toAnimalBffError(error, "Animal deletion could not be completed right now."),
    );
  }
}
