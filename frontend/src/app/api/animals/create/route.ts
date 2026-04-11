import type { NextRequest } from "next/server";

import { createAnimal } from "@/lib/api/animals";
import { errorResponse, jsonResponse } from "@/lib/api/client";

import {
  parseCreateAnimalBody,
  requireAnimalEditorRequest,
  toAnimalBffError,
  validateAnimalMutationCsrf,
} from "../_helpers";

export async function POST(request: NextRequest): Promise<Response> {
  const access = await requireAnimalEditorRequest(request);

  if (!access.ok) {
    return access.response;
  }

  const csrf = await validateAnimalMutationCsrf(request);

  if (!csrf.ok) {
    return csrf.response;
  }

  const parsedBody = await parseCreateAnimalBody(request);

  if (!parsedBody.ok) {
    return errorResponse(parsedBody.error);
  }

  try {
    return jsonResponse(await createAnimal(parsedBody.body), { status: 201 });
  } catch (error) {
    return errorResponse(
      toAnimalBffError(error, "Animal creation could not be completed right now."),
    );
  }
}
