import { describe, it, expect, vi } from "vitest";
import { createKongClient } from "./kong-client";

describe("kong client", () => {
  it("attaches Bearer token and forwarded client IP", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const client = createKongClient({
      baseUrl: "http://kong:8000",
      fetchImpl: fetchSpy,
      getToken: async () => "jwt-xyz",
    });

    await client.call("/api/animals", { clientIp: "203.0.113.7" });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("http://kong:8000/api/animals");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer jwt-xyz");
    expect((init.headers as Record<string, string>)["X-Forwarded-For"]).toBe("203.0.113.7");
  });

  it("omits Authorization for public calls", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const client = createKongClient({
      baseUrl: "http://kong:8000",
      fetchImpl: fetchSpy,
      getToken: async () => "jwt-xyz",
    });

    await client.call("/api/animals", { clientIp: "203.0.113.7", public: true });

    const init = fetchSpy.mock.calls[0][1];
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("omits X-Forwarded-For when clientIp is undefined", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const client = createKongClient({
      baseUrl: "http://kong:8000",
      fetchImpl: fetchSpy,
      getToken: async () => "jwt-xyz",
    });

    await client.call("/api/animals", {});

    const init = fetchSpy.mock.calls[0][1];
    expect((init.headers as Record<string, string>)["X-Forwarded-For"]).toBeUndefined();
  });
});
