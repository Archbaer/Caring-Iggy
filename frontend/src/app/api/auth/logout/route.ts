import type { NextRequest } from "next/server";

import { handleLogoutRoute } from "@/lib/auth/server";

export async function POST(request: NextRequest): Promise<Response> {
  return handleLogoutRoute(request);
}
