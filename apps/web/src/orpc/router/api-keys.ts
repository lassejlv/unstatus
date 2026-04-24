import {
  orgProcedure,
  orgAdminProcedure,
  orgOwnerProcedure,
} from "@/orpc/procedures";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/lib/prisma";
import { hashKey } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import z from "zod";

function generateApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `usk_${hex}`;
}

const list = orgProcedure(
  z.object({ organizationId: z.string() }),
)
  .handler(async ({ context }) => {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: context.organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return keys;
  });

const create = orgAdminProcedure(
  z.object({
    organizationId: z.string(),
    name: z.string().min(1).max(100),
    expiresAt: z.coerce.date().optional(),
  }),
)
  .handler(async ({ context, input }) => {
    const plainKey = generateApiKey();
    const keyHash = await hashKey(plainKey);
    const keyPrefix = plainKey.slice(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: context.organizationId,
        createdById: context.session.user.id,
        name: input.name,
        keyHash,
        keyPrefix,
        expiresAt: input.expiresAt,
      },
    });

    logAudit({
      context,
      action: "api_key.create",
      result: "success",
      organizationId: context.organizationId,
      resourceType: "api_key",
      resourceId: apiKey.id,
      message: "API key created",
      metadata: { expires: Boolean(input.expiresAt) },
    });
    return { key: plainKey, keyPrefix };
  });

const revoke = orgAdminProcedure(
  z.object({
    organizationId: z.string(),
    id: z.string(),
  }),
)
  .handler(async ({ context, input }) => {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: input.id },
    });
    if (!apiKey || apiKey.organizationId !== context.organizationId) {
      throw new ORPCError("NOT_FOUND", { message: "API key not found" });
    }
    if (apiKey.revokedAt) {
      throw new ORPCError("BAD_REQUEST", { message: "API key is already revoked" });
    }
    await prisma.apiKey.update({
      where: { id: input.id },
      data: { revokedAt: new Date() },
    });
    logAudit({
      context,
      action: "api_key.revoke",
      result: "success",
      organizationId: context.organizationId,
      resourceType: "api_key",
      resourceId: input.id,
      message: "API key revoked",
    });
    return { success: true };
  });

const deleteKey = orgOwnerProcedure(
  z.object({
    organizationId: z.string(),
    id: z.string(),
  }),
)
  .handler(async ({ context, input }) => {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: input.id },
    });
    if (!apiKey || apiKey.organizationId !== context.organizationId) {
      throw new ORPCError("NOT_FOUND", { message: "API key not found" });
    }
    await prisma.apiKey.delete({ where: { id: input.id } });
    logAudit({
      context,
      action: "api_key.delete",
      result: "success",
      organizationId: context.organizationId,
      resourceType: "api_key",
      resourceId: input.id,
      message: "API key deleted",
    });
    return { success: true };
  });

export const apiKeysRouter = {
  list,
  create,
  revoke,
  delete: deleteKey,
};
