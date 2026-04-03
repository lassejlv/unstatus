import { authedProcedure, orgProcedure, orgAdminProcedure, ORG_MANAGER_ROLES, verifyOrgRole } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { sendNotifications } from "@/lib/notifications";
import { ORPCError } from "@orpc/server";
import z from "zod";

export const maintenanceRouter = {
  list: orgProcedure(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      return prisma.maintenanceWindow.findMany({
        where: { organizationId: input.organizationId },
        include: {
          monitors: {
            include: { monitor: { select: { id: true, name: true } } },
          },
        },
        orderBy: { scheduledStart: "desc" },
      });
    }),

  get: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const mw = await prisma.maintenanceWindow.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          monitors: {
            include: { monitor: { select: { id: true, name: true } } },
          },
        },
      });
      await verifyOrgRole(context.session.user.id, mw.organizationId, ORG_MANAGER_ROLES);
      return mw;
    }),

  create: orgAdminProcedure(
    z.object({
      organizationId: z.string(),
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      scheduledStart: z.coerce.date(),
      scheduledEnd: z.coerce.date(),
      monitorIds: z.array(z.string()).min(1),
    }),
  ).handler(async ({ input }) => {
    if (input.scheduledEnd <= input.scheduledStart) {
      throw new ORPCError("BAD_REQUEST", { message: "End time must be after start time" });
    }

    // Verify all monitors belong to this org
    const monitors = await prisma.monitor.findMany({
      where: { id: { in: input.monitorIds }, organizationId: input.organizationId },
      select: { id: true, name: true },
    });
    if (monitors.length !== input.monitorIds.length) {
      throw new ORPCError("BAD_REQUEST", { message: "One or more monitors not found in this organization" });
    }

    const mw = await prisma.maintenanceWindow.create({
      data: {
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        monitors: {
          create: input.monitorIds.map((monitorId) => ({ monitorId })),
        },
      },
      include: {
        monitors: {
          include: { monitor: { select: { id: true, name: true } } },
        },
      },
    });

    await sendNotifications(input.organizationId, {
      type: "maintenance.scheduled",
      title: mw.title,
      scheduledStart: mw.scheduledStart.toISOString(),
      scheduledEnd: mw.scheduledEnd.toISOString(),
      monitorNames: monitors.map((m) => m.name),
    }).catch(console.error);

    return mw;
  }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        scheduledStart: z.coerce.date().optional(),
        scheduledEnd: z.coerce.date().optional(),
        monitorIds: z.array(z.string()).min(1).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const existing = await prisma.maintenanceWindow.findUniqueOrThrow({
        where: { id: input.id },
      });
      await verifyOrgRole(context.session.user.id, existing.organizationId, ORG_MANAGER_ROLES);

      if (existing.status !== "scheduled") {
        throw new ORPCError("BAD_REQUEST", { message: "Can only edit scheduled maintenance windows" });
      }

      const start = input.scheduledStart ?? existing.scheduledStart;
      const end = input.scheduledEnd ?? existing.scheduledEnd;
      if (end <= start) {
        throw new ORPCError("BAD_REQUEST", { message: "End time must be after start time" });
      }

      // Verify monitors if changing them
      if (input.monitorIds) {
        const monitors = await prisma.monitor.findMany({
          where: { id: { in: input.monitorIds }, organizationId: existing.organizationId },
          select: { id: true },
        });
        if (monitors.length !== input.monitorIds.length) {
          throw new ORPCError("BAD_REQUEST", { message: "One or more monitors not found in this organization" });
        }
      }

      return prisma.$transaction(async (tx) => {
        if (input.monitorIds) {
          await tx.maintenanceWindowMonitor.deleteMany({
            where: { maintenanceWindowId: input.id },
          });
          await tx.maintenanceWindowMonitor.createMany({
            data: input.monitorIds.map((monitorId) => ({
              maintenanceWindowId: input.id,
              monitorId,
            })),
          });
        }

        return tx.maintenanceWindow.update({
          where: { id: input.id },
          data: {
            title: input.title,
            description: input.description,
            scheduledStart: input.scheduledStart,
            scheduledEnd: input.scheduledEnd,
          },
          include: {
            monitors: {
              include: { monitor: { select: { id: true, name: true } } },
            },
          },
        });
      });
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const existing = await prisma.maintenanceWindow.findUniqueOrThrow({
        where: { id: input.id },
      });
      await verifyOrgRole(context.session.user.id, existing.organizationId, ORG_MANAGER_ROLES);

      if (existing.status !== "scheduled") {
        throw new ORPCError("BAD_REQUEST", { message: "Can only delete scheduled maintenance windows" });
      }

      await prisma.maintenanceWindow.delete({ where: { id: input.id } });
      return { success: true };
    }),

  start: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const existing = await prisma.maintenanceWindow.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          monitors: {
            include: { monitor: { select: { id: true, name: true } } },
          },
        },
      });
      await verifyOrgRole(context.session.user.id, existing.organizationId, ORG_MANAGER_ROLES);

      if (existing.status !== "scheduled") {
        throw new ORPCError("BAD_REQUEST", { message: "Can only start scheduled maintenance windows" });
      }

      const mw = await prisma.maintenanceWindow.update({
        where: { id: input.id },
        data: { status: "in_progress", actualStart: new Date() },
      });

      await sendNotifications(existing.organizationId, {
        type: "maintenance.started",
        title: existing.title,
        monitorNames: existing.monitors.map((m) => m.monitor.name),
      }).catch(console.error);

      return mw;
    }),

  complete: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const existing = await prisma.maintenanceWindow.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          monitors: {
            include: { monitor: { select: { id: true, name: true } } },
          },
        },
      });
      await verifyOrgRole(context.session.user.id, existing.organizationId, ORG_MANAGER_ROLES);

      if (existing.status !== "in_progress") {
        throw new ORPCError("BAD_REQUEST", { message: "Can only complete in-progress maintenance windows" });
      }

      const mw = await prisma.maintenanceWindow.update({
        where: { id: input.id },
        data: { status: "completed", actualEnd: new Date() },
      });

      await sendNotifications(existing.organizationId, {
        type: "maintenance.completed",
        title: existing.title,
        monitorNames: existing.monitors.map((m) => m.monitor.name),
      }).catch(console.error);

      return mw;
    }),

  cancel: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const existing = await prisma.maintenanceWindow.findUniqueOrThrow({
        where: { id: input.id },
      });
      await verifyOrgRole(context.session.user.id, existing.organizationId, ORG_MANAGER_ROLES);

      if (existing.status !== "scheduled") {
        throw new ORPCError("BAD_REQUEST", { message: "Can only cancel scheduled maintenance windows" });
      }

      return prisma.maintenanceWindow.update({
        where: { id: input.id },
        data: { status: "cancelled" },
      });
    }),
};
