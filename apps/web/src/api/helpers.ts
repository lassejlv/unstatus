import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { output, ZodType } from "zod";

export class ApiError extends Error {
  readonly isApiError = true;

  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function success<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ data }, status);
}

export function paginated<T>(
  c: Context,
  data: T[],
  total: number,
  limit: number,
  offset: number,
) {
  return c.json({
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

export async function parseJsonBody<Schema extends ZodType>(
  c: Context,
  schema: Schema,
): Promise<output<Schema>> {
  return schema.parseAsync(await c.req.json());
}

export function parsePagination(c: Context): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(Number(c.req.query("limit")) || 20, 1),
    100,
  );
  const offset = Math.max(Number(c.req.query("offset")) || 0, 0);
  return { limit, offset };
}
