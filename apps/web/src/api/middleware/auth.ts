import type { Context, Next } from "hono";
import { prisma } from "@/lib/prisma";
import { type PlanTier, resolvePlanTier } from "@/lib/plans";
import { hashKey } from "@/lib/crypto";

type ApiContext = {
  organizationId: string;
  tier: PlanTier;
  apiKeyId: string;
};

export async function apiKeyAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer usk_")) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Missing or invalid API key. Use: Authorization: Bearer usk_..." } },
      401,
    );
  }

  const key = header.slice(7);
  const keyHash = await hashKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      organization: {
        select: { id: true, subscriptionActive: true, subscriptionPlanName: true },
      },
    },
  });

  if (!apiKey || apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or expired API key" } },
      401,
    );
  }

  // Fire-and-forget lastUsedAt update
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  c.set("organizationId", apiKey.organization.id);
  c.set("tier", resolvePlanTier(apiKey.organization.subscriptionActive, apiKey.organization.subscriptionPlanName));
  c.set("apiKeyId", apiKey.id);

  await next();
}

export function getApiContext(c: Context): ApiContext {
  return {
    organizationId: c.get("organizationId") as string,
    tier: c.get("tier") as PlanTier,
    apiKeyId: c.get("apiKeyId") as string,
  };
}
