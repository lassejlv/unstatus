import { Hono } from "hono";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { isAllowedDiscordWebhookUrl } from "@/lib/notifications";
import { getApiContext } from "../middleware/auth";
import { ApiError, success, paginated, parsePagination, parseJsonBody } from "../helpers";
import { requireApiFeature } from "./plan-guards";

const app = new Hono();
const notificationSettingsSchema = {
  onIncidentCreated: z.boolean().optional(),
  onIncidentResolved: z.boolean().optional(),
  onIncidentUpdated: z.boolean().optional(),
  onMonitorDown: z.boolean().optional(),
  onMonitorRecovered: z.boolean().optional(),
  onMaintenanceScheduled: z.boolean().optional(),
  onMaintenanceStarted: z.boolean().optional(),
  onMaintenanceCompleted: z.boolean().optional(),
};

const createNotificationBodySchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().trim().min(1),
    type: z.literal("discord"),
    webhookUrl: z.string().trim().min(1),
    recipientEmail: z.string().trim().min(1).optional(),
    ...notificationSettingsSchema,
  }),
  z.object({
    name: z.string().trim().min(1),
    type: z.literal("email"),
    recipientEmail: z.string().trim().min(1),
    webhookUrl: z.string().trim().min(1).optional(),
    ...notificationSettingsSchema,
  }),
]);

const updateNotificationBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  webhookUrl: z.string().trim().min(1).nullable().optional(),
  recipientEmail: z.string().trim().min(1).nullable().optional(),
  enabled: z.boolean().optional(),
  ...notificationSettingsSchema,
});

app.get("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const { limit, offset } = parsePagination(c);

  const where = { organizationId };
  const [items, total] = await Promise.all([
    prisma.notificationChannel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notificationChannel.count({ where }),
  ]);

  return paginated(c, items, total, limit, offset);
});

app.post("/", async (c) => {
  const { organizationId, tier } = getApiContext(c);
  const body = await parseJsonBody(c, createNotificationBodySchema);
  const { name, type } = body;

  if (type === "discord") {
    if (!isAllowedDiscordWebhookUrl(body.webhookUrl)) {
      throw new ApiError("BAD_REQUEST", "Discord webhook URL must be a valid Discord webhook.", 400);
    }
    requireApiFeature(tier, "discordAlerts", "Discord notifications");
  }

  const channel = await prisma.notificationChannel.create({
    data: {
      organizationId,
      name,
      type,
      webhookUrl: body.webhookUrl ?? null,
      recipientEmail: body.recipientEmail ?? null,
      onIncidentCreated: body.onIncidentCreated ?? true,
      onIncidentResolved: body.onIncidentResolved ?? true,
      onIncidentUpdated: body.onIncidentUpdated ?? true,
      onMonitorDown: body.onMonitorDown ?? true,
      onMonitorRecovered: body.onMonitorRecovered ?? true,
      onMaintenanceScheduled: body.onMaintenanceScheduled ?? true,
      onMaintenanceStarted: body.onMaintenanceStarted ?? true,
      onMaintenanceCompleted: body.onMaintenanceCompleted ?? true,
    },
  });

  return success(c, channel, 201);
});

app.patch("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const channel = await prisma.notificationChannel.findUnique({ where: { id } });
  if (!channel || channel.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Notification channel not found", 404);
  }

  const body = await parseJsonBody(c, updateNotificationBodySchema);
  if (channel.type === "discord" && body.webhookUrl && !isAllowedDiscordWebhookUrl(body.webhookUrl)) {
    throw new ApiError("BAD_REQUEST", "Discord webhook URL must be a valid Discord webhook.", 400);
  }
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.webhookUrl !== undefined) data.webhookUrl = body.webhookUrl;
  if (body.recipientEmail !== undefined) data.recipientEmail = body.recipientEmail;
  if (body.enabled !== undefined) data.enabled = body.enabled;
  if (body.onIncidentCreated !== undefined) data.onIncidentCreated = body.onIncidentCreated;
  if (body.onIncidentResolved !== undefined) data.onIncidentResolved = body.onIncidentResolved;
  if (body.onIncidentUpdated !== undefined) data.onIncidentUpdated = body.onIncidentUpdated;
  if (body.onMonitorDown !== undefined) data.onMonitorDown = body.onMonitorDown;
  if (body.onMonitorRecovered !== undefined) data.onMonitorRecovered = body.onMonitorRecovered;
  if (body.onMaintenanceScheduled !== undefined) data.onMaintenanceScheduled = body.onMaintenanceScheduled;
  if (body.onMaintenanceStarted !== undefined) data.onMaintenanceStarted = body.onMaintenanceStarted;
  if (body.onMaintenanceCompleted !== undefined) data.onMaintenanceCompleted = body.onMaintenanceCompleted;

  const updated = await prisma.notificationChannel.update({ where: { id }, data });
  return success(c, updated);
});

app.delete("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const channel = await prisma.notificationChannel.findUnique({ where: { id } });
  if (!channel || channel.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Notification channel not found", 404);
  }

  await prisma.notificationChannel.delete({ where: { id } });
  return success(c, { deleted: true });
});

export { app as notificationsRoutes };
