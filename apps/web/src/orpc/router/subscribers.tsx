import { authedProcedure, orgProcedure, orgAdminProcedure, ORG_MANAGER_ROLES, verifyOrgRole } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { email } from "@/lib/email";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import { SubscriptionVerifyEmail } from "@unstatus/email";
import { ORPCError } from "@orpc/server";
import z from "zod";

const resendLimiter = new Map<string, number>();
const RESEND_COOLDOWN_MS = 60_000; // 1 minute between resends per subscriber

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

  add: orgAdminProcedure(
    z.object({
      organizationId: z.string(),
      statusPageId: z.string(),
      email: z.string().email(),
    }),
  ).handler(async ({ input, context }) => {
    // Verify the status page belongs to this org
    const page = await prisma.statusPage.findUnique({
      where: { id: input.statusPageId },
      select: { id: true, name: true, slug: true, organizationId: true },
    });
    if (!page || page.organizationId !== input.organizationId) {
      throw new ORPCError("NOT_FOUND", { message: "Status page not found" });
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    const subscriber = await prisma.statusPageSubscriber.upsert({
      where: {
        statusPageId_email: { statusPageId: page.id, email: normalizedEmail },
      },
      create: {
        statusPageId: page.id,
        email: normalizedEmail,
        monitorIds: [],
      },
      update: {
        verified: false,
      },
    });

    const domain = env.APP_DOMAIN === "localhost" ? "http://localhost:3000" : `https://${env.APP_DOMAIN}`;
    const verifyUrl = `${domain}/status/${page.slug}/verify?token=${subscriber.token}`;
    const unsubscribeUrl = `${domain}/status/${page.slug}/verify?token=${subscriber.token}&action=unsubscribe`;

    await email.emails.send({
      from: env.INBOUND_FROM,
      to: normalizedEmail,
      subject: `Confirm your subscription to ${page.name} status updates`,
      react: <SubscriptionVerifyEmail pageName={page.name} verifyUrl={verifyUrl} unsubscribeUrl={unsubscribeUrl} />,
    });

    logAudit({
      context,
      action: "subscriber.add",
      result: "success",
      organizationId: input.organizationId,
      resourceType: "status_page_subscriber",
      resourceId: subscriber.id,
      message: "Subscriber added",
      metadata: { statusPageId: page.id },
    });
    return { success: true };
  }),

  resend: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const subscriber = await prisma.statusPageSubscriber.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          statusPage: {
            select: { organizationId: true, name: true, slug: true },
          },
        },
      });

      await verifyOrgRole(
        context.session.user.id,
        subscriber.statusPage.organizationId,
        ORG_MANAGER_ROLES,
      );

      if (subscriber.verified) {
        throw new ORPCError("BAD_REQUEST", { message: "Subscriber is already verified" });
      }

      // Rate limit: 1 resend per subscriber per minute
      const now = Date.now();
      const lastResend = resendLimiter.get(input.id);
      if (lastResend && now - lastResend < RESEND_COOLDOWN_MS) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: "Please wait before resending the verification email",
        });
      }
      resendLimiter.set(input.id, now);

      const domain = env.APP_DOMAIN === "localhost" ? "http://localhost:3000" : `https://${env.APP_DOMAIN}`;
      const verifyUrl = `${domain}/status/${subscriber.statusPage.slug}/verify?token=${subscriber.token}`;
      const unsubscribeUrl = `${domain}/status/${subscriber.statusPage.slug}/verify?token=${subscriber.token}&action=unsubscribe`;

      await email.emails.send({
        from: env.INBOUND_FROM,
        to: subscriber.email,
        subject: `Confirm your subscription to ${subscriber.statusPage.name} status updates`,
        react: <SubscriptionVerifyEmail pageName={subscriber.statusPage.name} verifyUrl={verifyUrl} unsubscribeUrl={unsubscribeUrl} />,
      });

      logAudit({
        context,
        action: "subscriber.resend_verification",
        result: "success",
        organizationId: subscriber.statusPage.organizationId,
        resourceType: "status_page_subscriber",
        resourceId: input.id,
        message: "Subscriber verification email resent",
      });
      return { success: true };
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

      logAudit({
        context,
        action: "subscriber.delete",
        result: "success",
        organizationId: subscriber.statusPage.organizationId,
        resourceType: "status_page_subscriber",
        resourceId: input.id,
        message: "Subscriber deleted",
      });
      return { success: true };
    }),
};
