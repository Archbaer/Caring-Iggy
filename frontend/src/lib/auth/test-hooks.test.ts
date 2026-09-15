import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkTestSimulateFailure, getSessionMaxAge } from "./server";

function reqWith(header: string, value: string) {
  return new NextRequest("http://localhost/api/x", { headers: { [header]: value } });
}

describe("test-hook kill switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("simulate-failure hook is ACTIVE in dev/test", () => {
    vi.stubEnv("NODE_ENV", "test");
    const res = checkTestSimulateFailure(reqWith("x-test-simulate-failure", "upstream"));
    expect(res?.status).toBe(502);
  });

  it("simulate-failure hook is INERT in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = checkTestSimulateFailure(reqWith("x-test-simulate-failure", "upstream"));
    expect(res).toBeNull(); // header ignored, request proceeds normally
  });

  it("session-ttl hook is ACTIVE in dev/test", () => {
    vi.stubEnv("NODE_ENV", "test");
    const maxAge = getSessionMaxAge(reqWith("x-test-session-ttl", "42"), "ADOPTER");
    expect(maxAge).toBe(42);
  });

  it("session-ttl hook is INERT in production, returns role default", () => {
    vi.stubEnv("NODE_ENV", "production");
    const adopterMaxAge = getSessionMaxAge(reqWith("x-test-session-ttl", "42"), "ADOPTER");
    expect(adopterMaxAge).toBe(35 * 60);

    const otherMaxAge = getSessionMaxAge(reqWith("x-test-session-ttl", "42"), "STAFF");
    expect(otherMaxAge).toBe(20 * 60);
  });
});
