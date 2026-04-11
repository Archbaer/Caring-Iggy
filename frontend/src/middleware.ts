import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/session";
import {
  evaluatePathAccess,
  isAuthPage,
  LOGIN_ROUTE,
  resolveAuthenticatedRedirect,
} from "@/lib/auth/role-check";

export async function middleware(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const pathname = request.nextUrl.pathname;

  if (session && isAuthPage(pathname)) {
    const destination = resolveAuthenticatedRedirect(
      session,
      request.nextUrl.searchParams.get("redirect"),
    );
    const redirectUrl = request.nextUrl.clone();
    const parsedDestination = new URL(destination, request.nextUrl.origin);

    redirectUrl.pathname = parsedDestination.pathname;
    redirectUrl.search = parsedDestination.search;
    redirectUrl.hash = parsedDestination.hash;

    return NextResponse.redirect(redirectUrl);
  }

  const accessDecision = evaluatePathAccess(pathname, session);

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
