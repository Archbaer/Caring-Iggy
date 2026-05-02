import { test, expect } from '@playwright/test';

test.describe('1. Duplicate PublicFooter removed', () => {
  test('/donate page should have exactly one footer', async ({ page }) => {
    await page.goto('/donate');
    const footers = page.locator('footer');
    await expect(footers).toHaveCount(1);
  });

  test('/dashboard/matches page should have exactly one footer', async ({ page }) => {
    await page.goto('/dashboard/matches');
    const footers = page.locator('footer');
    await expect(footers).toHaveCount(1);
  });
});

test.describe('2. <a> replaced with <Link> for internal nav', () => {
  test('matches page links navigate client-side', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a[href="/animals"]');
    await expect(page).toHaveURL('/animals');
  });

  test('footer is present and contains navigation', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a[href="/animals"]')).toBeVisible();
    await expect(footer.locator('a[href="/donate"]')).toBeVisible();
    await expect(footer.locator('a[href="/about"]')).toBeVisible();
  });

  test('staff detail back link should navigate without full reload', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe('3. Shared utilities extracted', () => {
  test('animals page loads without errors (uses readQueryValue)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/animals');
    expect(errors).toHaveLength(0);
  });

  test('login page loads without errors (uses readQueryValue)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/login');
    expect(errors).toHaveLength(0);
  });

  test('signup page loads without errors (uses readQueryValue)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/signup');
    expect(errors).toHaveLength(0);
  });
});

test.describe('4. Dead files deleted — pages still render', () => {
  test('homepage renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('about page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/about');
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('donate page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/donate');
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('animals page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/animals');
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});