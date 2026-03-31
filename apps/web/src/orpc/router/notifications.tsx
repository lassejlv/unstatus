import { authedProcedure, orgProcedure, verifyOrgMembership, getOrgSubscription, requirePro } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { email } from "@/lib/email";
import { env } from "@/lib/env";
import { NotificationEmail } from "@unstatus/email";
import z from "zod";

function parseEmails(value: string): string[] {
  return value.split(",").map((e) => e.trim()).filter(Boolean);
}

const createInput = z.object({
  organizationId: z.string(),
  name: z.string(),
  type: z.enum(["discord", "email"]),
  webhookUrl: z.string().url().optional(),
  recipientEmail: z.string().optional(),
  onIncidentCreated: z.boolean().default(true),
  onIncidentResolved: z.boolean().default(true),
  onIncidentUpdated: z.boolean().default(true),
  onMonitorDown: z.boolean().default(true),
  onMonitorRecovered: z.boolean().default(true),
}).refine((data) => {
  if (data.type === "discord") return !!data.webhookUrl;
  if (data.type === "email") return !!data.recipientEmail && parseEmails(data.recipientEmail).length > 0;
  return false;
}, "Discord requires a webhook URL, email requires at least one recipient email");

const updateInput = z.object({
  id: z.string(),
  name: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  recipientEmail: z.string().optional(),
  enabled: z.boolean().optional(),
  onIncidentCreated: z.boolean().optional(),
  onIncidentResolved: z.boolean().optional(),
  onIncidentUpdated: z.boolean().optional(),
  onMonitorDown: z.boolean().optional(),
  onMonitorRecovered: z.boolean().optional(),
});

export const notificationsRouter = {
  list: orgProcedure.input(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      return prisma.notificationChannel.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  create: orgProcedure.input(createInput).handler(async ({ input }) => {
    if (input.type === "discord") {
      const { isPro } = await getOrgSubscription(input.organizationId);
      if (!isPro) requirePro(false, "Discord notifications");
    }
    return prisma.notificationChannel.create({ data: input });
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input, context }) => {
    const { id, ...data } = input;
    const channel = await prisma.notificationChannel.findUniqueOrThrow({ where: { id } });
    await verifyOrgMembership(context.session.user.id, channel.organizationId);
    return prisma.notificationChannel.update({ where: { id }, data });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const channel = await prisma.notificationChannel.findUniqueOrThrow({ where: { id: input.id } });
      await verifyOrgMembership(context.session.user.id, channel.organizationId);
      await prisma.notificationChannel.delete({ where: { id: input.id } });
    },
  ),

  test: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const channel = await prisma.notificationChannel.findUniqueOrThrow({ where: { id: input.id } });
      await verifyOrgMembership(context.session.user.id, channel.organizationId);

      if (channel.type === "discord" && channel.webhookUrl) {
        const res = await fetch(channel.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "Test Notification",
              description: "This is a test notification from Unstatus. If you see this, your Discord webhook is working correctly!",
              color: 0x22c55e,
              timestamp: new Date().toISOString(),
            }],
          }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Discord webhook failed: ${res.status} ${body}`);
        }
      } else if (channel.type === "email" && channel.recipientEmail) {
        const recipients = parseEmails(channel.recipientEmail);
        await email.emails.send({
          from: env.INBOUND_FROM,
          to: recipients,
          subject: "[Unstatus] Test Notification",
          react: <NotificationEmail eventType="test" monitorName="Test Monitor" />,
        });
      }

      return { success: true };
    },
  ),
};
