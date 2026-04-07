import type { AuthSession, UserRole } from "@/lib/auth/session";

export const LOGIN_ROUTE = "/login";
export const SIGNUP_ROUTE = "/signup";
export const DASHBOARD_ROUTE = "/dashboard";
export const ADMIN_ROUTE_PREFIX = "/dashboard/admin";

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

export function evaluatePathAccess(
  pathname: string,
  session: AuthSession | null,
): PathAccessDecision {
  if (isAuthPage(pathname)) {
    return session
      ? { action: "redirect", destination: DASHBOARD_ROUTE }
      : { action: "allow" };
  }

  if (!isDashboardPath(pathname)) {
    return { action: "allow" };
  }

  if (!session) {
    return { action: "redirect", destination: LOGIN_ROUTE };
  }

  if (isAdminManagementPath(pathname) && !hasAnyRole(session, ["ADMIN"])) {
    return { action: "redirect", destination: DASHBOARD_ROUTE };
  }

  return { action: "allow" };
}
