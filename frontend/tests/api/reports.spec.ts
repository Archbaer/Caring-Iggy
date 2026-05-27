import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  loginAsStaff,
  ERROR_SHAPE,
} from "./helpers";

const VALID_MONTH = "2026-01";
const INTAKE_REPORT_SHAPE = {
  month: expect.any(String),
  totalIntake: expect.any(Number),
  byType: expect.any(Object),
  byStatus: expect.any(Object),
};
const ADOPTION_REPORT_SHAPE = {
  month: expect.any(String),
  totalAdoptions: expect.any(Number),
  byType: expect.any(Object),
};

// ── Unauthenticated ──────────────────────────────────────────────

test.describe("Unauthenticated requests", () => {
  test("GET /api/reports/intake without auth returns 401", async ({ request }) => {
    const resp = await request.get(`/api/reports/intake?month=${VALID_MONTH}`);
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("GET /api/reports/adoptions without auth returns 401", async ({ request }) => {
    const resp = await request.get(`/api/reports/adoptions?month=${VALID_MONTH}`);
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── Staff (non-admin) access ─────────────────────────────────────

test.describe("Staff access (non-admin)", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsStaff(request);
  });

  test("GET /api/reports/intake as STAFF returns 403", async ({ request }) => {
    const resp = await request.get(`/api/reports/intake?month=${VALID_MONTH}`);
    expect(resp.status()).toBe(403);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("GET /api/reports/adoptions as STAFF returns 403", async ({ request }) => {
    const resp = await request.get(`/api/reports/adoptions?month=${VALID_MONTH}`);
    expect(resp.status()).toBe(403);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── Admin — input validation ─────────────────────────────────────

test.describe("Admin — input validation", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test("GET /api/reports/intake without month param returns 400", async ({ request }) => {
    const resp = await request.get("/api/reports/intake");
    expect(resp.status()).toBe(400);
  });

  test("GET /api/reports/intake with invalid month format returns 400", async ({ request }) => {
    const resp = await request.get("/api/reports/intake?month=January-2026");
    expect(resp.status()).toBe(400);
  });

  test("GET /api/reports/intake with partial month returns 400", async ({ request }) => {
    const resp = await request.get("/api/reports/intake?month=2026");
    expect(resp.status()).toBe(400);
  });

  test("GET /api/reports/adoptions without month param returns 400", async ({ request }) => {
    const resp = await request.get("/api/reports/adoptions");
    expect(resp.status()).toBe(400);
  });

  test("GET /api/reports/adoptions with invalid month format returns 400", async ({ request }) => {
    const resp = await request.get("/api/reports/adoptions?month=not-a-date");
    expect(resp.status()).toBe(400);
  });
});

// ── Admin — happy path ───────────────────────────────────────────

test.describe("Admin — valid requests", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test("GET /api/reports/intake with valid month returns 200 with report shape", async ({ request }) => {
    const resp = await request.get(`/api/reports/intake?month=${VALID_MONTH}`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject(INTAKE_REPORT_SHAPE);
    expect(body.month).toBe(VALID_MONTH);
    expect(body.totalIntake).toBeGreaterThanOrEqual(0);
  });

  test("GET /api/reports/adoptions with valid month returns 200 with report shape", async ({ request }) => {
    const resp = await request.get(`/api/reports/adoptions?month=${VALID_MONTH}`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject(ADOPTION_REPORT_SHAPE);
    expect(body.month).toBe(VALID_MONTH);
    expect(body.totalAdoptions).toBeGreaterThanOrEqual(0);
  });

  test("GET /api/reports/intake month field in response matches request", async ({ request }) => {
    const resp = await request.get("/api/reports/intake?month=2026-03");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.month).toBe("2026-03");
  });

  test("GET /api/reports/adoptions month field in response matches request", async ({ request }) => {
    const resp = await request.get("/api/reports/adoptions?month=2026-03");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.month).toBe("2026-03");
  });
});
