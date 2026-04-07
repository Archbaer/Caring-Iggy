import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/session";
import { evaluatePathAccess, LOGIN_ROUTE } from "@/lib/auth/role-check";

export async function middleware(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const accessDecision = evaluatePathAccess(request.nextUrl.pathname, session);

  if (accessDecision.action === "allow") {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = accessDecision.destination;

  if (accessDecision.destination === LOGIN_ROUTE) {
    redirectUrl.searchParams.set(
      "redirect",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  } else {
    redirectUrl.searchParams.delete("redirect");
  }

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/login", "/signup", "/dashboard/:path*"],
};
