import type { NextRequest } from "next/server";

import { handleSignupRoute } from "@/lib/auth/server";

export async function POST(request: NextRequest): Promise<Response> {
  return handleSignupRoute(request);
}
