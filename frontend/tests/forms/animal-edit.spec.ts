import { test, expect } from "@playwright/test";

let testAnimalId: string;

test.beforeAll(async ({ playwright }) => {
  // Create an animal via API for editing
  const request = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
  });

  // Login as staff
  const sessionResp = await request.get("/api/auth/session");
  const { csrfToken } = await sessionResp.json();
  await request.post("/api/auth/login", {
    data: {
      email: "teststaff@caringiggy.test",
      password: "password123",
    },
    headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
  });

  // Create animal
  const freshSession = await request.get("/api/auth/session");
  const freshCsrf = (await freshSession.json()).csrfToken;
  const createResp = await request.post("/api/animals/create", {
    data: {
      name: "E2E Edit Test Animal",
      animalType: "Dog",
      breed: "Test Breed",
      status: "AVAILABLE",
    },
    headers: { "x-csrf-token": freshCsrf, origin: "http://localhost:3000" },
  });
  const body = await createResp.json();
  testAnimalId = body.id;

  await request.dispose();
});

test.describe("Animal edit form", () => {
  test.beforeEach(async ({ page }) => {
    // Already authenticated via storageState (staff.json)
  });

  test("form pre-fills with animal name", async ({ page }) => {
    await page.goto(`/dashboard/animals/${testAnimalId}/edit`);

    // The AnimalEditor component uses AnimalFormFields — check name field is pre-filled
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toHaveValue("E2E Edit Test Animal", {
      timeout: 10000,
    });
  });

  test("form pre-fills with breed", async ({ page }) => {
    await page.goto(`/dashboard/animals/${testAnimalId}/edit`);
    const breedInput = page.getByLabel("Breed");
    await expect(breedInput).toHaveValue("Test Breed", { timeout: 10000 });
  });

  test("change status and submit shows success", async ({ page }) => {
    await page.goto(`/dashboard/animals/${testAnimalId}/edit`);

    // Change status dropdown to PENDING
    const statusSelect = page.getByLabel("Status");
    await statusSelect.selectOption("PENDING");

    // Submit
    await page.getByRole("button", { name: /save animal changes/i }).click();

    // Should show success
    await expect(
      page.getByText(/animal record updated/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("back link navigates to dashboard", async ({ page }) => {
    await page.goto(`/dashboard/animals/${testAnimalId}/edit`);
    await page.locator("a").filter({ hasText: "Dashboard" }).first().click();
    await page.waitForURL("**/dashboard**");
    expect(page.url()).toContain("/dashboard");
  });
});
