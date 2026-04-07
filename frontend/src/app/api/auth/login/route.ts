import type { NextRequest } from "next/server";

import { handleLoginRoute } from "@/lib/auth/server";

export async function POST(request: NextRequest): Promise<Response> {
  return handleLoginRoute(request);
}
