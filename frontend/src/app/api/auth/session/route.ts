import type { NextRequest } from "next/server";

import { handleSessionRoute } from "@/lib/auth/server";

export async function GET(request: NextRequest): Promise<Response> {
  return handleSessionRoute(request);
}
