import { test, expect, request } from "@playwright/test";

test("rejects protected route without a token (401)", async () => {
  const ctx = await request.newContext({ baseURL: process.env.KONG_URL ?? "http://localhost:8000" });
  const res = await ctx.post("/api/animals", { data: {} });
  expect(res.status()).toBe(401);
});

test("allows public animal read without a token (200)", async () => {
  const ctx = await request.newContext({ baseURL: process.env.KONG_URL ?? "http://localhost:8000" });
  const res = await ctx.get("/api/animals");
  expect(res.status()).toBe(200);
});
