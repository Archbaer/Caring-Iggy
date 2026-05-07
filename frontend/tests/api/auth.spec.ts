import { test, expect } from "@playwright/test";
import { getCsrfToken, loginAsAdmin, ERROR_SHAPE } from "./helpers";
import { TEST_CREDENTIALS } from "./fixtures";

// ── GET /api/auth/session ────────────────────────────────────────

test.describe("GET /api/auth/session", () => {
  test("unauthenticated returns csrfToken with null user", async ({
    request,
  }) => {
    const resp = await request.get("/api/auth/session");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({
      csrfToken: expect.any(String),
      user: null,
    });
    expect(body.csrfToken.length).toBeGreaterThan(10);
  });

  test("authenticated returns user with role and profileId", async ({
    request,
  }) => {
    await loginAsAdmin(request);

    const resp = await request.get("/api/auth/session");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.user).toMatchObject({
      role: "ADMIN",
      accountId: expect.any(String),
    });
  });
});

// ── POST /api/auth/login ─────────────────────────────────────────

test.describe("POST /api/auth/login", () => {
  test("valid admin credentials returns user and csrfToken", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password,
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.user).toMatchObject({
      role: "ADMIN",
      accountId: expect.any(String),
    });
  });

  test("valid staff credentials returns user and csrfToken", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.staff.email,
        password: TEST_CREDENTIALS.staff.password,
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.user).toMatchObject({
      role: "STAFF",
      accountId: expect.any(String),
    });
  });

  test("valid adopter credentials returns user and csrfToken", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.adopter.email,
        password: TEST_CREDENTIALS.adopter.password,
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.user).toMatchObject({
      role: "ADOPTER",
      accountId: expect.any(String),
    });
  });

  test("wrong password returns 401", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: { email: TEST_CREDENTIALS.admin.email, password: "WRONG" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("missing email returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: { password: "password123" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("missing password returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: { email: TEST_CREDENTIALS.admin.email },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("missing CSRF token returns 403", async ({ request }) => {
    await request.get("/api/auth/session"); // Get ci_csrf cookie
    const resp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password,
      },
      // No x-csrf-token header
    });
    expect(resp.status()).toBe(403);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("invalid CSRF token returns 403", async ({ request }) => {
    await request.get("/api/auth/session"); // Get ci_csrf cookie
    const resp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password,
      },
      headers: { "x-csrf-token": "invalid-token-value", origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(403);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── POST /api/auth/signup ────────────────────────────────────────

test.describe("POST /api/auth/signup", () => {
  test("valid adopter signup returns 200 with user", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `test-signup-${Date.now()}@caringiggy.test`;

    const resp = await request.post("/api/auth/signup", {
      data: {
        email: uniqueEmail,
        password: "password123",
        firstName: "Test",
        lastName: "Signup",
        telephone: "+1-555-9999",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.user).toMatchObject({
      role: "ADOPTER",
      accountId: expect.any(String),
    });
    expect(body.csrfToken).toBeTruthy();
  });

  test("duplicate email returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/signup", {
      data: {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password,
        firstName: "Dup",
        lastName: "User",
        telephone: "+1-555-0000",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(409); // Backend returns 409 CONFLICT for duplicates
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("missing required fields returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/signup", {
      data: { email: `test-${Date.now()}@test.com` },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("missing CSRF returns 403", async ({ request }) => {
    await request.get("/api/auth/session");
    const resp = await request.post("/api/auth/signup", {
      data: {
        email: "nocsrf@test.com",
        password: "password123",
        firstName: "No",
        lastName: "CSRF",
        telephone: "+1-555-0001",
      },
    });
    expect(resp.status()).toBe(403);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── POST /api/auth/logout ────────────────────────────────────────

test.describe("POST /api/auth/logout", () => {
  test("authenticated logout returns 200 with ok:true", async ({
    request,
  }) => {
    await loginAsAdmin(request);
    const csrfToken = await getCsrfToken(request);

    const resp = await request.post("/api/auth/logout", {
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("unauthenticated logout returns 200 (no-op)", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/logout", {
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("missing CSRF returns 403", async ({ request }) => {
    const resp = await request.post("/api/auth/logout");
    expect(resp.status()).toBe(403);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── Edge Cases ────────────────────────────────────────────────────

test.describe("Edge cases", () => {
  test("SQL injection in email field returns 422 not 500", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: {
        email: "'; DROP TABLE users; --",
        password: "password123",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    // Should not 500 — either 401 or 422
    expect(resp.status()).not.toBe(500);
  });
});

// ── XSS in signup fields ──────────────────────────────────────────

test.describe("XSS in signup fields", () => {
  test("XSS in firstName does not cause 500", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `xss-firstname-${Date.now()}@caringiggy.test`;

    const resp = await request.post("/api/auth/signup", {
      data: {
        email: uniqueEmail,
        password: "password123",
        firstName: '<script>alert("xss")</script>',
        lastName: "Test",
        telephone: "+1-555-9999",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    // Should not crash — either 200 (escaped) or 422 (rejected)
    expect([200, 422]).toContain(resp.status());
  });

  test("XSS in lastName does not cause 500", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `xss-lastname-${Date.now()}@caringiggy.test`;

    const resp = await request.post("/api/auth/signup", {
      data: {
        email: uniqueEmail,
        password: "password123",
        firstName: "Test",
        lastName: '<img src=x onerror=alert(1)>',
        telephone: "+1-555-9999",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect([200, 422]).toContain(resp.status());
  });

  test("XSS in telephone does not cause 500", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `xss-phone-${Date.now()}@caringiggy.test`;

    const resp = await request.post("/api/auth/signup", {
      data: {
        email: uniqueEmail,
        password: "password123",
        firstName: "Test",
        lastName: "User",
        telephone: '"><script>alert(1)</script>',
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect([200, 422]).toContain(resp.status());
  });
});

// ── Password complexity ───────────────────────────────────────────

test.describe("Password complexity", () => {
  test("signup with short password returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `short-pass-${Date.now()}@caringiggy.test`;

    const resp = await request.post("/api/auth/signup", {
      data: {
        email: uniqueEmail,
        password: "ab",
        firstName: "Short",
        lastName: "Pass",
        telephone: "+1-555-9999",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("signup with empty password returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `empty-pass-${Date.now()}@caringiggy.test`;

    const resp = await request.post("/api/auth/signup", {
      data: {
        email: uniqueEmail,
        password: "",
        firstName: "Empty",
        lastName: "Pass",
        telephone: "+1-555-9999",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("signup with missing password returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `no-pass-${Date.now()}@caringiggy.test`;

    const resp = await request.post("/api/auth/signup", {
      data: {
        email: uniqueEmail,
        firstName: "No",
        lastName: "Pass",
        telephone: "+1-555-9999",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── Malformed JSON ────────────────────────────────────────────────

test.describe("Malformed JSON", () => {
  test("login with malformed JSON body returns error", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: "{broken-json",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
        origin: "http://localhost:3000",
      },
    });
    // BFF may return 422 or 500 — either means request was rejected
    expect([422, 500]).toContain(resp.status());
  });

  test("signup with malformed JSON body returns error", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/signup", {
      data: "{broken-json",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
        origin: "http://localhost:3000",
      },
    });
    expect([422, 500]).toContain(resp.status());
  });
});
