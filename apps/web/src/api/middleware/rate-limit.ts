import type { Context, Next } from "hono";
import { getApiContext } from "./auth";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const FREE_LIMIT = 100;
const PRO_LIMIT = 1000;

const windows = new Map<string, { count: number; start: number }>();

export async function rateLimit(c: Context, next: Next) {
  const { apiKeyId, isPro } = getApiContext(c);
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT;
  const now = Date.now();

  let window = windows.get(apiKeyId);
  if (!window || now - window.start >= WINDOW_MS) {
    window = { count: 0, start: now };
    windows.set(apiKeyId, window);
  }

  window.count++;

  const resetAt = Math.ceil((window.start + WINDOW_MS) / 1000);
  const remaining = Math.max(0, limit - window.count);

  c.header("X-RateLimit-Limit", String(limit));
  c.header("X-RateLimit-Remaining", String(remaining));
  c.header("X-RateLimit-Reset", String(resetAt));

  if (window.count > limit) {
    const retryAfter = Math.ceil((window.start + WINDOW_MS - now) / 1000);
    c.header("Retry-After", String(retryAfter));
    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        },
      },
      429,
    );
  }

  await next();
}
