import {
  authedProcedure,
  orgProcedure,
  ORG_MANAGER_ROLES,
  verifyOrgMembership,
  verifyOrgRole,
} from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { sendNotifications } from "@/lib/notifications";
import { ORPCError } from "@orpc/server";
import { incidentStatusSchema, incidentSeveritySchema } from "@/types";
import z from "zod";

const createInput = z.object({
  monitorIds: z.array(z.string()).min(1),
  title: z.string(),
  status: incidentStatusSchema.default("investigating"),
  severity: incidentSeveritySchema.default("minor"),
  message: z.string(),
});

const monitorInclude = {
  monitors: {
    include: { monitor: { select: { id: true, name: true } } },
  },
};

export const incidentsRouter = {
  list: authedProcedure.input(z.object({ monitorId: z.string() })).handler(
    async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);
      return prisma.incident.findMany({
        where: { monitorId: input.monitorId },
        include: { updates: { orderBy: { createdAt: "desc" } }, ...monitorInclude },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  listByOrg: orgProcedure(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      return prisma.incident.findMany({
        where: { monitor: { organizationId: input.organizationId } },
        include: {
          monitor: { select: { name: true } },
          ...monitorInclude,
          updates: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const incident = await prisma.incident.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          updates: { orderBy: { createdAt: "desc" } },
          monitor: { select: { organizationId: true } },
          ...monitorInclude,
        },
      });
      await verifyOrgMembership(context.session.user.id, incident.monitor.organizationId);
      const { monitor: _monitor, ...rest } = incident;
      return rest;
    },
  ),

  create: authedProcedure.input(createInput).handler(async ({ input, context }) => {
    // Primary monitor (first in the list) — used for auth and incident relationship
    const primaryMonitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorIds[0] } });
    await verifyOrgRole(context.session.user.id, primaryMonitor.organizationId, ORG_MANAGER_ROLES);

    // Verify all monitors belong to the same org
    if (input.monitorIds.length > 1) {
      const count = await prisma.monitor.count({
        where: { id: { in: input.monitorIds }, organizationId: primaryMonitor.organizationId },
      });
      if (count !== input.monitorIds.length) {
        throw new ORPCError("BAD_REQUEST", { message: "All monitors must belong to the same organization" });
      }
    }

    const { message, monitorIds, ...data } = input;
    const incident = await prisma.incident.create({
      data: {
        ...data,
        monitorId: monitorIds[0],
        updates: { create: { status: data.status, message } },
        monitors: {
          create: monitorIds.map((monitorId) => ({ monitorId })),
        },
      },
      include: { updates: true, ...monitorInclude },
    });

    // Get all monitor names for notifications
    const monitorNames = incident.monitors.map((m) => m.monitor.name);

    sendNotifications(primaryMonitor.organizationId, {
      type: "incident.created",
      monitorId: primaryMonitor.id,
      monitorName: monitorNames.join(", "),
      title: input.title,
      severity: input.severity,
      message,
    }).catch((e) => console.error("Notification failed:", e));
    return incident;
  }),

  update: authedProcedure
    .input(z.object({ id: z.string(), status: incidentStatusSchema, message: z.string() }))
    .handler(async ({ input, context }) => {
      const incident = await prisma.incident.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          monitor: { select: { id: true, organizationId: true, name: true } },
          ...monitorInclude,
        },
      });
      await verifyOrgRole(context.session.user.id, incident.monitor.organizationId, ORG_MANAGER_ROLES);
      const resolvedAt = input.status === "resolved" ? new Date() : undefined;
      const updated = await prisma.incident.update({
        where: { id: input.id },
        data: {
          status: input.status,
          resolvedAt,
          updates: { create: { status: input.status, message: input.message } },
        },
        include: { updates: { orderBy: { createdAt: "desc" } }, ...monitorInclude },
      });

      const monitorNames = incident.monitors.map((m) => m.monitor.name);
      const displayName = monitorNames.length > 0 ? monitorNames.join(", ") : incident.monitor.name;

      const eventType = input.status === "resolved" ? "incident.resolved" as const : "incident.updated" as const;
      const event = eventType === "incident.resolved"
        ? { type: eventType, monitorId: incident.monitor.id, monitorName: displayName, title: incident.title }
        : { type: eventType, monitorId: incident.monitor.id, monitorName: displayName, title: incident.title, status: input.status, message: input.message };
      sendNotifications(incident.monitor.organizationId, event)
        .catch((e) => console.error("Notification failed:", e));
      return updated;
    }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const incident = await prisma.incident.findUniqueOrThrow({
        where: { id: input.id },
        include: { monitor: { select: { organizationId: true } } },
      });
      await verifyOrgRole(context.session.user.id, incident.monitor.organizationId, ORG_MANAGER_ROLES);
      await prisma.incident.delete({ where: { id: input.id } });
    },
  ),
};
