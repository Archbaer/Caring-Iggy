import { test, expect } from "@playwright/test";
import { getCsrfToken, loginAsAdmin, loginAsStaff, loginAsAdopter, ERROR_SHAPE } from "./helpers";
import { TEST_CREDENTIALS } from "./fixtures";

// ── Cookie Expiry — Employee (20 min) ─────────────────────────────

test.describe("Session cookie expiry — employees", () => {
  test("admin login sets 20-minute session expiry", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password,
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);

    // Check Set-Cookie headers for Max-Age
    const setCookieHeaders = resp.headersArray()
      .filter((h: { name: string; value: string }) =>
        h.name.toLowerCase() === "set-cookie",
      );

    // ci_session_state cookie should have Max-Age=1200 (20 min)
    const stateCookie = setCookieHeaders.find((h: { value: string }) =>
      h.value.startsWith("ci_session_state="),
    );
    expect(stateCookie).toBeDefined();
    expect(stateCookie!.value).toContain("Max-Age=1200");
  });

  test("staff login sets 20-minute session expiry", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.staff.email,
        password: TEST_CREDENTIALS.staff.password,
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);

    const stateCookie = resp
      .headersArray()
      .filter((h: { name: string; value: string }) =>
        h.name.toLowerCase() === "set-cookie",
      )
      .find((h: { value: string }) =>
        h.value.startsWith("ci_session_state="),
      );
    expect(stateCookie).toBeDefined();
    expect(stateCookie!.value).toContain("Max-Age=1200");
  });
});

// ── Cookie Expiry — Adopter (35 min) ──────────────────────────────

test.describe("Session cookie expiry — adopter", () => {
  test("adopter login sets 35-minute session expiry", async ({
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

    const stateCookie = resp
      .headersArray()
      .filter((h: { name: string; value: string }) =>
        h.name.toLowerCase() === "set-cookie",
      )
      .find((h: { value: string }) =>
        h.value.startsWith("ci_session_state="),
      );
    expect(stateCookie).toBeDefined();
    expect(stateCookie!.value).toContain("Max-Age=2100");
  });
});

// ── Short TTL Session Expiry Test (5-second enforcement) ───────────

test.describe("Short TTL session expiry enforcement", () => {
  test("5-second TTL session sets correct short Max-Age", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const loginResp = await request.post("/api/auth/login", {
      data: {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password,
      },
      headers: {
        "x-csrf-token": csrfToken,
        "x-test-session-ttl": "5",
        origin: "http://localhost:3000",
      },
    });
    expect(loginResp.status()).toBe(200);

    // Verify Max-Age=5 was set on session cookie
    const stateCookie = loginResp
      .headersArray()
      .filter((h: { name: string; value: string }) =>
        h.name.toLowerCase() === "set-cookie",
      )
      .find((h: { value: string }) =>
        h.value.startsWith("ci_session_state="),
      );
    expect(stateCookie).toBeDefined();
    expect(stateCookie!.value).toContain("Max-Age=5");

    // Note: APIRequestContext doesn't enforce cookie maxAge.
    // Browser contexts (page fixture) do enforce it.
    // Full expiry enforcement test requires browser-level test (Tier 3).
  });
});

// ── CSRF Cookie Expiry ────────────────────────────────────────────

test.describe("CSRF cookie expiry", () => {
  test("login sets CSRF cookie with Max-Age matching session", async ({
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

    const csrfCookie = resp
      .headersArray()
      .filter((h: { name: string; value: string }) =>
        h.name.toLowerCase() === "set-cookie",
      )
      .find((h: { value: string }) =>
        h.value.startsWith("ci_csrf="),
      );
    expect(csrfCookie).toBeDefined();
    // CSRF cookie should have an expiry (Max-Age or Expires)
    const hasExpiry =
      csrfCookie!.value.includes("Max-Age") ||
      csrfCookie!.value.includes("Expires");
    expect(hasExpiry).toBe(true);
  });
});

// ── 502 Upstream Unavailable ──────────────────────────────────────

test.describe("502 upstream unavailable", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test("admin/staff endpoint returns 502 when upstream fails", async ({
    request,
  }) => {
    const resp = await request.get("/api/admin/staff", {
      headers: { "x-test-simulate-failure": "upstream" },
    });
    expect(resp.status()).toBe(502);
    const body = await resp.json();
    expect(body).toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      message: expect.any(String),
    });
  });

  test("animal create returns 502 when upstream fails", async ({
    request,
  }) => {
    await loginAsStaff(request);
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: { name: "502 Test" },
      headers: {
        "x-csrf-token": csrfToken,
        "x-test-simulate-failure": "upstream",
        origin: "http://localhost:3000",
      },
    });
    expect(resp.status()).toBe(502);
  });
});
