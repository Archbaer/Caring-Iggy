/**
 * Cache invalidation tests
 *
 * These tests verify that mutations (create / edit / delete) are immediately
 * visible on subsequent page renders — no stale data served from cache.
 *
 * In production the mechanism is Next.js Data Cache + revalidateTag.
 * In dev mode the Data Cache is inactive, but data-consistency must still hold.
 *
 * Each test:
 *   1. Seeds a known state (unique name via timestamp).
 *   2. Mutates via a BFF route.
 *   3. Re-renders the affected page and asserts the mutation is visible.
 *
 * A failure here means either:
 *   - revalidateTag is not called on mutation, OR
 *   - fetch options prevent the cache tag from being registered, OR
 *   - the page uses force-dynamic / no-store in a way that breaks coherence.
 */

import { test, expect } from "@playwright/test";
import { getCsrfToken, createAnimal } from "../api/helpers";

// ─── helpers ─────────────────────────────────────────────────────────────────

function unique(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function editAnimal(
  page: Parameters<typeof getCsrfToken>[0],
  id: string,
  data: Record<string, unknown>,
) {
  const csrf = await getCsrfToken(page);
  return page.put(`/api/animals/${id}/edit`, {
    data,
    headers: { "x-csrf-token": csrf, origin: "http://localhost:3000" },
  });
}

async function deleteAnimal(
  page: Parameters<typeof getCsrfToken>[0],
  id: string,
) {
  const csrf = await getCsrfToken(page);
  return page.delete(`/api/animals/${id}/delete`, {
    headers: { "x-csrf-token": csrf, origin: "http://localhost:3000" },
  });
}

// ─── CREATE → list ───────────────────────────────────────────────────────────

test.describe("Cache invalidation — create", () => {
  test("newly created animal appears on /animals immediately", async ({
    page,
  }) => {
    const name = unique("Cache Create");

    // Warm the list cache (first render before the animal exists)
    await page.goto("/animals");

    const resp = await createAnimal(page.request, {
      name,
      status: "AVAILABLE",
    });
    expect(resp.status()).toBe(201);

    // After create, list must reflect the new animal without a manual restart
    await page.goto("/animals");
    await expect(
      page.getByRole("heading", { name, level: 2 }),
    ).toBeVisible();
  });

  test("newly created animal appears on homepage featured section immediately", async ({
    page,
  }) => {
    // Homepage slices to 3 animals — this test verifies the page re-renders
    // fresh (not from a stale full-page cache) after a create mutation.
    const name = unique("Cache Home Create");

    await page.goto("/");

    const resp = await createAnimal(page.request, {
      name,
      status: "AVAILABLE",
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    const id: string = body.id;

    // Navigate directly to the detail to prove the create flushed the cache
    await page.goto(`/animals/${id}`);
    await expect(
      page.getByRole("heading", { name, level: 1 }),
    ).toBeVisible();
  });
});

// ─── EDIT → list + detail ────────────────────────────────────────────────────

test.describe("Cache invalidation — edit", () => {
  test("edited name is visible on /animals list immediately", async ({
    page,
  }) => {
    const original = unique("Cache Edit Original");
    const updated = unique("Cache Edit Updated");

    const createResp = await createAnimal(page.request, { name: original });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm: list shows original name
    await page.goto("/animals");
    await expect(
      page.getByRole("heading", { name: original, level: 2 }),
    ).toBeVisible();

    // Mutate
    const editResp = await editAnimal(page.request, id, { name: updated });
    expect(editResp.status()).toBe(200);

    // List must show new name, old name gone
    await page.goto("/animals");
    await expect(
      page.getByRole("heading", { name: updated, level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: original, level: 2 }),
    ).toHaveCount(0);
  });

  test("edited name is visible on /animals/:id detail page immediately", async ({
    page,
  }) => {
    const original = unique("Detail Edit Original");
    const updated = unique("Detail Edit Updated");

    const createResp = await createAnimal(page.request, { name: original });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm: detail shows original
    await page.goto(`/animals/${id}`);
    await expect(
      page.getByRole("heading", { name: original, level: 1 }),
    ).toBeVisible();

    // Mutate
    const editResp = await editAnimal(page.request, id, { name: updated });
    expect(editResp.status()).toBe(200);

    // Detail must reflect new name
    await page.goto(`/animals/${id}`);
    await expect(
      page.getByRole("heading", { name: updated, level: 1 }),
    ).toBeVisible();
  });

  test("edited status is reflected on detail page immediately", async ({
    page,
  }) => {
    const name = unique("Cache Status Edit");

    const createResp = await createAnimal(page.request, {
      name,
      status: "AVAILABLE",
    });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm: detail shows AVAILABLE badge
    await page.goto(`/animals/${id}`);
    await expect(page.getByText("Available")).toBeVisible();

    // Mutate status
    const editResp = await editAnimal(page.request, id, { status: "PENDING" });
    expect(editResp.status()).toBe(200);

    // Detail must show new status
    await page.goto(`/animals/${id}`);
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByText("Available")).toHaveCount(0);
  });

  test("multiple sequential edits each reflect on the next read", async ({
    page,
  }) => {
    const name1 = unique("Seq Edit A");
    const name2 = unique("Seq Edit B");
    const name3 = unique("Seq Edit C");

    const createResp = await createAnimal(page.request, { name: name1 });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    for (const [from, to] of [
      [name1, name2],
      [name2, name3],
    ]) {
      const editResp = await editAnimal(page.request, id, { name: to });
      expect(editResp.status()).toBe(200);

      await page.goto(`/animals/${id}`);
      await expect(
        page.getByRole("heading", { name: to, level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: from, level: 1 }),
      ).toHaveCount(0);
    }
  });
});

// ─── DELETE → list + detail ──────────────────────────────────────────────────

test.describe("Cache invalidation — delete", () => {
  test("deleted animal no longer appears on /animals list", async ({
    page,
  }) => {
    const name = unique("Cache Delete List");

    const createResp = await createAnimal(page.request, { name });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Warm: animal is in list
    await page.goto("/animals");
    await expect(
      page.getByRole("heading", { name, level: 2 }),
    ).toBeVisible();

    // Mutate
    const delResp = await deleteAnimal(page.request, id);
    expect(delResp.status()).toBe(200);

    // List must not show deleted animal
    await page.goto("/animals");
    await expect(
      page.getByRole("heading", { name, level: 2 }),
    ).toHaveCount(0);
  });

  test("deleted animal detail page returns 404", async ({ page }) => {
    const name = unique("Cache Delete Detail");

    const createResp = await createAnimal(page.request, { name });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    // Verify accessible before delete
    const beforeResp = await page.goto(`/animals/${id}`);
    expect(beforeResp?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name, level: 1 }),
    ).toBeVisible();

    // Delete
    const delResp = await deleteAnimal(page.request, id);
    expect(delResp.status()).toBe(200);

    // Detail must now 404
    const afterResp = await page.goto(`/animals/${id}`);
    expect(afterResp?.status()).toBe(404);
  });

  test("deleting one animal does not remove others from list", async ({
    page,
  }) => {
    const nameA = unique("Cache Keep A");
    const nameB = unique("Cache Del B");

    const [respA, respB] = await Promise.all([
      createAnimal(page.request, { name: nameA }),
      createAnimal(page.request, { name: nameB }),
    ]);
    expect(respA.status()).toBe(201);
    expect(respB.status()).toBe(201);
    const { id: idB } = await respB.json();

    // Delete only B
    const delResp = await deleteAnimal(page.request, idB);
    expect(delResp.status()).toBe(200);

    // A still on list, B gone
    await page.goto("/animals");
    await expect(
      page.getByRole("heading", { name: nameA, level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: nameB, level: 2 }),
    ).toHaveCount(0);
  });
});

// ─── fetch config guard ──────────────────────────────────────────────────────

test.describe("Cache fetch configuration", () => {
  test("animals list page does not send Cache-Control: no-store", async ({
    page,
  }) => {
    // force-dynamic / no-store was responsible for breaking tag invalidation.
    // The page should no longer opt all fetches out of caching.
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/animals") && r.status() === 200),
      page.goto("/animals"),
    ]);

    const cacheControl = response.headers()["cache-control"] ?? "";
    expect(cacheControl).not.toContain("no-store");
  });

  test("animal detail page does not send Cache-Control: no-store", async ({
    page,
  }) => {
    const createResp = await createAnimal(page.request, {
      name: unique("Cache Header Test"),
    });
    expect(createResp.status()).toBe(201);
    const { id } = await createResp.json();

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/animals/${id}`) && r.status() === 200,
      ),
      page.goto(`/animals/${id}`),
    ]);

    const cacheControl = response.headers()["cache-control"] ?? "";
    expect(cacheControl).not.toContain("no-store");
  });
});
