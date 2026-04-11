import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  defaultRouteForRole,
  hasAnyRole,
  LOGIN_ROUTE,
} from "@/lib/auth/role-check";
import {
  SESSION_COOKIE_NAME,
  SESSION_STATE_COOKIE_NAME,
  decodeSessionState,
  type AuthSession,
  type UserRole,
} from "@/lib/auth/session";

export async function getCurrentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const sessionState = cookieStore.get(SESSION_STATE_COOKIE_NAME)?.value ?? null;

  if (!sessionToken || !sessionState) {
    return null;
  }

  return decodeSessionState(sessionState);
}

export async function getRequiredRoleSession(role: UserRole): Promise<AuthSession> {
  const session = await getCurrentSession();

  if (!session) {
    redirect(LOGIN_ROUTE);
  }

  if (session.role !== role) {
    redirect(defaultRouteForRole(session.role));
  }

  return session;
}

export async function getRequiredRoleGroupSession(
  roles: readonly UserRole[],
): Promise<AuthSession> {
  const session = await getCurrentSession();

  if (!session) {
    redirect(LOGIN_ROUTE);
  }

  if (!hasAnyRole(session, roles)) {
    redirect(defaultRouteForRole(session.role));
  }

  return session;
}
