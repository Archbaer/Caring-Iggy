import type { AuthSession, UserRole } from "@/lib/auth/session";

export const LOGIN_ROUTE = "/login";
export const SIGNUP_ROUTE = "/signup";
export const DASHBOARD_ROUTE = "/dashboard";
export const ADMIN_ROUTE_PREFIX = "/dashboard/admin";
export const ADMIN_DEFAULT_ROUTE = "/dashboard/admin";
export const STAFF_DEFAULT_ROUTE = "/dashboard";

export type PathAccessDecision =
  | { action: "allow" }
  | { action: "redirect"; destination: string };

export function isDashboardPath(pathname: string): boolean {
  return pathname === DASHBOARD_ROUTE || pathname.startsWith(`${DASHBOARD_ROUTE}/`);
}

export function isAdminManagementPath(pathname: string): boolean {
  return (
    pathname === ADMIN_ROUTE_PREFIX || pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`)
  );
}

export function isAuthPage(pathname: string): boolean {
  return pathname === LOGIN_ROUTE || pathname === SIGNUP_ROUTE;
}

export function hasAnyRole(
  session: AuthSession | null | undefined,
  roles: readonly UserRole[],
): boolean {
  return Boolean(session && roles.includes(session.role));
}

export function defaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return ADMIN_DEFAULT_ROUTE;
    case "STAFF":
      return STAFF_DEFAULT_ROUTE;
    case "ADOPTER":
      return DASHBOARD_ROUTE;
  }
}

export function resolveAuthenticatedRedirect(
  session: AuthSession,
  requestedRedirect: string | null | undefined,
): string {
  const safeRedirect = normalizeSafeRedirect(requestedRedirect);

  if (safeRedirect) {
    const accessDecision = evaluatePathAccess(safeRedirect.pathname, session);

    if (accessDecision.action === "allow") {
      return `${safeRedirect.pathname}${safeRedirect.search}${safeRedirect.hash}`;
    }
  }

  return defaultRouteForRole(session.role);
}

export function evaluatePathAccess(
  pathname: string,
  session: AuthSession | null,
): PathAccessDecision {
  if (isAuthPage(pathname)) {
    return session
      ? { action: "redirect", destination: defaultRouteForRole(session.role) }
      : { action: "allow" };
  }

  if (!isDashboardPath(pathname)) {
    return { action: "allow" };
  }

  if (!session) {
    return { action: "redirect", destination: LOGIN_ROUTE };
  }

  if (isAdminManagementPath(pathname) && !hasAnyRole(session, ["ADMIN"])) {
    return { action: "redirect", destination: defaultRouteForRole(session.role) };
  }

  return { action: "allow" };
}

function normalizeSafeRedirect(
  requestedRedirect: string | null | undefined,
): URL | null {
  if (!requestedRedirect || !requestedRedirect.startsWith("/")) {
    return null;
  }

  if (requestedRedirect.startsWith("//")) {
    return null;
  }

  try {
    const parsed = new URL(requestedRedirect, "https://caring-iggy.local");

    return parsed.origin === "https://caring-iggy.local" ? parsed : null;
  } catch {
    return null;
  }
}
