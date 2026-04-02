import { orgProcedure } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import z from "zod";

export const billingRouter = {
  getSubscription: orgProcedure(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: {
          subscriptionActive: true,
          subscriptionPlanName: true,
          cancelAtPeriodEnd: true,
        },
      });
      return org;
    }),
};
