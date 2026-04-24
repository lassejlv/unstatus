import { orgProcedure } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS, PLAN_METERED_INCLUDES } from "@/lib/plans";
import { resolveServerPlanTier } from "@/lib/server-plans";
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
          subscriptionProductId: true,
          cancelAtPeriodEnd: true,
        },
      });
      return {
        ...org,
        tier: resolveServerPlanTier(org.subscriptionActive, org.subscriptionPlanName, org.subscriptionProductId),
      };
    }),

  getUsage: orgProcedure(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: {
          subscriptionActive: true,
          subscriptionPlanName: true,
          subscriptionProductId: true,
        },
      });
      const tier = resolveServerPlanTier(org.subscriptionActive, org.subscriptionPlanName, org.subscriptionProductId);
      const limits = PLAN_LIMITS[tier];

      const [monitorCount, statusPageCount, customDomainCount] = await Promise.all([
        prisma.monitor.count({ where: { organizationId: input.organizationId } }),
        prisma.statusPage.count({ where: { organizationId: input.organizationId } }),
        prisma.statusPage.count({ where: { organizationId: input.organizationId, customDomain: { not: null } } }),
      ]);

      return {
        tier,
        monitors: {
          used: monitorCount,
          limit: limits.monitors,
          included: tier === "pro" ? PLAN_METERED_INCLUDES.pro.monitors : null,
        },
        statusPages: { used: statusPageCount, limit: limits.statusPages },
        customDomains: {
          used: customDomainCount,
          limit: limits.customDomain ? Infinity : 0,
          included: tier === "pro" ? PLAN_METERED_INCLUDES.pro.customDomains : null,
        },
        features: {
          multiRegion: limits.multiRegion,
          autoIncidents: limits.autoIncidents,
          customDomain: limits.customDomain,
          customCss: limits.customCss,
          customJs: limits.customJs,
          discordAlerts: limits.discordAlerts,
          apiAccess: limits.apiAccess,
          removeBranding: limits.removeBranding,
          pingMonitor: limits.pingMonitor,
          redisMonitor: limits.redisMonitor,
          postgresMonitor: limits.postgresMonitor,
          dependencies: limits.dependencies,
        },
        minInterval: limits.minInterval,
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
