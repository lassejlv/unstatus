import { Hono } from "hono";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { sendNotifications } from "@/lib/notifications";
import { getApiContext } from "../middleware/auth";
import { ApiError, success, paginated, parsePagination, parseJsonBody } from "../helpers";

const app = new Hono();
const incidentStatusSchema = z.enum(["investigating", "identified", "monitoring", "resolved"]);
const incidentSeveritySchema = z.enum(["minor", "major", "critical"]);

const createIncidentBodySchema = z.object({
  monitorIds: z.array(z.string()).min(1),
  title: z.string().trim().min(1),
  status: incidentStatusSchema.optional(),
  severity: incidentSeveritySchema.optional(),
  message: z.string().trim().min(1),
});

const updateIncidentBodySchema = z.object({
  status: incidentStatusSchema,
  message: z.string().trim().min(1),
});

// GET /incidents - List incidents
app.get("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const { limit, offset } = parsePagination(c);

  const where = { monitor: { organizationId } };
  const [items, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        monitor: { select: { name: true } },
        monitors: { include: { monitor: { select: { id: true, name: true } } } },
        updates: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.incident.count({ where }),
  ]);

  return paginated(c, items, total, limit, offset);
});

// GET /incidents/:id - Get incident with updates
app.get("/:id", async (c) => {
  const { organizationId } = getApiContext(c);
  const id = c.req.param("id");

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      monitor: { select: { organizationId: true, name: true } },
      monitors: { include: { monitor: { select: { id: true, name: true } } } },
      updates: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!incident || incident.monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Incident not found", 404);
  }

  const { monitor: _m, ...rest } = incident;
  return success(c, rest);
});

// POST /incidents - Create incident
app.post("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const body = await parseJsonBody(c, createIncidentBodySchema);
  const { monitorIds, title, status, severity, message } = body;

  // Verify all monitors belong to this org
  const monitors = await prisma.monitor.findMany({
    where: { id: { in: monitorIds }, organizationId },
    select: { id: true, name: true },
  });
  if (monitors.length !== monitorIds.length) {
    throw new ApiError("BAD_REQUEST", "One or more monitors not found in this organization", 400);
  }

  const incident = await prisma.incident.create({
    data: {
      monitorId: monitorIds[0],
      title,
      status: status ?? "investigating",
      severity: severity ?? "minor",
      updates: { create: { status: status ?? "investigating", message } },
      monitors: { create: monitorIds.map((monitorId: string) => ({ monitorId })) },
    },
    include: {
      updates: true,
      monitors: { include: { monitor: { select: { id: true, name: true } } } },
    },
  });

  sendNotifications(organizationId, {
    type: "incident.created",
    monitorId: monitorIds[0],
    monitorName: monitors.map((m) => m.name).join(", "),
    title,
    severity: severity ?? "minor",
    message,
  }).catch((e) => console.error("Notification failed:", e));

  return success(c, incident, 201);
});

// PATCH /incidents/:id - Update incident
app.patch("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const body = await parseJsonBody(c, updateIncidentBodySchema);
  const { status, message } = body;

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      monitor: { select: { id: true, organizationId: true, name: true } },
      monitors: { include: { monitor: { select: { id: true, name: true } } } },
    },
  });

  if (!incident || incident.monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Incident not found", 404);
  }

  const resolvedAt = status === "resolved" ? new Date() : undefined;
  const updated = await prisma.incident.update({
    where: { id },
    data: {
      status,
      resolvedAt,
      updates: { create: { status, message } },
    },
    include: {
      updates: { orderBy: { createdAt: "desc" } },
      monitors: { include: { monitor: { select: { id: true, name: true } } } },
    },
  });

  const monitorNames = incident.monitors.map((m) => m.monitor.name);
  const displayName = monitorNames.length > 0 ? monitorNames.join(", ") : incident.monitor.name;
  const eventType = status === "resolved" ? "incident.resolved" as const : "incident.updated" as const;
  const event = eventType === "incident.resolved"
    ? { type: eventType, monitorId: incident.monitor.id, monitorName: displayName, title: incident.title }
    : { type: eventType, monitorId: incident.monitor.id, monitorName: displayName, title: incident.title, status, message };
  sendNotifications(incident.monitor.organizationId, event).catch((e) => console.error("Notification failed:", e));

  return success(c, updated);
});

// DELETE /incidents/:id - Delete incident
app.delete("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: { monitor: { select: { organizationId: true } } },
  });

  if (!incident || incident.monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Incident not found", 404);
  }

  await prisma.incident.delete({ where: { id } });
  return success(c, { deleted: true });
});

export { app as incidentsRoutes };
