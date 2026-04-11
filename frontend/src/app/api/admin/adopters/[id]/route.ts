import type { NextRequest } from "next/server";

import { fetchAdminAdopterDetail, toAdminBffError } from "@/lib/api/admin";
import { errorResponse, jsonResponse } from "@/lib/api/client";

import { requireAdminRequest } from "../../_helpers";

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
