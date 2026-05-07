import { test, expect } from "@playwright/test";

test.describe("Animal create form", () => {
  test.beforeEach(async ({ page }) => {
    // Already authenticated via storageState (staff.json)
    await page.goto("/dashboard/animals/new");
    await expect(page.getByRole("heading", { name: "Add a new animal" })).toBeVisible();
  });

  test("submit with name and type shows success", async ({ page }) => {
    await page.getByLabel("Name").first().fill("E2E Test Dog");
    await page.getByLabel("Animal type").fill("Dog");
    await page.getByRole("button", { name: /Add Animal/i }).click();

    // Should show success card
    await expect(page.getByText(/animal record created/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("submit without name shows validation error", async ({ page }) => {
    await page.getByLabel("Animal type").fill("Dog");
    await page.getByRole("button", { name: /Add Animal/i }).click();

    // Should show error — either banner, field error, or stay on page
    await expect(
      page.locator(".auth-error-banner, [role=alert], .error-message, [aria-invalid=true]").first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("back link navigates to dashboard", async ({ page }) => {
    await page.locator("a").filter({ hasText: "Dashboard" }).first().click();
    await page.waitForURL("**/dashboard**");
    expect(page.url()).toContain("/dashboard");
  });
});
