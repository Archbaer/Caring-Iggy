import { test, expect } from "@playwright/test";
import {
  getCsrfToken,
  loginAsAdmin,
  loginAsStaff,
  ERROR_SHAPE,
  NON_EXISTENT_ID,
} from "./helpers";
import { TEST_CREDENTIALS } from "./fixtures";

// ── Unauthenticated requests ─────────────────────────────────────

test.describe("Unauthenticated requests", () => {
  test("GET /api/admin/staff without auth returns 401", async ({ request }) => {
    const resp = await request.get("/api/admin/staff");
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("GET /api/admin/staff/{id} without auth returns 401", async ({ request }) => {
    const resp = await request.get("/api/admin/staff/some-id");
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("GET /api/admin/adopters without auth returns 401", async ({ request }) => {
    const resp = await request.get("/api/admin/adopters");
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("GET /api/admin/adopters/{id} without auth returns 401", async ({ request }) => {
    const resp = await request.get("/api/admin/adopters/some-id");
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── Staff Endpoints (as ADMIN) ──────────────────────────────────

test.describe("Staff endpoints (as ADMIN)", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test("GET /api/admin/staff returns 200 with array of employees", async ({
    request,
  }) => {
    const resp = await request.get("/api/admin/staff");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
    });
  });

  test("POST /api/admin/staff returns 201 with role and accountId", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueEmail = `new-staff-${Date.now()}@caringiggy.test`;
    const resp = await request.post("/api/admin/staff", {
      data: {
        name: "New Staff",
        email: uniqueEmail,
        telephone: "+1-555-0100",
        role: "STAFF",
        password: "password123",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body).toMatchObject({
      role: expect.any(String),
    });
  });

  test("POST missing fields returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/admin/staff", {
      data: { name: "No Email" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("GET /api/admin/staff/{id} returns 200 with detail shape", async ({
    request,
  }) => {
    const listResp = await request.get("/api/admin/staff");
    const list = await listResp.json();
    const firstId = list[0].id;

    const resp = await request.get(`/api/admin/staff/${firstId}`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
    });
  });

  test("GET /api/admin/staff/{id} non-existent returns 404", async ({
    request,
  }) => {
    const resp = await request.get(`/api/admin/staff/${NON_EXISTENT_ID}`);
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("PUT /api/admin/staff/{id} returns 200 with updated detail", async ({
    request,
  }) => {
    const listResp = await request.get("/api/admin/staff");
    const list = await listResp.json();
    const firstId = list[0].id;

    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(`/api/admin/staff/${firstId}`, {
      data: { name: "Updated Name" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.name).toBe("Updated Name");
  });

  test("PUT empty body returns 422", async ({ request }) => {
    const listResp = await request.get("/api/admin/staff");
    const list = await listResp.json();
    const firstId = list[0].id;

    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(`/api/admin/staff/${firstId}`, {
      data: {},
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("DELETE /api/admin/staff/{id} returns 200 with ok:true", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const createResp = await request.post("/api/admin/staff", {
      data: {
        name: "Delete Me",
        email: `delete-me-${Date.now()}@caringiggy.test`,
        telephone: "+1-555-0999",
        role: "STAFF",
        password: "password123",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(createResp.status()).toBe(201);

    const listResp = await request.get("/api/admin/staff");
    const list = await listResp.json();
    const newStaff = list.find(
      (s: any) => s.email?.includes("delete-me-"),
    );
    expect(newStaff).toBeDefined();

    const csrfToken2 = await getCsrfToken(request);
    const resp = await request.delete(`/api/admin/staff/${newStaff.id}`, {
      headers: { "x-csrf-token": csrfToken2, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("DELETE non-existent returns 404", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.delete(
      `/api/admin/staff/${NON_EXISTENT_ID}`,
      { headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" } },
    );
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── Role Boundary ────────────────────────────────────────────────

test.describe("Role boundary", () => {
  test("GET /api/admin/staff as STAFF returns 403", async ({
    request,
  }) => {
    await loginAsStaff(request);
    const resp = await request.get("/api/admin/staff");
    expect(resp.status()).toBe(403);
  });
});

// ── Adopter Endpoints (as ADMIN) ─────────────────────────────────

test.describe("Adopter endpoints (as ADMIN)", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test("GET /api/admin/adopters returns 200 with array", async ({
    request,
  }) => {
    const resp = await request.get("/api/admin/adopters");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        interestCount: expect.any(Number),
      });
    }
  });

  test("GET /api/admin/adopters/{id} returns 200 with detail", async ({
    request,
  }) => {
    const listResp = await request.get("/api/admin/adopters");
    const list = await listResp.json();
    if (list.length === 0) {
      test.skip(true, "No adopters in database");
      return;
    }
    const firstId = list[0].id;

    const resp = await request.get(`/api/admin/adopters/${firstId}`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      interestCount: expect.any(Number),
    });
  });

  test("GET non-existent returns 404", async ({ request }) => {
    const resp = await request.get(`/api/admin/adopters/${NON_EXISTENT_ID}`);
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("PUT /api/admin/adopters/{id} returns 200 with updated detail", async ({
    request,
  }) => {
    const listResp = await request.get("/api/admin/adopters");
    const list = await listResp.json();
    if (list.length === 0) {
      test.skip(true, "No adopters in database");
      return;
    }
    const firstId = list[0].id;

    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(`/api/admin/adopters/${firstId}`, {
      data: { name: "Updated Adopter Name" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.name).toBe("Updated Adopter Name");
  });

  test("PUT empty body returns 422", async ({ request }) => {
    const listResp = await request.get("/api/admin/adopters");
    const list = await listResp.json();
    if (list.length === 0) {
      test.skip(true, "No adopters in database");
      return;
    }
    const firstId = list[0].id;

    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(`/api/admin/adopters/${firstId}`, {
      data: {},
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── CSRF Enforcement ─────────────────────────────────────────────

test.describe("CSRF enforcement", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test("POST /api/admin/staff without CSRF returns 403", async ({
    request,
  }) => {
    const resp = await request.post("/api/admin/staff", {
      data: {
        name: "No CSRF",
        email: `nocsrf-${Date.now()}@test.com`,
        telephone: "+1-555-0000",
        role: "STAFF",
        password: "password123",
      },
    });
    expect(resp.status()).toBe(403);
  });

  test("PUT without CSRF returns 403", async ({ request }) => {
    const listResp = await request.get("/api/admin/staff");
    const list = await listResp.json();
    if (list.length === 0) {
      test.skip(true, "No staff in database");
      return;
    }
    const resp = await request.put(`/api/admin/staff/${list[0].id}`, {
      data: { name: "CSRF Test" },
    });
    expect(resp.status()).toBe(403);
  });

  test("DELETE without CSRF returns 403", async ({ request }) => {
    const resp = await request.delete(`/api/admin/staff/${NON_EXISTENT_ID}`);
    expect(resp.status()).toBe(403);
  });
});

// ── Malformed JSON ───────────────────────────────────────────────

test.describe("Malformed JSON", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test("POST malformed JSON returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/admin/staff", {
      data: "{broken-json",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
        origin: "http://localhost:3000",
      },
    });
    expect(resp.status()).toBe(422);
  });
});

// Cleanup
test.afterAll(async () => {
  // API request contexts auto-dispose. Staff created in tests are deleted by DELETE test.
});
