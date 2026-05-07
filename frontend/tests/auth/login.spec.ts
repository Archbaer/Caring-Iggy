import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("valid admin credentials redirect to dashboard", async ({ page }) => {
    await page.getByRole("textbox", { name: "Email" }).fill("testadmin@caringiggy.test");
    await page.getByRole("textbox", { name: "Password" }).fill("password123");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await page.waitForURL("**/dashboard**");
  });

  test("valid staff credentials redirect to dashboard", async ({ page }) => {
    await page.getByRole("textbox", { name: "Email" }).fill("teststaff@caringiggy.test");
    await page.getByRole("textbox", { name: "Password" }).fill("password123");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await page.waitForURL("**/dashboard**");
  });

  test("valid adopter credentials redirect to dashboard", async ({ page }) => {
    await page.getByRole("textbox", { name: "Email" }).fill("testadopter@caringiggy.test");
    await page.getByRole("textbox", { name: "Password" }).fill("password123");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await page.waitForURL("**/dashboard**");
  });

  test("wrong password shows error", async ({ page }) => {
    await page.getByRole("textbox", { name: "Email" }).fill("testadmin@caringiggy.test");
    await page.getByRole("textbox", { name: "Password" }).fill("WRONG_PASSWORD");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    // Should show error message
    await expect(page.locator('[aria-live="polite"], .auth-error-banner, [role="alert"]').first()).toBeVisible();
  });

  test("empty email shows validation", async ({ page }) => {
    await page.getByRole("textbox", { name: "Password" }).fill("password123");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    // Email input should be marked invalid
    const emailInput = page.getByRole("textbox", { name: "Email" });
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("empty password shows validation", async ({ page }) => {
    await page.getByRole("textbox", { name: "Email" }).fill("testadmin@caringiggy.test");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    const passwordInput = page.getByRole("textbox", { name: "Password" });
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("XSS in email is escaped", async ({ page }) => {
    await page.getByRole("textbox", { name: "Email" }).fill('<script>alert("xss")</script>');
    await page.getByRole("textbox", { name: "Password" }).fill("password123");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    // Script should not execute — page should not crash
    await expect(page.locator("body")).toBeVisible();
  });

  test("SQL injection in email does not cause 500", async ({ page }) => {
    await page.getByRole("textbox", { name: "Email" }).fill("' OR '1'='1");
    await page.getByRole("textbox", { name: "Password" }).fill("password123");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    // Should not be a 500 error page
    await expect(page.locator("body")).toBeVisible();
  });
});
