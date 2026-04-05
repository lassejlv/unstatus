import type { Monitor } from "@unstatus/db";

type Rule = { type: string; operator: string; value: string };

const DEFAULT_USER_AGENT = "Unstatus/1.0 (https://unstatus.app; monitor)";
const RETRY_DELAY_MS = 1500;

async function performHttpCheck(monitor: Monitor) {
  const start = performance.now();
  const userHeaders: Record<string, string> = (monitor.headers as Record<string, string>) ?? {};

  // Inject a sensible User-Agent if the user hasn't set one
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "*/*",
    ...userHeaders,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), monitor.timeout * 1000);

  try {
    const res = await fetch(monitor.url!, {
      method: monitor.method ?? "GET",
      headers,
      body: monitor.method !== "GET" ? monitor.body ?? undefined : undefined,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - start);

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });

    let responseBody: string | null = null;
    try {
      responseBody = await res.text();
      // Strip null bytes — PostgreSQL text columns reject them
      responseBody = responseBody.replaceAll("\x00", "");
      if (responseBody.length > 64_000) responseBody = responseBody.slice(0, 64_000);
    } catch {}

    const rules = (monitor.rules as Rule[]) ?? [];
    const passed = evaluateRules(rules, res, responseBody);

    return {
      status: passed ? "up" : "degraded",
      latency,
      statusCode: res.status,
      message: passed ? null : `Rule check failed (HTTP ${res.status})`,
      responseHeaders,
      responseBody,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    return {
      status: "down" as const,
      latency: Math.round(performance.now() - start),
      statusCode: null,
      message: formatError(e),
      responseHeaders: null,
      responseBody: null,
    };
  }
}

export async function checkHttp(monitor: Monitor) {
  // First attempt
  const first = await performHttpCheck(monitor);
  if (first.status !== "down") return first;

  // Retry once on failure to avoid false positives from transient errors
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  const retry = await performHttpCheck(monitor);

  // If retry succeeds, use that result. If both fail, return the retry result
  // (it has the most recent error message).
  return retry;
}

function formatError(e: unknown): string {
  if (!(e instanceof Error)) return "Unknown error";
  const msg = e.message;

  // Make common errors more readable
  if (e.name === "AbortError" || msg.includes("aborted")) return "Request timed out";
  if (msg.includes("ECONNREFUSED")) return "Connection refused";
  if (msg.includes("ECONNRESET")) return "Connection reset";
  if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) return `DNS resolution failed for ${msg.match(/getaddrinfo.*? (\S+)/)?.[1] ?? "host"}`;
  if (msg.includes("ETIMEDOUT")) return "Connection timed out";
  if (msg.includes("CERT") || msg.includes("certificate")) return `TLS/SSL error: ${msg}`;
  if (msg.includes("EHOSTUNREACH")) return "Host unreachable";

  return msg;
}

function evaluateRules(rules: Rule[], res: Response, body: string | null): boolean {
  if (rules.length === 0) return res.ok;
  return rules.every((rule) => {
    if (rule.type === "status") {
      return compare(res.status.toString(), rule.operator, rule.value);
    }
    if (rule.type === "header") {
      const [headerName, ...rest] = rule.value.split(":");
      const expected = rest.join(":");
      const actual = res.headers.get(headerName?.trim() ?? "");
      return compare(actual ?? "", rule.operator, expected?.trim() ?? "");
    }
    if (rule.type === "json_body") {
      if (!body) return false;
      try {
        const json = JSON.parse(body);
        const [path, ...rest] = rule.value.split(":");
        const expected = rest.join(":");
        const actual = getJsonPath(json, path?.trim() ?? "");
        return compare(String(actual ?? ""), rule.operator, expected?.trim() ?? "");
      } catch {
        return false;
      }
    }
    return true;
  });
}

function getJsonPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current: any, key) => {
    if (current == null) return undefined;
    const match = key.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      return current[match[1]]?.[Number(match[2])];
    }
    return current[key];
  }, obj);
}

function compare(actual: string, operator: string, expected: string): boolean {
  switch (operator) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "contains": return actual.includes(expected);
    default: return actual === expected;
  }
}
