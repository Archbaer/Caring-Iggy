import type { NextRequest } from "next/server";

import { bffError, errorResponse, jsonResponse } from "@/lib/api/client";
import { SERVICES } from "@/lib/constants/config";
import { requireAdminRequest } from "../../admin/_helpers";

export async function GET(request: NextRequest): Promise<Response> {
  const access = await requireAdminRequest(request);
  if (!access.ok) return access.response;

  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse(
      bffError(400, "VALIDATION_ERROR", "month must be in YYYY-MM format"),
    );
  }

  try {
    const upstream = await fetch(
      `${SERVICES.REPORTING}/api/reports/adoptions?month=${month}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const body = await upstream.json();
    return jsonResponse(body, { status: upstream.status });
  } catch {
    return errorResponse(
      bffError(503, "UPSTREAM_ERROR", "Adoption report could not be loaded right now."),
    );
  }
}
