import { test, expect } from "@playwright/test";
import {
  getCsrfToken,
  loginAs,
  loginAsAdopter,
  loginAsStaff,
  ERROR_SHAPE,
} from "./helpers";
import { TEST_CREDENTIALS } from "./fixtures";

// ── Unauthenticated requests ────────────────────────────────────

test.describe("Unauthenticated requests", () => {
  test("PUT preferences without auth returns 401", async ({ request }) => {
    const resp = await request.put("/api/adopter/preferences", {
      data: { preferredAnimalTypes: ["Dog"] },
    });
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("PUT interests without auth returns 401", async ({ request }) => {
    const resp = await request.put("/api/adopter/interests", {
      data: { interestedAnimalIds: ["test"] },
    });
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// ── Preferences ─────────────────────────────────────────────────

test.describe("PUT /api/adopter/preferences", () => {
  test("valid preferences returns 200 with ok:true", async ({
    request,
  }) => {
    await loginAsAdopter(request);
    const csrfToken = await getCsrfToken(request);

    const resp = await request.put("/api/adopter/preferences", {
      data: {
        preferences: {
          preferredAnimalTypes: ["Dog"],
          minAge: 1,
          maxAge: 5,
          notes: "E2E test preferences",
        },
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("minAge > maxAge returns 422", async ({ request }) => {
    await loginAsAdopter(request);
    const csrfToken = await getCsrfToken(request);

    const resp = await request.put("/api/adopter/preferences", {
      data: { minAge: 10, maxAge: 2 },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("as STAFF returns 403 (not ADOPTER)", async ({ request }) => {
    await loginAsStaff(request);
    const csrfToken = await getCsrfToken(request);

    const resp = await request.put("/api/adopter/preferences", {
      data: { preferredAnimalTypes: ["Cat"] },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(403);
  });

  test("without CSRF returns 403", async ({ request }) => {
    await loginAsAdopter(request);
    const resp = await request.put("/api/adopter/preferences", {
      data: { preferredAnimalTypes: ["Dog"] },
    });
    expect(resp.status()).toBe(403);
  });
});

// ── Interests ───────────────────────────────────────────────────

test.describe("PUT /api/adopter/interests", () => {
  test("valid interests returns 200 with ok:true", async ({
    request,
  }) => {
    await loginAsAdopter(request);
    const csrfToken = await getCsrfToken(request);

    const resp = await request.put("/api/adopter/interests", {
      data: {
        interestedAnimalIds: [
          "aaaaaaaa-1111-4111-8111-111111111111",
          "bbbbbbbb-2222-4222-8222-222222222222",
        ],
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("exactly MAX_INTERESTS (3) accepted", async ({ request }) => {
    await loginAsAdopter(request);
    const csrfToken = await getCsrfToken(request);

    const resp = await request.put("/api/adopter/interests", {
      data: {
        interestedAnimalIds: [
          "11111111-1111-1111-1111-111111111111",
          "22222222-2222-2222-2222-222222222222",
          "33333333-3333-3333-3333-333333333333",
        ],
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
  });

  test("exceeds MAX_INTERESTS returns 422", async ({ request }) => {
    await loginAsAdopter(request);
    const csrfToken = await getCsrfToken(request);

    const resp = await request.put("/api/adopter/interests", {
      data: {
        interestedAnimalIds: [
          "1", "2", "3", "4", "5", "6",
        ],
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("without CSRF returns 403", async ({ request }) => {
    await loginAsAdopter(request);
    const resp = await request.put("/api/adopter/interests", {
      data: { interestedAnimalIds: ["test"] },
    });
    expect(resp.status()).toBe(403);
  });
});

// ── Edge Cases ──────────────────────────────────────────────────

test.describe("Edge cases", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdopter(request);
  });

  test("interest ID deduplication: same ID 3 times counts as 1", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);

    // Send same ID 3 times — should deduplicate and succeed
    const resp = await request.put("/api/adopter/interests", {
      data: {
        interestedAnimalIds: [
          "aaaaaaaa-1111-4111-8111-111111111111",
          "aaaaaaaa-1111-4111-8111-111111111111",
          "aaaaaaaa-1111-4111-8111-111111111111",
        ],
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    // Should accept (counts as 1 interest)
    expect(resp.status()).toBe(200);
  });

  test("clearing all interests with empty array returns 200", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.put("/api/adopter/interests", {
      data: { interestedAnimalIds: [] },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("clearing preferences with empty object returns 200", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.put("/api/adopter/preferences", {
      data: { preferences: {} },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });
});

// ── Malformed JSON ──────────────────────────────────────────────

test.describe("Malformed JSON", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdopter(request);
  });

  test("PUT malformed JSON returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.put("/api/adopter/preferences", {
      data: "this-is-not-json",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
        origin: "http://localhost:3000",
      },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});
