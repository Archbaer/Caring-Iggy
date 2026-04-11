import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_STATE_COOKIE_NAME,
  decodeSessionState,
  type AuthSession,
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
