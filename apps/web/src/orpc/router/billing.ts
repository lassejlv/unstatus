import { orgProcedure } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { resolvePlanTier } from "@/lib/plans";
import { polarClient } from "@/lib/auth";
import { env } from "@/lib/env";
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
      return {
        ...org,
        tier: resolvePlanTier(org.subscriptionActive, org.subscriptionPlanName),
      };
    }),

  createScaleCheckout: orgProcedure(
    z.object({
      organizationId: z.string(),
      theme: z.enum(["light", "dark"]).optional(),
    }),
  ).handler(async ({ input, context }) => {
    const origin = context.headers.get("origin") ?? context.headers.get("referer");
    const checkout = await polarClient.checkouts.create({
      products: [env.POLAR_SCALE_ID],
      externalCustomerId: context.session.user.id,
      metadata: { referenceId: input.organizationId },
      requireBillingAddress: true,
      embedOrigin: origin ?? undefined,
    });
    const url = new URL(checkout.url);
    if (input.theme) url.searchParams.set("theme", input.theme);
    return { url: url.toString(), id: checkout.id };
  }),
};
