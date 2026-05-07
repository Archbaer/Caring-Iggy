import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_DIR = path.join(__dirname, "..", ".auth");

setup("authenticate admin", async ({ request }) => {
  // Get CSRF token
  const sessionResp = await request.get("/api/auth/session");
  expect(sessionResp.ok()).toBeTruthy();
  const { csrfToken } = await sessionResp.json();

  // Login as admin
  const loginResp = await request.post("/api/auth/login", {
    data: { email: "testadmin@caringiggy.test", password: "password123" },
    headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
  });
  expect(loginResp.ok()).toBeTruthy();
  const loginBody = await loginResp.json();
  expect(loginBody.user.role).toBe("ADMIN");

  // Save state
  await request.storageState({ path: path.join(AUTH_DIR, "admin.json") });
});

setup("authenticate staff", async ({ request }) => {
  const sessionResp = await request.get("/api/auth/session");
  expect(sessionResp.ok()).toBeTruthy();
  const { csrfToken } = await sessionResp.json();

  const loginResp = await request.post("/api/auth/login", {
    data: { email: "teststaff@caringiggy.test", password: "password123" },
    headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
  });
  expect(loginResp.ok()).toBeTruthy();
  const loginBody = await loginResp.json();
  expect(loginBody.user.role).toBe("STAFF");

  await request.storageState({ path: path.join(AUTH_DIR, "staff.json") });
});

setup("authenticate adopter", async ({ request }) => {
  const sessionResp = await request.get("/api/auth/session");
  expect(sessionResp.ok()).toBeTruthy();
  const { csrfToken } = await sessionResp.json();

  const loginResp = await request.post("/api/auth/login", {
    data: { email: "testadopter@caringiggy.test", password: "password123" },
    headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
  });
  expect(loginResp.ok()).toBeTruthy();
  const loginBody = await loginResp.json();
  expect(loginBody.user.role).toBe("ADOPTER");

  await request.storageState({ path: path.join(AUTH_DIR, "adopter.json") });
});
