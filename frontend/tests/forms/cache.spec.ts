/**
 * Next.js Data Cache tests
 *
 * Tests the caching layer specifically — not CRUD correctness (see animals.spec.ts).
 *
 * Two concerns:
 *   1. Fetch config: pages must not opt out of the Data Cache (no-store / force-dynamic)
 *   2. Tag invalidation: a cached page must serve fresh data after a mutation
 *
 * The invalidation tests explicitly warm the cache with a first render, then
 * mutate, then assert the next render reflects the change. Without the warm-up
 * step these would merely re-test CRUD behaviour already covered elsewhere.
 *
 * Note: existing form tests (animal-create, animal-edit) only assert form-level
 * success messages — they do not check that rendered list/detail pages reflect
 * the mutation. That gap is covered here as part of cache invalidation.
 */

import { test, expect } from "@playwright/test";
import { getCsrfToken, createAnimal } from "../api/helpers";

// ─── helpers ─────────────────────────────────────────────────────────────────

function unique(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function editAnimal(
  ctx: Parameters<typeof getCsrfToken>[0],
  id: string,
  data: Record<string, unknown>,
) {
  const csrf = await getCsrfToken(ctx);
  return ctx.put(`/api/animals/${id}/edit`, {
    data,
    headers: { "x-csrf-token": csrf, origin: "http://localhost:3000" },
  });
}

async function deleteAnimal(
  ctx: Parameters<typeof getCsrfToken>[0],
  id: string,
) {
  const csrf = await getCsrfToken(ctx);
  return ctx.delete(`/api/animals/${id}/delete`, {
    headers: { "x-csrf-token": csrf, origin: "http://localhost:3000" },
  });
}

// ─── 1. Fetch config guard ────────────────────────────────────────────────────
//
// force-dynamic and cache:"no-store" both prevent Data Cache from storing
// tagged responses, making revalidateTag a no-op. These tests verify those
// options are not set on the pages that need to benefit from cache tags.

test.describe("Fetch config — pages must not disable caching", () => {
  test("/animals page does not emit Cache-Control: no-store", async ({
    page,
  }) => {
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith("/animals") && r.status() === 200,
      ),
      page.goto("/animals"),
    ]);

    const cc = response.headers()["cache-control"] ?? "";
    expect(cc).not.toContain("no-store");
  });

  test("/animals/:id page does not emit Cache-Control: no-store", async ({
    page,
  }) => {
    const createResp = await createAnimal(page.request, {
      name: unique("Config Guard"),
    });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/animals/${id}`) && r.status() === 200,
      ),
      page.goto(`/animals/${id}`),
    ]);

    const cc = response.headers()["cache-control"] ?? "";
    expect(cc).not.toContain("no-store");
  });

  test("/ (homepage) does not emit Cache-Control: no-store", async ({
    page,
  }) => {
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/" && r.status() === 200,
      ),
      page.goto("/"),
    ]);

    const cc = response.headers()["cache-control"] ?? "";
    expect(cc).not.toContain("no-store");
  });
});

// ─── 2. Tag invalidation ──────────────────────────────────────────────────────
//
// Pattern: warm cache → mutate via BFF → re-render must reflect mutation.
// If revalidateTag is not called (or tags are not registered), the second
// render returns the cached (stale) response and the assertion fails.
//
// Note: existing tests only assert form-level success messages — none navigate
// back to /animals or /animals/:id to verify rendered page content. These tests
// fill that gap while also being the primary regression guard for cache tags.

test.describe("Tag invalidation — cached pages reflect mutations", () => {
  test("create: new animal appears on /animals list", async ({ page }) => {
    const name = unique("Tag Inv Create");

    // Warm
    await page.goto("/animals");

    const createResp = await createAnimal(page.request, { name, status: "AVAILABLE" });
    expect(createResp.status()).toBe(201);

    // Stale cache would not include the new animal
    await page.goto("/animals");
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  });

  test("edit: updated name appears on /animals list", async ({ page }) => {
    const original = unique("Tag Inv List Original");
    const updated = unique("Tag Inv List Updated");

    const createResp = await createAnimal(page.request, { name: original });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm
    await page.goto("/animals");
    await expect(page.getByRole("heading", { name: original, level: 2 })).toBeVisible();

    const editResp = await editAnimal(page.request, id, { name: updated });
    expect(editResp.status()).toBe(200);

    // Stale cache would still show original name
    await page.goto("/animals");
    await expect(page.getByRole("heading", { name: updated, level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: original, level: 2 })).toHaveCount(0);
  });

  test("edit: updated name appears on /animals/:id detail page", async ({
    page,
  }) => {
    const original = unique("Tag Inv Detail Original");
    const updated = unique("Tag Inv Detail Updated");

    const createResp = await createAnimal(page.request, { name: original });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm
    await page.goto(`/animals/${id}`);
    await expect(page.getByRole("heading", { name: original, level: 1 })).toBeVisible();

    const editResp = await editAnimal(page.request, id, { name: updated });
    expect(editResp.status()).toBe(200);

    // Stale cache would still show original name
    await page.goto(`/animals/${id}`);
    await expect(page.getByRole("heading", { name: updated, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: original, level: 1 })).toHaveCount(0);
  });

  test("edit: updated status appears on /animals/:id detail page", async ({
    page,
  }) => {
    const name = unique("Tag Inv Status");

    const createResp = await createAnimal(page.request, { name, status: "AVAILABLE" });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm
    await page.goto(`/animals/${id}`);
    await expect(page.getByText("Available")).toBeVisible();

    const editResp = await editAnimal(page.request, id, { status: "PENDING" });
    expect(editResp.status()).toBe(200);

    // Stale cache would still show Available
    await page.goto(`/animals/${id}`);
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByText("Available")).toHaveCount(0);
  });

  test("delete: animal removed from /animals list", async ({ page }) => {
    const name = unique("Tag Inv Delete List");

    const createResp = await createAnimal(page.request, { name });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm
    await page.goto("/animals");
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();

    const delResp = await deleteAnimal(page.request, id);
    expect(delResp.status()).toBe(200);

    // Stale cache would still show the deleted animal
    await page.goto("/animals");
    await expect(page.getByRole("heading", { name, level: 2 })).toHaveCount(0);
  });

  test("delete: /animals/:id detail returns 404", async ({ page }) => {
    const name = unique("Tag Inv Delete Detail");

    const createResp = await createAnimal(page.request, { name });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm
    await page.goto(`/animals/${id}`);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

    const delResp = await deleteAnimal(page.request, id);
    expect(delResp.status()).toBe(200);

    // Stale cache would serve the old page — must now 404
    const afterResp = await page.goto(`/animals/${id}`);
    expect(afterResp?.status()).toBe(404);
  });

  test("delete: sibling animals remain visible on /animals list", async ({
    page,
  }) => {
    const keep = unique("Tag Inv Keep");
    const remove = unique("Tag Inv Remove");

    const [keepResp, removeResp] = await Promise.all([
      createAnimal(page.request, { name: keep }),
      createAnimal(page.request, { name: remove }),
    ]);
    expect(keepResp.status()).toBe(201);
    expect(removeResp.status()).toBe(201);
    const { id: removeId } = await removeResp.json();

    // Warm
    await page.goto("/animals");

    const delResp = await deleteAnimal(page.request, removeId);
    expect(delResp.status()).toBe(200);

    await page.goto("/animals");
    await expect(page.getByRole("heading", { name: keep, level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: remove, level: 2 })).toHaveCount(0);
  });
});
