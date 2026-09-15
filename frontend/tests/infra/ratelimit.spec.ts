import { test, expect, request } from "@playwright/test";

test("login is IP rate-limited (429 after threshold)", async () => {
  const base = process.env.KONG_URL ?? "http://localhost:8000";
  const ctx = await request.newContext({ baseURL: base });
  let saw429 = false;
  for (let i = 0; i < 12; i++) {
    const res = await ctx.post("/api/auth/login", { data: { email: "x@x.com", password: "wrong" } });
    if (res.status() === 429) { saw429 = true; break; }
  }
  expect(saw429).toBeTruthy();
});
