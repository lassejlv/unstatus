import { os, ORPCError } from "@orpc/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autumn } from "@/lib/autumn";
import z from "zod";

export const publicProcedure = os.$context<{ headers: Headers }>();
export const ORG_MEMBER_ROLES = ["member", "admin", "owner"] as const;
export const ORG_MANAGER_ROLES = ["admin", "owner"] as const;
export const ORG_OWNER_ROLES = ["owner"] as const;

export type OrgRole = (typeof ORG_MEMBER_ROLES)[number];

export const authedProcedure = publicProcedure.use(
  async ({ context, next }) => {
    const session = await auth.api.getSession({
      headers: context.headers,
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({ context: { session } });
  },
);

export async function verifyOrgMembership(userId: string, organizationId: string): Promise<string> {
  const member = await prisma.member.findFirst({
    where: { userId, organizationId },
  });
  if (!member) {
    throw new ORPCError("FORBIDDEN");
  }
  return member.role;
}

export function requireOrgRole(memberRole: string, allowedRoles: readonly string[]) {
  if (!allowedRoles.includes(memberRole)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have permission to perform this action.",
    });
  }
}

export async function verifyOrgRole(
  userId: string,
  organizationId: string,
  allowedRoles: readonly string[],
): Promise<string> {
  const memberRole = await verifyOrgMembership(userId, organizationId);
  requireOrgRole(memberRole, allowedRoles);
  return memberRole;
}

export async function checkFeature(organizationId: string, featureId: string): Promise<boolean> {
  try {
    const result = await autumn.check({
      customerId: organizationId,
      featureId,
    });
    return result.allowed ?? false;
  } catch (e) {
    console.error(`[Autumn] check failed for ${featureId}:`, e);
    return false;
  }
}

export async function checkAndTrackFeature(organizationId: string, featureId: string, value = 1): Promise<boolean> {
  try {
    const result = await autumn.check({
      customerId: organizationId,
      featureId,
      sendEvent: true,
      requiredBalance: value,
    });
    return result.allowed ?? false;
  } catch (e) {
    console.error(`[Autumn] check+track failed for ${featureId}:`, e);
    return false;
  }
}

export async function trackUsage(organizationId: string, featureId: string, value = 1): Promise<void> {
  try {
    const result = await autumn.track({
      customerId: organizationId,
      featureId,
      value,
    });
    console.log(`[Autumn] tracked ${featureId} for ${organizationId}: value=${value}`, JSON.stringify(result));
  } catch (e: any) {
    console.error(`[Autumn] track failed for ${featureId} (customer=${organizationId}):`, e?.statusCode, e?.message ?? e);
  }
}

export async function getOrgSubscription(organizationId: string) {
  // Check any paid feature to determine if org has a paid plan
  const isPro = await checkFeature(organizationId, "auto_incidents");
  return { isPro };
}

export function requireFeature(allowed: boolean, featureName: string) {
  if (!allowed) {
    throw new ORPCError("FORBIDDEN", {
      message: `${featureName} is available on a paid plan. Upgrade to unlock this feature.`,
    });
  }
}

export function requirePro(isPro: boolean, feature: string) {
  requireFeature(isPro, feature);
}

type OrgScopedInput = { organizationId: string };

export function orgProcedure<TInput extends OrgScopedInput, TSchema extends z.ZodType<TInput>>(schema: TSchema) {
  return authedProcedure.input(schema).use(
    async ({ context, next }, input) => {
      const { organizationId } = input;
      const memberRole = await verifyOrgMembership(context.session.user.id, organizationId);
      return next({ context: { organizationId, memberRole } });
    },
  );
}

export function orgAdminProcedure<TInput extends OrgScopedInput, TSchema extends z.ZodType<TInput>>(schema: TSchema) {
  return orgProcedure(schema).use(
    async ({ context, next }) => {
      requireOrgRole(context.memberRole, ORG_MANAGER_ROLES);
      return next();
    },
  );
}

export function orgOwnerProcedure<TInput extends OrgScopedInput, TSchema extends z.ZodType<TInput>>(schema: TSchema) {
  return orgProcedure(schema).use(
    async ({ context, next }) => {
      requireOrgRole(context.memberRole, ORG_OWNER_ROLES);
      return next();
    },
  );
}
