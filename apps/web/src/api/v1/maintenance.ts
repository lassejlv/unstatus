import { Hono } from "hono";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { sendNotifications } from "@/lib/notifications";
import { getApiContext } from "../middleware/auth";
import { ApiError, success, paginated, parsePagination, parseJsonBody } from "../helpers";

const app = new Hono();
const dateTimeSchema = z.string().refine(
  (value) => !Number.isNaN(new Date(value).getTime()),
  { message: "Invalid date/time" },
);

const maintenanceBodyFields = {
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  scheduledStart: dateTimeSchema,
  scheduledEnd: dateTimeSchema,
  monitorIds: z.array(z.string()).min(1),
};

const createMaintenanceBodySchema = z.object(maintenanceBodyFields);
const updateMaintenanceBodySchema = z.object(maintenanceBodyFields).partial();

const includeMonitors = {
  monitors: {
    include: { monitor: { select: { id: true, name: true } } },
  },
} as const;

// GET /maintenance - List maintenance windows
app.get("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const { limit, offset } = parsePagination(c);

  const where = { organizationId };
  const [items, total] = await Promise.all([
    prisma.maintenanceWindow.findMany({
      where,
      include: includeMonitors,
      orderBy: { scheduledStart: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.maintenanceWindow.count({ where }),
  ]);

  return paginated(c, items, total, limit, offset);
});

// GET /maintenance/:id - Get maintenance window
app.get("/:id", async (c) => {
  const { organizationId } = getApiContext(c);
  const id = c.req.param("id");

  const mw = await prisma.maintenanceWindow.findUnique({
    where: { id },
    include: includeMonitors,
  });

  if (!mw || mw.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Maintenance window not found", 404);
  }

  return success(c, mw);
});

// POST /maintenance - Create maintenance window
app.post("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const body = await parseJsonBody(c, createMaintenanceBodySchema);
  const { title, description, scheduledStart, scheduledEnd, monitorIds } = body;

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  if (end <= start) {
    throw new ApiError("BAD_REQUEST", "End time must be after start time", 400);
  }

  const monitors = await prisma.monitor.findMany({
    where: { id: { in: monitorIds }, organizationId },
    select: { id: true, name: true },
  });
  if (monitors.length !== monitorIds.length) {
    throw new ApiError("BAD_REQUEST", "One or more monitors not found in this organization", 400);
  }

  const mw = await prisma.maintenanceWindow.create({
    data: {
      organizationId,
      title,
      description: description ?? null,
      scheduledStart: start,
      scheduledEnd: end,
      monitors: {
        create: monitorIds.map((monitorId: string) => ({ monitorId })),
      },
    },
    include: includeMonitors,
  });

  sendNotifications(organizationId, {
    type: "maintenance.scheduled",
    title: mw.title,
    scheduledStart: mw.scheduledStart.toISOString(),
    scheduledEnd: mw.scheduledEnd.toISOString(),
    monitorNames: monitors.map((m) => m.name),
  }).catch(console.error);

  return success(c, mw, 201);
});

// PATCH /maintenance/:id - Update maintenance window
app.patch("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const existing = await prisma.maintenanceWindow.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Maintenance window not found", 404);
  }

  if (existing.status !== "scheduled") {
    throw new ApiError("BAD_REQUEST", "Can only edit scheduled maintenance windows", 400);
  }

  const body = await parseJsonBody(c, updateMaintenanceBodySchema);
  const start = body.scheduledStart ? new Date(body.scheduledStart) : existing.scheduledStart;
  const end = body.scheduledEnd ? new Date(body.scheduledEnd) : existing.scheduledEnd;
  if (end <= start) {
    throw new ApiError("BAD_REQUEST", "End time must be after start time", 400);
  }

  if (body.monitorIds) {
    const monitors = await prisma.monitor.findMany({
      where: { id: { in: body.monitorIds }, organizationId },
      select: { id: true },
    });
    if (monitors.length !== body.monitorIds.length) {
      throw new ApiError("BAD_REQUEST", "One or more monitors not found in this organization", 400);
    }
  }

  const mw = await prisma.$transaction(async (tx) => {
    if (body.monitorIds) {
      await tx.maintenanceWindowMonitor.deleteMany({ where: { maintenanceWindowId: id } });
      await tx.maintenanceWindowMonitor.createMany({
        data: body.monitorIds.map((monitorId: string) => ({ maintenanceWindowId: id, monitorId })),
      });
    }

    return tx.maintenanceWindow.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
        scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      },
      include: includeMonitors,
    });
  });

  return success(c, mw);
});

// DELETE /maintenance/:id - Delete maintenance window
app.delete("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const existing = await prisma.maintenanceWindow.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Maintenance window not found", 404);
  }

  if (existing.status !== "scheduled") {
    throw new ApiError("BAD_REQUEST", "Can only delete scheduled maintenance windows", 400);
  }

  await prisma.maintenanceWindow.delete({ where: { id } });
  return success(c, { deleted: true });
});

// POST /maintenance/:id/start - Begin maintenance
app.post("/:id/start", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const existing = await prisma.maintenanceWindow.findUnique({
    where: { id },
    include: includeMonitors,
  });
  if (!existing || existing.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Maintenance window not found", 404);
  }

  if (existing.status !== "scheduled") {
    throw new ApiError("BAD_REQUEST", "Can only start scheduled maintenance windows", 400);
  }

  const mw = await prisma.maintenanceWindow.update({
    where: { id },
    data: { status: "in_progress", actualStart: new Date() },
    include: includeMonitors,
  });

  sendNotifications(organizationId, {
    type: "maintenance.started",
    title: existing.title,
    monitorNames: existing.monitors.map((m) => m.monitor.name),
  }).catch(console.error);

  return success(c, mw);
});

// POST /maintenance/:id/complete - Complete maintenance
app.post("/:id/complete", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const existing = await prisma.maintenanceWindow.findUnique({
    where: { id },
    include: includeMonitors,
  });
  if (!existing || existing.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Maintenance window not found", 404);
  }

  if (existing.status !== "in_progress") {
    throw new ApiError("BAD_REQUEST", "Can only complete in-progress maintenance windows", 400);
  }

  const mw = await prisma.maintenanceWindow.update({
    where: { id },
    data: { status: "completed", actualEnd: new Date() },
    include: includeMonitors,
  });

  sendNotifications(organizationId, {
    type: "maintenance.completed",
    title: existing.title,
    monitorNames: existing.monitors.map((m) => m.monitor.name),
  }).catch(console.error);

  return success(c, mw);
});

// POST /maintenance/:id/cancel - Cancel maintenance
app.post("/:id/cancel", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const existing = await prisma.maintenanceWindow.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Maintenance window not found", 404);
  }

  if (existing.status !== "scheduled") {
    throw new ApiError("BAD_REQUEST", "Can only cancel scheduled maintenance windows", 400);
  }

  const mw = await prisma.maintenanceWindow.update({
    where: { id },
    data: { status: "cancelled" },
    include: includeMonitors,
  });

  return success(c, mw);
});

export { app as maintenanceRoutes };
