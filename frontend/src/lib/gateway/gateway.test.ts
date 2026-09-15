import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { gatewayFetch, GatewayAuthError, KONG_URL } from "./index";

describe("gatewayFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws GatewayAuthError and never calls fetch when session is missing for a non-public call", async () => {
    await expect(gatewayFetch("/api/animals", { method: "POST", clientIp: "1.2.3.4" }))
      .rejects.toBeInstanceOf(GatewayAuthError);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("skips the token exchange for public calls", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("[]", { status: 200 }));

    await gatewayFetch("/api/animals", { public: true, clientIp: "203.0.113.7" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${KONG_URL}/api/animals`);
    expect(init.headers["X-Forwarded-For"]).toBe("203.0.113.7");
    expect(init.headers["Authorization"]).toBeUndefined();
  });

  it("exchanges the session for a token and attaches it as a Bearer header", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "jwt-1", expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 300 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await gatewayFetch("/api/adopters/1", { session: "session-token", clientIp: "9.9.9.9" });

    expect(fetch).toHaveBeenCalledTimes(2);
    const [exchangeUrl, exchangeInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(exchangeUrl).toBe(`${KONG_URL}/internal/token`);
    expect(JSON.parse(exchangeInit.body as string)).toEqual({ sessionToken: "session-token" });

    const [callUrl, callInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(callUrl).toBe(`${KONG_URL}/api/adopters/1`);
    expect(callInit.headers["Authorization"]).toBe("Bearer jwt-1");
    expect(callInit.headers["X-Forwarded-For"]).toBe("9.9.9.9");
  });
});
