import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export const CUSTOM_HOST_HEADER = "x-unstatus-custom-host";

const HOSTNAME_PATTERN =
  /^(localhost|(?:xn--)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.(?:xn--)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)$/i;

export function normalizeCustomDomain(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) {
    throw new Error("Custom domain cannot be empty.");
  }

  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("Custom domain must be a valid hostname.");
  }

  if (url.username || url.password) {
    throw new Error("Custom domain must not include credentials.");
  }

  if (url.port) {
    throw new Error("Custom domain must not include a port.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || !HOSTNAME_PATTERN.test(hostname)) {
    throw new Error("Custom domain must be a valid hostname.");
  }

  return hostname;
}

export function normalizeOptionalCustomDomain(
  input?: string | null,
): string | undefined {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  return normalizeCustomDomain(trimmed);
}

export function getTrustedCustomHost(headers: Headers): string | null {
  const customHost = headers.get(CUSTOM_HOST_HEADER);
  if (!customHost) {
    return null;
  }

  try {
    return normalizeCustomDomain(customHost);
  } catch {
    return null;
  }
}

export const getCustomDomainContext = createServerFn({ method: "GET" }).handler(
  async () => ({
    customHost: getTrustedCustomHost(getRequestHeaders()),
  }),
);
