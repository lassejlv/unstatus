import type { Context, Next } from "hono";
import { ApiError } from "../helpers";

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    if (err instanceof ApiError) {
      return c.json(
        { error: { code: err.code, message: err.message } },
        err.status as any,
      );
    }
    console.error("API error:", err);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      500,
    );
  }
}
