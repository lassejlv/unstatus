import type { Context, Next } from "hono";
import { ZodError } from "zod";
import { ApiError } from "../helpers";

function isApiError(err: unknown): err is ApiError {
  return typeof err === "object"
    && err !== null
    && "isApiError" in err
    && "code" in err
    && "message" in err
    && "status" in err;
}

function formatZodError(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Request validation failed";

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    if (isApiError(err)) {
      return c.json(
        { error: { code: err.code, message: err.message } },
        err.status as any,
      );
    }

    if (err instanceof ZodError) {
      return c.json(
        { error: { code: "BAD_REQUEST", message: formatZodError(err) } },
        400,
      );
    }

    if (err instanceof SyntaxError && /JSON/i.test(err.message)) {
      return c.json(
        { error: { code: "BAD_REQUEST", message: "Malformed JSON request body" } },
        400,
      );
    }

    console.error("API error:", err);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      500,
    );
  }
}
