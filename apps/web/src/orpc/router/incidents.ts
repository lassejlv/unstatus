import {
  authedProcedure,
  orgProcedure,
  ORG_MANAGER_ROLES,
  verifyOrgMembership,
  verifyOrgRole,
} from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { sendNotifications } from "@/lib/notifications";
import z from "zod";

const createInput = z.object({
  monitorId: z.string(),
  title: z.string(),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]).default("investigating"),
  severity: z.enum(["minor", "major", "critical"]).default("minor"),
  message: z.string(),
});

export const incidentsRouter = {
  list: authedProcedure.input(z.object({ monitorId: z.string() })).handler(
    async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);
      return prisma.incident.findMany({
        where: { monitorId: input.monitorId },
        include: { updates: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  listByOrg: orgProcedure(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      return prisma.incident.findMany({
        where: { monitor: { organizationId: input.organizationId } },
        include: { monitor: { select: { name: true } }, updates: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const incident = await prisma.incident.findUniqueOrThrow({
        where: { id: input.id },
        include: { updates: { orderBy: { createdAt: "desc" } }, monitor: { select: { organizationId: true } } },
      });
      await verifyOrgMembership(context.session.user.id, incident.monitor.organizationId);
      const { monitor: _monitor, ...rest } = incident;
      return rest;
    },
  ),

  create: authedProcedure.input(createInput).handler(async ({ input, context }) => {
    const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
    await verifyOrgRole(context.session.user.id, monitor.organizationId, ORG_MANAGER_ROLES);
    const { message, ...data } = input;
    const incident = await prisma.incident.create({
      data: {
        ...data,
        updates: { create: { status: data.status, message } },
      },
      include: { updates: true },
    });
    sendNotifications(monitor.organizationId, {
      type: "incident.created",
      monitorId: monitor.id,
      monitorName: monitor.name,
      title: input.title,
      severity: input.severity,
      message,
    }).catch((e) => console.error("Notification failed:", e));
    return incident;
  }),

  update: authedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["investigating", "identified", "monitoring", "resolved"]), message: z.string() }))
    .handler(async ({ input, context }) => {
      const incident = await prisma.incident.findUniqueOrThrow({
        where: { id: input.id },
        include: { monitor: { select: { id: true, organizationId: true, name: true } } },
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
        include: { updates: { orderBy: { createdAt: "desc" } } },
      });
      const eventType = input.status === "resolved" ? "incident.resolved" as const : "incident.updated" as const;
      const event = eventType === "incident.resolved"
        ? { type: eventType, monitorId: incident.monitor.id, monitorName: incident.monitor.name, title: incident.title }
        : { type: eventType, monitorId: incident.monitor.id, monitorName: incident.monitor.name, title: incident.title, status: input.status, message: input.message };
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
