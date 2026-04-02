import z from "zod";
import { prisma } from "@/lib/prisma";
import {
  authedProcedure,
  verifyOrgMembership,
  verifyOrgRole,
  ORG_MANAGER_ROLES,
} from "@/orpc/procedures";

export const dependenciesRouter = {
  listExternalServices: authedProcedure.handler(async () => {
    return prisma.externalService.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        category: true,
        currentStatus: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }),

  listForMonitor: authedProcedure
    .input(z.object({ monitorId: z.string() }))
    .handler(async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({
        where: { id: input.monitorId },
        select: { organizationId: true },
      });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);

      return prisma.monitorDependency.findMany({
        where: { monitorId: input.monitorId },
        include: {
          externalService: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              category: true,
              currentStatus: true,
              statusPageUrl: true,
              lastFetchedAt: true,
            },
          },
          externalComponent: {
            select: {
              id: true,
              name: true,
              currentStatus: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  add: authedProcedure
    .input(
      z.object({
        monitorId: z.string(),
        externalServiceId: z.string(),
        externalComponentId: z.string().nullable().optional(),
        note: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({
        where: { id: input.monitorId },
        select: { organizationId: true },
      });
      await verifyOrgRole(context.session.user.id, monitor.organizationId, ORG_MANAGER_ROLES);

      // Verify external service exists
      await prisma.externalService.findUniqueOrThrow({
        where: { id: input.externalServiceId },
      });

      return prisma.monitorDependency.create({
        data: {
          monitorId: input.monitorId,
          externalServiceId: input.externalServiceId,
          externalComponentId: input.externalComponentId ?? null,
          note: input.note,
        },
        include: {
          externalService: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              category: true,
              currentStatus: true,
              statusPageUrl: true,
              lastFetchedAt: true,
            },
          },
          externalComponent: {
            select: {
              id: true,
              name: true,
              currentStatus: true,
            },
          },
        },
      });
    }),

  remove: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const dep = await prisma.monitorDependency.findUniqueOrThrow({
        where: { id: input.id },
        include: { monitor: { select: { organizationId: true } } },
      });
      await verifyOrgRole(context.session.user.id, dep.monitor.organizationId, ORG_MANAGER_ROLES);
      await prisma.monitorDependency.delete({ where: { id: input.id } });
    }),
};
