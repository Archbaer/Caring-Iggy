import type { NextRequest } from "next/server";

import { updateAnimal } from "@/lib/api/animals";
import { errorResponse, jsonResponse } from "@/lib/api/client";

import {
  parseUpdateAnimalBody,
  requireAnimalEditorRequest,
  toAnimalBffError,
  validateAnimalMutationCsrf,
} from "../../_helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
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

  const parsedBody = await parseUpdateAnimalBody(request);

  if (!parsedBody.ok) {
    return errorResponse(parsedBody.error);
  }

  try {
    const { id } = await context.params;
    return jsonResponse(await updateAnimal(id, parsedBody.body), { status: 200 });
  } catch (error) {
    return errorResponse(
      toAnimalBffError(error, "Animal updates could not be saved right now."),
    );
  }
}
