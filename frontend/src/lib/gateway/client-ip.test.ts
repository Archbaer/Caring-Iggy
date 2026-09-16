import { describe, it, expect } from "vitest";
import { resolveClientIp } from "./client-ip";

describe("resolveClientIp", () => {
  describe("when trustProxyHeaders is true", () => {
    it("uses the first entry of x-forwarded-for", () => {
      const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
      expect(resolveClientIp(headers, { trustProxyHeaders: true })).toBe("203.0.113.7");
    });

    it("falls back to x-real-ip when x-forwarded-for is absent", () => {
      const headers = new Headers({ "x-real-ip": "198.51.100.3" });
      expect(resolveClientIp(headers, { trustProxyHeaders: true })).toBe("198.51.100.3");
    });

    it("returns undefined when neither header is present", () => {
      const headers = new Headers();
      expect(resolveClientIp(headers, { trustProxyHeaders: true })).toBeUndefined();
    });
  });

  describe("when trustProxyHeaders is false or omitted", () => {
    it("returns undefined even when x-forwarded-for is present", () => {
      const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
      expect(resolveClientIp(headers, { trustProxyHeaders: false })).toBeUndefined();
    });

    it("returns undefined when no options are given", () => {
      const headers = new Headers({ "x-forwarded-for": "203.0.113.7" });
      expect(resolveClientIp(headers)).toBeUndefined();
    });
  });
});
