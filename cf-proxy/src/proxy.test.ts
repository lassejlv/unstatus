import { describe, expect, it } from "bun:test";

import {
  buildCustomHostRequest,
  buildUpstreamUrl,
  getRequestHostname,
  isBlockedCustomPath,
  isFirstPartyHost,
} from "./proxy";

const env = {
  APP_ORIGIN: "https://origin.unstatus.app",
  FIRST_PARTY_HOSTS: "unstatus.app,www.unstatus.app",
};

describe("cf-proxy helpers", () => {
  it("detects first-party hosts", () => {
    expect(isFirstPartyHost("unstatus.app", env)).toBe(true);
    expect(isFirstPartyHost("status.customer.com", env)).toBe(false);
  });

  it("blocks auth and dashboard paths for custom hosts", () => {
    expect(isBlockedCustomPath("/login")).toBe(true);
    expect(isBlockedCustomPath("/dashboard")).toBe(true);
    expect(isBlockedCustomPath("/api/auth/sign-in")).toBe(true);
    expect(isBlockedCustomPath("/api/rpc")).toBe(false);
  });

  it("preserves the incoming path and query in the upstream URL", () => {
    const request = new Request(
      "https://status.customer.com/incidents/123?foo=bar",
    );
    expect(buildUpstreamUrl(request, env).toString()).toBe(
      "https://origin.unstatus.app/incidents/123?foo=bar",
    );
  });

  it("forwards the trusted custom host header", () => {
    const request = new Request("https://Status.Customer.com/api/rpc");
    const upstream = buildCustomHostRequest(request, env);

    expect(getRequestHostname(request)).toBe("status.customer.com");
    expect(upstream.headers.get("x-unstatus-custom-host")).toBe(
      "status.customer.com",
    );
  });
});
