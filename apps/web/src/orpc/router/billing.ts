import { orgProcedure, orgAdminProcedure } from "@/orpc/procedures";
import { autumn } from "@/lib/autumn";
import { env } from "@/lib/env";
import z from "zod";

export const billingRouter = {
  getSubscription: orgProcedure(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      try {
        const result = await autumn.check({
          customerId: input.organizationId,
          featureId: "auto_incidents",
        });
        return { isPro: result.allowed ?? false };
      } catch (e) {
        console.error("[Autumn] check failed:", e);
        return { isPro: false };
      }
    }),

  createCheckout: orgAdminProcedure(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      const domain = env.APP_DOMAIN === "localhost"
        ? "http://localhost:3000"
        : `https://${env.APP_DOMAIN}`;

      const result = await autumn.billing.attach({
        customerId: input.organizationId,
        planId: "pro",
        successUrl: `${domain}/dashboard?tab=overview`,
      });
      return { url: result.paymentUrl };
    }),

  getPortalUrl: orgAdminProcedure(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      const domain = env.APP_DOMAIN === "localhost"
        ? "http://localhost:3000"
        : `https://${env.APP_DOMAIN}`;

      const result = await autumn.billing.openCustomerPortal({
        customerId: input.organizationId,
        returnUrl: `${domain}/dashboard?tab=overview`,
      });
      return { url: result.url };
    }),
};
