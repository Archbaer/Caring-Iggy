import { describe, expect, it } from "vitest";

import { safeReadJson } from "./client";

describe("safeReadJson", () => {
  it("returns parsed JSON for JSON responses", async () => {
    const response = Response.json({ ok: true });

    await expect(safeReadJson(response)).resolves.toEqual({ ok: true });
  });

  it("returns null for non-JSON responses", async () => {
    const response = new Response("plain text", {
      headers: { "content-type": "text/plain" },
    });

    await expect(safeReadJson(response)).resolves.toBeNull();
  });

  it("returns null for malformed JSON", async () => {
    const response = new Response("{", {
      headers: { "content-type": "application/json" },
    });

    await expect(safeReadJson(response)).resolves.toBeNull();
  });
});
