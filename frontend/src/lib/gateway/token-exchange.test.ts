import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTokenExchanger } from "./token-exchange";

describe("token exchange", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches a token from the exchange endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({ token: "jwt-1", expiresAtEpochSeconds: nowSec() + 300 });
    const exchanger = createTokenExchanger(fetcher, () => nowSec());

    const token = await exchanger.getToken("session-abc");

    expect(token).toBe("jwt-1");
    expect(fetcher).toHaveBeenCalledWith("session-abc");
  });

  it("reuses the cached token within TTL (no second fetch)", async () => {
    const fetcher = vi.fn().mockResolvedValue({ token: "jwt-1", expiresAtEpochSeconds: nowSec() + 300 });
    const exchanger = createTokenExchanger(fetcher, () => nowSec());

    await exchanger.getToken("session-abc");
    await exchanger.getToken("session-abc");

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches after the token has expired", async () => {
    let clock = nowSec();
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ token: "jwt-1", expiresAtEpochSeconds: clock + 300 })
      .mockResolvedValueOnce({ token: "jwt-2", expiresAtEpochSeconds: clock + 900 });
    const exchanger = createTokenExchanger(fetcher, () => clock);

    const first = await exchanger.getToken("s");
    clock += 301;
    const second = await exchanger.getToken("s");

    expect(first).toBe("jwt-1");
    expect(second).toBe("jwt-2");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

function nowSec() { return Math.floor(Date.now() / 1000); }
