import { test, expect, Page } from "@playwright/test";

const TEST_ADMIN = { email: "testadmin@caringiggy.test", password: "password123" };
const TEST_STAFF = { email: "teststaff@caringiggy.test", password: "password123" };
const TEST_ADOPTER = { email: "testadopter@caringiggy.test", password: "password123" };

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL("**/dashboard**");
}

test.describe("ADOPTER role boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADOPTER.email, TEST_ADOPTER.password);
  });

  test("ADOPTER cannot access /dashboard/animals/new", async ({ page }) => {
    await page.goto("/dashboard/animals/new");
    // Should redirect to dashboard (not allowed)
    await page.waitForURL("**/dashboard**");
    expect(page.url()).not.toContain("/animals/new");
  });

  test("ADOPTER cannot access /dashboard/admin", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await page.waitForURL("**/dashboard**");
    expect(page.url()).not.toContain("/admin");
  });

  test("ADOPTER cannot access /dashboard/animals/{id}/edit", async ({ page }) => {
    await page.goto("/dashboard/animals/123e4567-e89b-12d3-a456-426614174000/edit");
    await page.waitForURL("**/dashboard**");
    expect(page.url()).not.toContain("/edit");
  });
});

test.describe("STAFF role boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_STAFF.email, TEST_STAFF.password);
  });

  test("STAFF cannot access /dashboard/admin", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await page.waitForURL("**/dashboard**");
    expect(page.url()).not.toContain("/admin");
  });

  test("STAFF can access /dashboard/animals/new", async ({ page }) => {
    await page.goto("/dashboard/animals/new");
    await expect(page.getByRole("heading", { name: "Add a new animal" })).toBeVisible();
  });
});

test.describe("ADMIN role boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
  });

  test("ADMIN can access /dashboard/admin", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test("ADMIN can access /dashboard/animals/new", async ({ page }) => {
    await page.goto("/dashboard/animals/new");
    await expect(page.getByRole("heading", { name: "Add a new animal" })).toBeVisible();
  });
});
