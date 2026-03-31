import { os, ORPCError } from "@orpc/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const publicProcedure = os.$context<{ headers: Headers }>();

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

export const orgProcedure = authedProcedure.use(
  async ({ context, next, input }) => {
    const { organizationId } = input as { organizationId: string };
    const memberRole = await verifyOrgMembership(context.session.user.id, organizationId);
    return next({ context: { organizationId, memberRole } });
  },
);
