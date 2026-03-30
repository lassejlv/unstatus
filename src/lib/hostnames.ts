import { env } from "@/lib/env";

const DEFAULT_PLATFORM_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];

function splitHostList(value: string | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => normalizeHostname(entry))
    .filter(Boolean);
}

export function normalizeHostname(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  let candidate = trimmed;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).hostname;
    } catch {
      return "";
    }
  }

  candidate = candidate.split("/")[0] ?? candidate;
  candidate = candidate.replace(/\.$/, "");

  if (candidate.startsWith("[") && candidate.endsWith("]")) {
    candidate = candidate.slice(1, -1);
  }

  const lastColonIndex = candidate.lastIndexOf(":");
  if (lastColonIndex > -1 && candidate.indexOf(":") === lastColonIndex) {
    const maybePort = candidate.slice(lastColonIndex + 1);
    if (/^\d+$/.test(maybePort)) {
      candidate = candidate.slice(0, lastColonIndex);
    }
  }

  return candidate.toLowerCase();
}

export function getRequestHostname(headers: Headers) {
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost ?? headers.get("host") ?? "";
  const normalized = normalizeHostname(host);
  return normalized || null;
}

export function getPlatformHosts() {
  const hosts = new Set<string>();

  for (const host of DEFAULT_PLATFORM_HOSTS) {
    hosts.add(host);
  }

  for (const host of splitHostList(env.PLATFORM_HOSTS)) {
    hosts.add(host);
  }

  if (env.APP_ORIGIN) {
    hosts.add(normalizeHostname(new URL(env.APP_ORIGIN).hostname));
  }

  if (env.CLOUDFLARE_SAAS_TARGET) {
    hosts.add(normalizeHostname(env.CLOUDFLARE_SAAS_TARGET));
  }

  return hosts;
}

export function isPlatformHost(hostname: string) {
  return getPlatformHosts().has(normalizeHostname(hostname));
}

function hasValidLabels(hostname: string) {
  const labels = hostname.split(".").filter(Boolean);

  if (labels.length < 3) {
    return false;
  }

  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-") &&
      /^[a-z0-9-]+$/.test(label),
  );
}

export function isValidCustomHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);

  if (!normalized) return false;
  if (normalized.includes("..")) return false;
  if (!normalized.includes(".")) return false;
  if (isPlatformHost(normalized)) return false;

  return hasValidLabels(normalized);
}

export function assertValidCustomHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);

  if (!isValidCustomHostname(normalized)) {
    throw new Error(
      "Enter a valid subdomain like status.example.com. Apex/root domains are not supported yet.",
    );
  }

  return normalized;
}

export function customDomainsFeatureEnabled() {
  return Boolean(env.CLOUDFLARE_SAAS_TARGET || env.PLATFORM_HOSTS);
}
