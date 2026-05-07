import { test, expect } from "@playwright/test";

test.describe("Unauthenticated redirects", () => {
  const protectedRoutes = [
    "/dashboard",
    "/dashboard/matches",
    "/dashboard/preferences",
    "/dashboard/interests",
    "/dashboard/animals/new",
    "/dashboard/admin",
    "/dashboard/admin/staff",
    "/dashboard/admin/adopters",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("**/login**");
      expect(page.url()).toContain("/login");
    });
  }
});

test.describe("Old route redirects", () => {
  test("/animals/{id}/edit redirects to /dashboard/animals/{id}/edit", async ({
    page,
  }) => {
    await page.goto("/animals/123e4567-e89b-12d3-a456-426614174000/edit");
    await page.waitForLoadState("networkidle");
    // Should land on /dashboard/... or /login
    expect(page.url()).toMatch(/\/dashboard\/animals\/|login/);
  });
});

test.describe("Already authenticated redirects", () => {
  test.beforeEach(async ({ page }) => {
    // Login via UI first
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill("testadmin@caringiggy.test");
    await page.getByRole("textbox", { name: "Password" }).fill("password123");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await page.waitForURL("**/dashboard**");
  });

  test("/login redirects to dashboard when authenticated", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForURL("**/dashboard**");
    expect(page.url()).not.toContain("/login");
  });

  test("/signup redirects to dashboard when authenticated", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.waitForURL("**/dashboard**");
    expect(page.url()).not.toContain("/signup");
  });
});
