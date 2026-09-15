import { describe, it, expect } from "vitest";
import { resolveClientIp } from "./client-ip";

describe("resolveClientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(resolveClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.3" });
    expect(resolveClientIp(headers)).toBe("198.51.100.3");
  });

  it("falls back to 127.0.0.1 when neither header is present", () => {
    const headers = new Headers();
    expect(resolveClientIp(headers)).toBe("127.0.0.1");
  });
});
