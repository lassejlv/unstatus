import { authedProcedure, verifyOrgMembership } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import z from "zod";

export const subscribersRouter = {
  list: authedProcedure
    .input(z.object({ organizationId: z.string() }))
    .handler(async ({ context, input }) => {
      await verifyOrgMembership(context.session.user.id, input.organizationId);

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
    .input(z.object({ id: z.string(), organizationId: z.string() }))
    .handler(async ({ context, input }) => {
      await verifyOrgMembership(context.session.user.id, input.organizationId);

      await prisma.statusPageSubscriber.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
};
