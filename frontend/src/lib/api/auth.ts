import type { SessionUser, LoginRequest, SignupRequest } from "@/lib/types";
import { serviceUrl } from "./client";

export async function login(body: LoginRequest): Promise<void> {
  const res = await fetch(serviceUrl("USER", "/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
}

export async function signup(body: SignupRequest): Promise<void> {
  const res = await fetch(serviceUrl("USER", "/api/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Signup failed: ${res.status}`);
}

export async function validateSession(sessionToken: string): Promise<SessionUser | null> {
  const res = await fetch(serviceUrl("USER", "/api/auth/session"), {
    headers: { Cookie: `session=${sessionToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function logout(sessionToken: string): Promise<void> {
  const res = await fetch(serviceUrl("USER", "/api/auth/logout"), {
    method: "POST",
    headers: { Cookie: `session=${sessionToken}` },
  });
  if (!res.ok) throw new Error(`Logout failed: ${res.status}`);
}
