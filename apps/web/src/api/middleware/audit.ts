import type { Context, Next } from "hono";
import { auditLog } from "@unstatus/observability";
import { getApiContext } from "./auth";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function apiAudit(c: Context, next: Next) {
  await next();

  if (READ_METHODS.has(c.req.method) || c.res.status >= 400) return;

  const { organizationId, apiKeyId } = getApiContext(c);
  auditLog({
    service: "web",
    action: `api.${c.req.method.toLowerCase()}`,
    result: "success",
    organizationId,
    resourceType: "api_request",
    resourceId: apiKeyId,
    message: "API key request completed",
    metadata: {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      apiKeyId,
    },
  });
}
