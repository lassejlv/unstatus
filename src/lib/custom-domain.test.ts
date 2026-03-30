import { describe, expect, it } from "bun:test";

import {
  CUSTOM_HOST_HEADER,
  getTrustedCustomHost,
  normalizeCustomDomain,
  normalizeOptionalCustomDomain,
} from "./custom-domain";

describe("normalizeCustomDomain", () => {
  it("normalizes a pasted URL to a bare hostname", () => {
    expect(normalizeCustomDomain("https://Status.Example.com/path?q=1")).toBe(
      "status.example.com",
    );
  });

  it("rejects ports", () => {
    expect(() => normalizeCustomDomain("status.example.com:3000")).toThrow(
      "Custom domain must not include a port.",
    );
  });

  it("returns undefined for empty optional input", () => {
    expect(normalizeOptionalCustomDomain("   ")).toBeUndefined();
  });
});

describe("getTrustedCustomHost", () => {
  it("reads the trusted custom host header", () => {
    const headers = new Headers({ [CUSTOM_HOST_HEADER]: "Status.Example.com" });
    expect(getTrustedCustomHost(headers)).toBe("status.example.com");
  });

  it("ignores invalid trusted custom host headers", () => {
    const headers = new Headers({ [CUSTOM_HOST_HEADER]: "bad host" });
    expect(getTrustedCustomHost(headers)).toBeNull();
  });
});
