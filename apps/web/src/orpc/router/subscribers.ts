import { authedProcedure, orgProcedure, ORG_MANAGER_ROLES, verifyOrgRole } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import z from "zod";

export const subscribersRouter = {
  list: orgProcedure(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      const statusPages = await prisma.statusPage.findMany({
        where: { organizationId: input.organizationId },
        select: { id: true, name: true },
      });

      const subscribers = await prisma.statusPageSubscriber.findMany({
        where: {
          statusPageId: { in: statusPages.map((p) => p.id) },
        },
        orderBy: { createdAt: "desc" },
      });

      return subscribers.map((s) => ({
        ...s,
        statusPageName:
          statusPages.find((p) => p.id === s.statusPageId)?.name ?? "Unknown",
      }));
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const subscriber = await prisma.statusPageSubscriber.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          statusPage: {
            select: { organizationId: true },
          },
        },
      });

      await verifyOrgRole(
        context.session.user.id,
        subscriber.statusPage.organizationId,
        ORG_MANAGER_ROLES,
      );

      await prisma.statusPageSubscriber.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
};
