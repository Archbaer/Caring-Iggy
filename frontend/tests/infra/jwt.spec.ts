import { test, expect, request, APIRequestContext, APIResponse } from "@playwright/test";

// Serial: the rate-limit hammer below must run AFTER the JWT login, and never in parallel with it.
test.describe.configure({ mode: "serial" });

const base = process.env.KONG_URL ?? "http://localhost:8000";
const staff = {
  email: process.env.TEST_STAFF_EMAIL ?? "teststaff@caringiggy.test",
  password: process.env.TEST_STAFF_PASSWORD ?? "password123",
};

// Kong's login limit is per calendar minute; a 429 left over from an earlier suite clears at the
// next minute boundary. Wait for it instead of failing on inherited state.
async function loginWaitingForWindow(ctx: APIRequestContext): Promise<APIResponse> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await ctx.post("/api/auth/login", { data: staff });
    if (res.status() !== 429) return res;
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000) + 500;
    await new Promise((r) => setTimeout(r, msUntilNextMinute));
  }
  return ctx.post("/api/auth/login", { data: staff });
}

test("valid JWT passes the gateway", async () => {
  const ctx = await request.newContext({ baseURL: base });
  const login = await loginWaitingForWindow(ctx);
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).token as string;

  const res = await ctx.post("/api/animals", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: "Test Animal",
      dateOfBirth: "2020-01-01",
      animalType: "DOG",
      breed: "Mixed",
      gender: "UNKNOWN",
      size: "MEDIUM",
      status: "AVAILABLE",
      intakeDate: "2024-01-01",
    },
  });
  expect(res.status()).not.toBe(401);

  if (res.status() === 201) {
    const created = (await res.json()) as { id?: string };
    if (created.id) {
      const del = await ctx.delete(`/api/animals/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(del.status()).toBeLessThan(300);
    }
  }
});

test("login is IP rate-limited (429 after threshold)", async () => {
  const ctx = await request.newContext({ baseURL: base });
  // user-auth route allows 120/min per IP; hammer past it with cheap wrong-password attempts.
  let saw429 = false;
  for (let i = 0; i < 130; i++) {
    const res = await ctx.post("/api/auth/login", { data: { email: "x@x.com", password: "wrong" } });
    if (res.status() === 429) { saw429 = true; break; }
  }
  expect(saw429).toBeTruthy();
});
