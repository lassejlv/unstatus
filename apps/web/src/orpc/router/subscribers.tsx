import { authedProcedure, orgProcedure, orgAdminProcedure, ORG_MANAGER_ROLES, verifyOrgRole } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { email } from "@/lib/email";
import { env } from "@/lib/env";
import { SubscriptionVerifyEmail } from "@unstatus/email";
import { ORPCError } from "@orpc/server";
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

  add: orgAdminProcedure(
    z.object({
      organizationId: z.string(),
      statusPageId: z.string(),
      email: z.string().email(),
    }),
  ).handler(async ({ input }) => {
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

    await email.emails.send({
      from: env.INBOUND_FROM,
      to: normalizedEmail,
      subject: `Confirm your subscription to ${page.name} status updates`,
      react: <SubscriptionVerifyEmail pageName={page.name} verifyUrl={verifyUrl} />,
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

      const domain = env.APP_DOMAIN === "localhost" ? "http://localhost:3000" : `https://${env.APP_DOMAIN}`;
      const verifyUrl = `${domain}/status/${subscriber.statusPage.slug}/verify?token=${subscriber.token}`;

      await email.emails.send({
        from: env.INBOUND_FROM,
        to: subscriber.email,
        subject: `Confirm your subscription to ${subscriber.statusPage.name} status updates`,
        react: <SubscriptionVerifyEmail pageName={subscriber.statusPage.name} verifyUrl={verifyUrl} />,
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

      return { success: true };
    }),
};
