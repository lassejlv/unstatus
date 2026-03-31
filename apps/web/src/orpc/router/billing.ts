import { orgProcedure } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import z from "zod";

export const billingRouter = {
  getSubscription: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: {
          subscriptionId: true,
          subscriptionActive: true,
          subscriptionPlanName: true,
          cancelAtPeriodEnd: true,
          polarCustomerId: true,
        },
      });
      return org;
    }),
};
