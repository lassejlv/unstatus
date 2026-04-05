import z from "zod";
import { prisma } from "@/lib/prisma";
import { adminProcedure } from "@/orpc/procedures";

const paginationInput = z.object({
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const adminRouter = {
  stats: adminProcedure.handler(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [users, organizations, monitors, checksToday] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.monitor.count(),
      prisma.monitorCheck.count({ where: { checkedAt: { gte: todayStart } } }),
    ]);

    return { users, organizations, monitors, checksToday };
  }),

  listUsers: adminProcedure
    .input(paginationInput)
    .handler(async ({ input }) => {
      const where = input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" as const } },
              { email: { contains: input.search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isAdmin: true,
            createdAt: true,
            _count: { select: { members: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        items: items.map((u) => ({ ...u, orgCount: u._count.members })),
        total,
      };
    }),

  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input }) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isAdmin: true,
          createdAt: true,
          members: {
            select: {
              role: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  subscriptionActive: true,
                  subscriptionPlanName: true,
                  _count: { select: { monitors: true } },
                },
              },
            },
          },
        },
      });

      return {
        ...user,
        organizations: user.members.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
          subscriptionActive: m.organization.subscriptionActive,
          subscriptionPlanName: m.organization.subscriptionPlanName,
          monitorCount: m.organization._count.monitors,
        })),
      };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input, context }) => {
      if (input.userId === context.session.user.id) {
        throw new Error("Cannot delete yourself");
      }
      await prisma.user.delete({ where: { id: input.userId } });
      return { success: true };
    }),

  listOrganizations: adminProcedure
    .input(paginationInput)
    .handler(async ({ input }) => {
      const where = input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" as const } },
              { slug: { contains: input.search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            subscriptionActive: true,
            subscriptionPlanName: true,
            _count: { select: { members: true, monitors: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.organization.count({ where }),
      ]);

      return {
        items: items.map((o) => ({
          ...o,
          memberCount: o._count.members,
          monitorCount: o._count.monitors,
        })),
        total,
      };
    }),

  getOrganization: adminProcedure
    .input(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          subscriptionActive: true,
          subscriptionPlanName: true,
          cancelAtPeriodEnd: true,
          members: {
            select: {
              id: true,
              role: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          monitors: {
            select: {
              id: true,
              name: true,
              type: true,
              active: true,
              url: true,
              host: true,
              lastStatus: true,
              lastLatency: true,
              lastCheckedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      return org;
    }),

  deleteOrganization: adminProcedure
    .input(z.object({ organizationId: z.string() }))
    .handler(async ({ input }) => {
      await prisma.organization.delete({ where: { id: input.organizationId } });
      return { success: true };
    }),

  listAllMonitors: adminProcedure
    .input(
      paginationInput.extend({
        status: z.enum(["up", "down", "degraded"]).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const where: any = {};
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { url: { contains: input.search, mode: "insensitive" } },
        ];
      }
      if (input.status) {
        where.lastStatus = input.status;
      }

      const [items, total] = await Promise.all([
        prisma.monitor.findMany({
          where,
          select: {
            id: true,
            name: true,
            type: true,
            active: true,
            url: true,
            host: true,
            lastStatus: true,
            lastLatency: true,
            lastCheckedAt: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.monitor.count({ where }),
      ]);

      return { items, total };
    }),

  getMonitorChecks: adminProcedure
    .input(
      z.object({
        monitorId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const [items, total] = await Promise.all([
        prisma.monitorCheck.findMany({
          where: { monitorId: input.monitorId },
          select: {
            id: true,
            status: true,
            latency: true,
            statusCode: true,
            message: true,
            region: true,
            checkedAt: true,
          },
          orderBy: { checkedAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.monitorCheck.count({ where: { monitorId: input.monitorId } }),
      ]);

      return { items, total };
    }),

  deleteMonitor: adminProcedure
    .input(z.object({ monitorId: z.string() }))
    .handler(async ({ input }) => {
      await prisma.monitor.delete({ where: { id: input.monitorId } });
      return { success: true };
    }),

  listRegistryServices: adminProcedure
    .input(z.object({ search: z.string().optional() }))
    .handler(async ({ input }) => {
      return prisma.externalService.findMany({
        where: input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" as const } },
                { slug: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {},
        select: {
          id: true,
          name: true,
          slug: true,
          website: true,
          logoUrl: true,
          category: true,
          statusPageUrl: true,
          statusPageApiUrl: true,
          parserType: true,
          pollInterval: true,
          active: true,
          currentStatus: true,
          lastFetchedAt: true,
          lastFetchError: true,
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
    }),

  createRegistryService: adminProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        category: z.string(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        statusPageUrl: z.string().optional(),
        statusPageApiUrl: z.string().optional(),
        parserType: z.string().default("atlassian"),
        pollInterval: z.number().default(300),
        active: z.boolean().default(true),
      }),
    )
    .handler(async ({ input }) => {
      return prisma.externalService.create({ data: input });
    }),

  updateRegistryService: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        category: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        statusPageUrl: z.string().optional(),
        statusPageApiUrl: z.string().optional(),
        parserType: z.string().optional(),
        pollInterval: z.number().optional(),
        active: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.externalService.update({ where: { id }, data });
    }),

  deleteRegistryService: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      await prisma.externalService.delete({ where: { id: input.id } });
      return { success: true };
    }),
};
