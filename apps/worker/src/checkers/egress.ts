import { isIP } from "net";
import { lookup } from "dns/promises";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
]);

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
  );
}

function isBlockedIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fe80:")
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("ff")
    || normalized.startsWith("::ffff:0:")
    || normalized.startsWith("::ffff:127.")
    || normalized.startsWith("::ffff:10.")
    || normalized.startsWith("::ffff:192.168.")
    || /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(normalized)
    || normalized.startsWith("64:ff9b:1:")
  );
}

function isBlockedIp(address: string) {
  const family = isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return true;
}

function normalizeHostname(hostname: string) {
  return hostname.trim().replace(/^\[(.*)\]$/, "$1").toLowerCase();
}

export async function assertPublicHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized || BLOCKED_HOSTNAMES.has(normalized) || normalized.endsWith(".localhost")) {
    throw new Error("Target host is not allowed");
  }

  if (isIP(normalized)) {
    if (isBlockedIp(normalized)) {
      throw new Error("Target IP range is not allowed");
    }
    return;
  }

  const addresses = await lookup(normalized, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw new Error("Target resolves to a blocked IP range");
  }
}

export async function assertPublicUrl(rawUrl: string, allowedProtocols: readonly string[]) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!allowedProtocols.includes(url.protocol)) {
    throw new Error("URL protocol is not allowed");
  }

  await assertPublicHostname(url.hostname);
  return url;
}

export async function assertPublicHostTarget(rawHost: string) {
  const value = rawHost.trim();
  if (!value) throw new Error("No host configured");

  try {
    const url = new URL(value.includes("://") ? value : `http://${value}`);
    await assertPublicHostname(url.hostname);
    return url.hostname;
  } catch (error) {
    if (error instanceof Error && error.message !== "Invalid URL") throw error;
    await assertPublicHostname(value);
    return value;
  }
}

