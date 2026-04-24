import type { Monitor } from "@unstatus/db";
import { RedisClient } from "bun";
import { assertPublicUrl } from "./egress.js";

const RETRY_DELAY_MS = 1500;

function stripCredentials(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = "***";
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return "[invalid url]";
  }
}

function formatError(e: unknown, url: string): string {
  if (!(e instanceof Error)) return "Unknown error";
  // Strip any credentials that might appear in the error message
  return e.message.replace(url, stripCredentials(url));
}

async function performRedisCheck(monitor: Monitor) {
  const start = performance.now();

  if (!monitor.url) {
    return {
      status: "down" as const,
      latency: 0,
      statusCode: null,
      message: "No connection URL configured",
      responseHeaders: null,
      responseBody: null,
    };
  }

  let client: RedisClient | null = null;

  try {
    const result = await Promise.race([
      (async () => {
        await assertPublicUrl(monitor.url!, ["redis:", "rediss:"]);
        client = new RedisClient(monitor.url!);
        await client.connect();

        if (monitor.body) {
          const parts = monitor.body.trim().split(/\s+/);
          await client.send(parts[0], ...parts.slice(1));
        } else {
          await client.send("PING");
        }

        return { ok: true };
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out")), monitor.timeout * 1000),
      ),
    ]);

    return {
      status: result.ok ? "up" : "down",
      latency: Math.round(performance.now() - start),
      statusCode: null,
      message: null,
      responseHeaders: null,
      responseBody: null,
    };
  } catch (e) {
    return {
      status: "down" as const,
      latency: Math.round(performance.now() - start),
      statusCode: null,
      message: formatError(e, monitor.url),
      responseHeaders: null,
      responseBody: null,
    };
  } finally {
    try { client?.close(); } catch {}
  }
}

export async function checkRedis(monitor: Monitor) {
  const first = await performRedisCheck(monitor);
  if (first.status !== "down") return first;

  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return performRedisCheck(monitor);
}
