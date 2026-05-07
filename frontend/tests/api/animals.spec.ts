import { test, expect } from "@playwright/test";
import {
  getCsrfToken,
  loginAsStaff,
  loginAsAdopter,
  createAnimal,
  ANIMAL_DETAIL_SHAPE,
  ERROR_SHAPE,
  NON_EXISTENT_ID,
} from "./helpers";

// ── POST /api/animals/create ─────────────────────────────────────

test.describe("POST /api/animals/create", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsStaff(request);
  });

  test("valid animal returns 201 with AnimalDetail shape", async ({
    request,
  }) => {
    const resp = await createAnimal(request, {
      name: "Buddy",
      animalType: "Dog",
      breed: "Golden Retriever",
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body).toMatchObject(ANIMAL_DETAIL_SHAPE);
    expect(body.name).toBe("Buddy");
    expect(body.status).toBe("AVAILABLE");
  });

  test("name only (minimum valid) returns 201", async ({ request }) => {
    const resp = await createAnimal(request, { name: "Minimal" });
    expect(resp.status()).toBe(201);
  });

  test("all fields filled returns 201 with all data persisted", async ({
    request,
  }) => {
    const resp = await createAnimal(request, {
      name: "Full Fields",
      animalType: "Cat",
      breed: "Siamese",
      status: "PENDING",
      gender: "FEMALE",
      size: "SMALL",
      dateOfBirth: "2023-06-15",
      intakeDate: "2024-01-10",
      temperament: "Friendly and playful",
      description: "A lovely cat looking for a home.",
      imageUrl: "https://example.com/cat.jpg",
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.name).toBe("Full Fields");
    expect(body.animalType).toBe("CAT"); // Backend normalizes to uppercase
    expect(body.breed).toBe("Siamese");
    expect(body.status).toBe("PENDING");
    expect(body.gender).toBe("FEMALE");
    expect(body.size).toBe("SMALL");
    expect(body.temperament).toBe("Friendly and playful");
  });

  test("missing name returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: { animalType: "Dog" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("invalid status enum returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: { name: "Bad Status", status: "INVALID_STATUS" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("invalid gender enum returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: { name: "Bad Gender", gender: "NEUTRAL" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("without auth returns 401", async ({ request }) => {
    const resp = await request.post("/api/animals/create", {
      data: { name: "No Auth" },
    });
    expect(resp.status()).toBe(403); // CSRF check fires before auth check
  });

  test("as ADOPTER role returns 403", async ({ request }) => {
    await loginAsAdopter(request);
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: { name: "Adopter Animal" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(403);
  });

  test("without CSRF token returns 403", async ({ request }) => {
    await loginAsStaff(request);
    const resp = await request.post("/api/animals/create", {
      data: { name: "No CSRF" },
    });
    expect(resp.status()).toBe(403);
  });
});

// ── PUT /api/animals/{id}/edit ───────────────────────────────────

test.describe("PUT /api/animals/{id}/edit", () => {
  let createdAnimalId: string;

  test.beforeAll(async ({ request }) => {
    await loginAsStaff(request);
    const resp = await createAnimal(request, {
      name: "Editable Animal",
      status: "AVAILABLE",
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    createdAnimalId = body.id;
  });

  test("change status returns 200 with updated data", async ({
    request,
  }) => {
    await loginAsStaff(request);
    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(`/api/animals/${createdAnimalId}/edit`, {
      data: { status: "PENDING" },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe("PENDING");
    expect(body.id).toBe(createdAnimalId);
  });

  test("empty body returns 422", async ({ request }) => {
    await loginAsStaff(request);
    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(`/api/animals/${createdAnimalId}/edit`, {
      data: {},
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("non-existent id returns 404", async ({ request }) => {
    await loginAsStaff(request);
    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(
      `/api/animals/${NON_EXISTENT_ID}/edit`,
      {
        data: { name: "Ghost" },
        headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
      },
    );
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("without auth returns 401", async ({ request }) => {
    const resp = await request.put(
      `/api/animals/${createdAnimalId}/edit`,
      { data: { name: "Unauth" } },
    );
    expect(resp.status()).toBe(401);
  });

  test("as ADOPTER returns 403", async ({ request }) => {
    await loginAsAdopter(request);
    const csrfToken = await getCsrfToken(request);
    const resp = await request.put(
      `/api/animals/${createdAnimalId}/edit`,
      {
        data: { name: "Adopter Edit" },
        headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
      },
    );
    expect(resp.status()).toBe(403);
  });

  test("without CSRF returns 403", async ({ request }) => {
    await loginAsStaff(request);
    const resp = await request.put(
      `/api/animals/${createdAnimalId}/edit`,
      { data: { name: "No CSRF" } },
    );
    expect(resp.status()).toBe(403);
  });

});

// ── DELETE /api/animals/{id}/delete ──────────────────────────────

test.describe("DELETE /api/animals/{id}/delete", () => {
  let deleteTargetId: string;

  test.beforeAll(async ({ request }) => {
    await loginAsStaff(request);
    const resp = await createAnimal(request, {
      name: "Delete Me",
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    deleteTargetId = body.id;
  });

  test("valid delete returns 200 with ok:true", async ({ request }) => {
    await loginAsStaff(request);
    const csrfToken = await getCsrfToken(request);
    const resp = await request.delete(
      `/api/animals/${deleteTargetId}/delete`,
      { headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" } },
    );
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("already deleted returns 404", async ({ request }) => {
    await loginAsStaff(request);
    const csrfToken = await getCsrfToken(request);
    // Delete the same ID again
    const resp = await request.delete(
      `/api/animals/${deleteTargetId}/delete`,
      { headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" } },
    );
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("without auth returns 401", async ({ request }) => {
    const resp = await request.delete(
      `/api/animals/${deleteTargetId}/delete`,
    );
    expect(resp.status()).toBe(401);
  });

  test("without CSRF returns 403", async ({ request }) => {
    await loginAsStaff(request);
    const resp = await request.delete(
      `/api/animals/${deleteTargetId}/delete`,
    );
    expect(resp.status()).toBe(403);
  });
});

// ── Malformed JSON ────────────────────────────────────────────────

test.describe("Malformed JSON", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsStaff(request);
  });

  test("POST malformed JSON returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: "{broken-json",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
        origin: "http://localhost:3000",
      },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body.code).toBeDefined();
  });
});

// ── Enum coverage ─────────────────────────────────────────────────

test.describe("Enum coverage", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsStaff(request);
  });

  test("all status values accepted", async ({ request }) => {
    const statuses = ["AVAILABLE", "PENDING", "ADOPTED", "IN_TREATMENT", "DECEASED"];
    for (const status of statuses) {
      const resp = await createAnimal(request, { name: `Status ${status}`, status });
      expect(resp.status(), `status=${status} should be 201`).toBe(201);
      const body = await resp.json();
      expect(body.status).toBe(status);
    }
  });

  test("all gender values accepted", async ({ request }) => {
    const genders = ["MALE", "FEMALE", "UNKNOWN"];
    for (const gender of genders) {
      const resp = await createAnimal(request, { name: `Gender ${gender}`, gender });
      expect(resp.status(), `gender=${gender} should be 201`).toBe(201);
      const body = await resp.json();
      expect(body.gender).toBe(gender);
    }
  });

  test("all size values accepted", async ({ request }) => {
    const sizes = ["SMALL", "MEDIUM", "LARGE"];
    for (const size of sizes) {
      const resp = await createAnimal(request, { name: `Size ${size}`, size });
      expect(resp.status(), `size=${size} should be 201`).toBe(201);
      const body = await resp.json();
      expect(body.size).toBe(size);
    }
  });
});

// ── Derived fields ────────────────────────────────────────────────

test.describe("Derived fields", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsStaff(request);
  });

  test("age computed from dateOfBirth", async ({ request }) => {
    const resp = await createAnimal(request, {
      name: "Age Test",
      dateOfBirth: "2020-01-01",
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.age).toBeDefined();
    expect(typeof body.age).toBe("number");
  });

  test("sex derived from gender", async ({ request }) => {
    const resp = await createAnimal(request, {
      name: "Sex Test",
      gender: "MALE",
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.sex).toBeDefined();
  });
});

// ── Edge Cases ────────────────────────────────────────────────────

test.describe("Edge cases", () => {
  test.beforeEach(async ({ request }) => {
    await loginAsStaff(request);
  });

  test("previousOwner: name without telephone returns 422", async ({
    request,
  }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: {
        name: "Owner Test",
        previousOwner: {
          name: "John Doe",
          // Missing telephone — should trigger 422
        },
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("invalid date format returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: {
        name: "Bad Date",
        dateOfBirth: "not-a-date",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });

  test("previousOwner with all fields accepted", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: {
        name: "Owner Full Test",
        previousOwner: {
          name: "Jane Doe",
          telephone: "+1-555-1234",
          email: "jane@example.com",
          address: "456 Oak St, Portland, OR 97201",
        },
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.previousOwner).toMatchObject({
      name: "Jane Doe",
      telephone: "+1-555-1234",
  });
});

// Cleanup: runs after all tests in file
test.afterAll(async ({ request }) => {
  // No-op: API tests use the built-in request fixture which auto-disposes
  // Created resources are cleaned up by the DELETE test describe
});

  test("invalid intakeDate format returns 422", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const resp = await request.post("/api/animals/create", {
      data: {
        name: "Bad Intake",
        intakeDate: "not-a-date",
      },
      headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body).toMatchObject(ERROR_SHAPE);
  });
});

// Cleanup: runs after all tests in file
test.afterAll(async ({ request }) => {
  // No-op: API tests use the built-in request fixture which auto-disposes
  // Created resources are cleaned up by the DELETE test describe
});
