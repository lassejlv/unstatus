import type { Context, Next } from "hono";
import { prisma } from "@/lib/prisma";
import { ApiError } from "../helpers";

type ApiContext = {
  organizationId: string;
  isPro: boolean;
  apiKeyId: string;
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
        select: { id: true, subscriptionActive: true },
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
  c.set("isPro", apiKey.organization.subscriptionActive);
  c.set("apiKeyId", apiKey.id);

  await next();
}

export function getApiContext(c: Context): ApiContext {
  return {
    organizationId: c.get("organizationId") as string,
    isPro: c.get("isPro") as boolean,
    apiKeyId: c.get("apiKeyId") as string,
  };
}

export function requirePro(c: Context): void {
  const { isPro } = getApiContext(c);
  if (!isPro) {
    throw new ApiError("FORBIDDEN", "This endpoint requires a Pro subscription. Upgrade at /pricing.", 403);
  }
}
