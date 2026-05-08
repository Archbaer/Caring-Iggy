import type { NextRequest } from "next/server";

import { fetchAdminAdopters, toAdminBffError } from "@/lib/api/admin";
import { errorResponse, jsonResponse } from "@/lib/api/client";
import { checkTestSimulateFailure } from "@/lib/auth/server";

import { requireAdminRequest } from "../_helpers";

export async function GET(request: NextRequest): Promise<Response> {
  const access = await requireAdminRequest(request);

  if (!access.ok) {
    return access.response;
  }

  const simulatedFailure = checkTestSimulateFailure(request);
  if (simulatedFailure) return simulatedFailure;

  try {
    return jsonResponse(await fetchAdminAdopters(), { status: 200 });
  } catch (error) {
    return errorResponse(
      toAdminBffError(error, "Adopter records could not be loaded right now."),
    );
  }
}
