import type { Monitor } from "@unstatus/db";
import { SQL } from "bun";

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
  return e.message.replace(url, stripCredentials(url));
}

async function performPostgresCheck(monitor: Monitor) {
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

  let sql: InstanceType<typeof SQL> | null = null;

  try {
    const result = await Promise.race([
      (async () => {
        sql = new SQL({
          url: monitor.url!,
          max: 1,
          idleTimeout: 5,
          connectionTimeout: monitor.timeout,
        });

        const query = monitor.body?.trim() || "SELECT 1";
        await sql.unsafe(query);

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
    try { await sql?.close(); } catch {}
  }
}

export async function checkPostgres(monitor: Monitor) {
  const first = await performPostgresCheck(monitor);
  if (first.status !== "down") return first;

  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return performPostgresCheck(monitor);
}
