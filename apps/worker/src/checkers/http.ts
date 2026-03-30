import type { Monitor } from "@unstatus/db";

type Rule = { type: string; operator: string; value: string };

export async function checkHttp(monitor: Monitor) {
  const start = performance.now();
  try {
    const headers: Record<string, string> = (monitor.headers as Record<string, string>) ?? {};
    const res = await fetch(monitor.url!, {
      method: monitor.method ?? "GET",
      headers,
      body: monitor.method !== "GET" ? monitor.body ?? undefined : undefined,
      signal: AbortSignal.timeout(monitor.timeout * 1000),
    });
    const latency = Math.round(performance.now() - start);
    const rules = (monitor.rules as Rule[]) ?? [];
    const passed = evaluateRules(rules, res);

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });

    let responseBody: string | null = null;
    try {
      responseBody = await res.text();
      if (responseBody.length > 64_000) responseBody = responseBody.slice(0, 64_000);
    } catch {}

    return {
      status: passed ? "up" : "degraded",
      latency,
      statusCode: res.status,
      message: passed ? null : "Rule check failed",
      responseHeaders,
      responseBody,
    };
  } catch (e) {
    return {
      status: "down" as const,
      latency: Math.round(performance.now() - start),
      statusCode: null,
      message: e instanceof Error ? e.message : "Unknown error",
      responseHeaders: null,
      responseBody: null,
    };
  }
}

function evaluateRules(rules: Rule[], res: Response): boolean {
  if (rules.length === 0) return res.ok;
  return rules.every((rule) => {
    if (rule.type === "status") {
      return compare(res.status.toString(), rule.operator, rule.value);
    }
    if (rule.type === "header") {
      const [headerName, expected] = rule.value.split(":");
      const actual = res.headers.get(headerName?.trim() ?? "");
      return compare(actual ?? "", rule.operator, expected?.trim() ?? "");
    }
    return true;
  });
}

function compare(actual: string, operator: string, expected: string): boolean {
  switch (operator) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "contains": return actual.includes(expected);
    default: return actual === expected;
  }
}
