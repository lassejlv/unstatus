import { Hono } from "hono";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "../middleware/auth";
import { ApiError, success, paginated, parsePagination } from "../helpers";

const app = new Hono();

// GET /notifications - List notification channels
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

// POST /notifications - Create notification channel
app.post("/", async (c) => {
  const { organizationId } = getApiContext(c);

  const body = await c.req.json();
  const { name, type } = body;

  if (!name || !type) {
    throw new ApiError("BAD_REQUEST", "name and type are required", 400);
  }

  if (type === "discord" && !body.webhookUrl) {
    throw new ApiError("BAD_REQUEST", "webhookUrl is required for Discord channels", 400);
  }
  if (type === "email" && !body.recipientEmail) {
    throw new ApiError("BAD_REQUEST", "recipientEmail is required for email channels", 400);
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

// PATCH /notifications/:id - Update notification channel
app.patch("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const channel = await prisma.notificationChannel.findUnique({ where: { id } });
  if (!channel || channel.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Notification channel not found", 404);
  }

  const body = await c.req.json();
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

// DELETE /notifications/:id - Delete notification channel
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
