import { test, expect, request } from "@playwright/test";

test("valid JWT passes the gateway", async () => {
  const base = process.env.KONG_URL ?? "http://localhost:8000";
  const ctx = await request.newContext({ baseURL: base });
  const login = await ctx.post("/api/auth/login", {
    data: {
      email: process.env.TEST_STAFF_EMAIL ?? "teststaff@caringiggy.test",
      password: process.env.TEST_STAFF_PASSWORD ?? "password123",
    },
  });
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
});
