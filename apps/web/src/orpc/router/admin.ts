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
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Time boundaries for growth comparisons
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [
      // Total counts
      totalUsers,
      totalOrganizations,
      totalMonitors,
      totalIncidents,
      checksToday,
      // Growth: this week
      usersThisWeek,
      orgsThisWeek,
      monitorsThisWeek,
      // Growth: last week (for comparison)
      usersLastWeek,
      orgsLastWeek,
      monitorsLastWeek,
      // Monitor status breakdown
      activeMonitors,
      monitorsUp,
      monitorsDown,
      monitorsDegraded,
      // Incidents
      openIncidents,
      incidentsThisWeek,
      // Subscriptions
      activeSubscriptions,
      // Check stats (last 24h for failure rate)
      checksLast24h,
      failedChecksLast24h,
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.organization.count(),
      prisma.monitor.count(),
      prisma.incident.count(),
      prisma.monitorCheck.count({ where: { checkedAt: { gte: todayStart } } }),
      // Growth: this week
      prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.organization.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.monitor.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      // Growth: last week
      prisma.user.count({
        where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
      }),
      prisma.organization.count({
        where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
      }),
      prisma.monitor.count({
        where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
      }),
      // Monitor status breakdown
      prisma.monitor.count({ where: { active: true } }),
      prisma.monitor.count({ where: { active: true, lastStatus: "up" } }),
      prisma.monitor.count({ where: { active: true, lastStatus: "down" } }),
      prisma.monitor.count({ where: { active: true, lastStatus: "degraded" } }),
      // Incidents
      prisma.incident.count({ where: { status: { not: "resolved" } } }),
      prisma.incident.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      // Subscriptions
      prisma.organization.count({ where: { subscriptionActive: true } }),
      // Check stats (last 24h)
      prisma.monitorCheck.count({
        where: {
          checkedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.monitorCheck.count({
        where: {
          checkedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          status: { in: ["down", "degraded"] },
        },
      }),
    ]);

    // Calculate failure rate
    const failureRate24h =
      checksLast24h > 0
        ? Math.round((failedChecksLast24h / checksLast24h) * 1000) / 10
        : 0;

    return {
      users: {
        total: totalUsers,
        thisWeek: usersThisWeek,
        lastWeek: usersLastWeek,
      },
      organizations: {
        total: totalOrganizations,
        thisWeek: orgsThisWeek,
        lastWeek: orgsLastWeek,
        withSubscription: activeSubscriptions,
      },
      monitors: {
        total: totalMonitors,
        active: activeMonitors,
        paused: totalMonitors - activeMonitors,
        thisWeek: monitorsThisWeek,
        lastWeek: monitorsLastWeek,
      },
      monitorHealth: {
        up: monitorsUp,
        down: monitorsDown,
        degraded: monitorsDegraded,
      },
      incidents: {
        total: totalIncidents,
        open: openIncidents,
        thisWeek: incidentsThisWeek,
      },
      checks: {
        today: checksToday,
        last24h: checksLast24h,
        failedLast24h: failedChecksLast24h,
        failureRate24h,
      },
    };
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
      type MonitorWhereInput = {
        OR?: Array<{ name?: { contains: string; mode: "insensitive" } } | { url?: { contains: string; mode: "insensitive" } }>;
        lastStatus?: string;
      };
      const where: MonitorWhereInput = {};
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

  failureTrend: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(7) }))
    .handler(async ({ input }) => {
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const rollups = await prisma.monitorCheckDailyRollup.groupBy({
        by: ["bucketDate"],
        where: { bucketDate: { gte: startDate } },
        _sum: {
          totalChecks: true,
          upChecks: true,
          downChecks: true,
          degradedChecks: true,
        },
      });

      const data: Array<{
        date: string;
        totalChecks: number;
        failedChecks: number;
        failureRate: number;
        downChecks: number;
        degradedChecks: number;
      }> = [];

      for (let i = 0; i < input.days; i++) {
        const date = new Date(now.getTime() - (input.days - 1 - i) * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        const dateStr = date.toISOString().split("T")[0];

        const rollup = rollups.find(
          (r) => new Date(r.bucketDate).toISOString().split("T")[0] === dateStr
        );

        const totalChecks = rollup?._sum.totalChecks ?? 0;
        const downChecks = rollup?._sum.downChecks ?? 0;
        const degradedChecks = rollup?._sum.degradedChecks ?? 0;
        const failedChecks = downChecks + degradedChecks;
        const failureRate = totalChecks > 0 ? (failedChecks / totalChecks) * 100 : 0;

        data.push({
          date: dateStr,
          totalChecks,
          failedChecks,
          failureRate: Math.round(failureRate * 100) / 100,
          downChecks,
          degradedChecks,
        });
      }

      return data;
    }),

  incidentTrend: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .handler(async ({ input }) => {
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const incidents = await prisma.incident.findMany({
        where: { startedAt: { gte: startDate } },
        select: { startedAt: true, severity: true },
      });

      const byDate = new Map<string, { total: number; critical: number; major: number; minor: number }>();

      for (let i = 0; i < input.days; i++) {
        const date = new Date(now.getTime() - (input.days - 1 - i) * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        const dateStr = date.toISOString().split("T")[0];
        byDate.set(dateStr, { total: 0, critical: 0, major: 0, minor: 0 });
      }

      for (const inc of incidents) {
        const dateStr = new Date(inc.startedAt).toISOString().split("T")[0];
        const entry = byDate.get(dateStr);
        if (entry) {
          entry.total++;
          if (inc.severity === "critical") entry.critical++;
          else if (inc.severity === "major") entry.major++;
          else entry.minor++;
        }
      }

      return Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...counts }));
    }),

  recentIncidents: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .handler(async ({ input }) => {
      const incidents = await prisma.incident.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          severity: true,
          startedAt: true,
          resolvedAt: true,
          monitor: {
            select: {
              name: true,
              organization: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: input.limit,
      });

      return incidents.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        severity: i.severity,
        startedAt: i.startedAt,
        resolvedAt: i.resolvedAt,
        monitorName: i.monitor.name,
        orgName: i.monitor.organization.name,
        orgSlug: i.monitor.organization.slug,
      }));
    }),

  userGrowth: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .handler(async ({ input }) => {
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      // Get users in range and recent signups
      const [users, recentUsers] = await Promise.all([
        prisma.user.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      // Build daily data
      const dailySignups: Array<{ date: string; count: number; cumulative: number }> = [];

      // Get total users before start date for cumulative count
      const usersBefore = await prisma.user.count({
        where: { createdAt: { lt: startDate } },
      });

      let cumulative = usersBefore;

      for (let i = 0; i < input.days; i++) {
        const date = new Date(now.getTime() - (input.days - 1 - i) * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        const dateStr = date.toISOString().split("T")[0];
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const count = users.filter((u) => {
          const created = new Date(u.createdAt);
          return created >= date && created < nextDate;
        }).length;

        cumulative += count;

        dailySignups.push({
          date: dateStr,
          count,
          cumulative,
        });
      }

      return {
        dailySignups,
        periodTotal: users.length,
        recentSignups: recentUsers,
      };
    }),

  orgGrowth: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .handler(async ({ input }) => {
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const orgs = await prisma.organization.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, subscriptionActive: true },
      });

      // Build daily data
      const dailySignups: Array<{ date: string; count: number; cumulative: number }> = [];

      // Get totals before start date for cumulative count
      const orgsBefore = await prisma.organization.count({
        where: { createdAt: { lt: startDate } },
      });

      let cumulative = orgsBefore;

      for (let i = 0; i < input.days; i++) {
        const date = new Date(now.getTime() - (input.days - 1 - i) * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        const dateStr = date.toISOString().split("T")[0];
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const count = orgs.filter((o) => {
          const created = new Date(o.createdAt);
          return created >= date && created < nextDate;
        }).length;

        cumulative += count;

        dailySignups.push({
          date: dateStr,
          count,
          cumulative,
        });
      }

      return {
        dailySignups,
        periodTotal: orgs.length,
      };
    }),

  monitorsDown: adminProcedure.handler(async () => {
    const monitors = await prisma.monitor.findMany({
      where: { active: true, lastStatus: "down" },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        host: true,
        lastCheckedAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { lastCheckedAt: "desc" },
      take: 10,
    });

    return monitors.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      url: m.url ?? m.host ?? "",
      lastCheckedAt: m.lastCheckedAt,
      orgName: m.organization.name,
      orgSlug: m.organization.slug,
    }));
  }),

  activeIncidents: adminProcedure.handler(async () => {
    const incidents = await prisma.incident.findMany({
      where: { status: { not: "resolved" } },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        startedAt: true,
        monitor: {
          select: {
            name: true,
            organization: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return incidents.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      severity: i.severity,
      startedAt: i.startedAt,
      monitorName: i.monitor.name,
      orgName: i.monitor.organization.name,
      orgSlug: i.monitor.organization.slug,
    }));
  }),

  recentSignups: adminProcedure.handler(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      createdAt: u.createdAt,
      orgCount: u._count.members,
    }));
  }),

  monitorInsights: adminProcedure
    .input(z.object({ days: z.number().min(7).max(90).default(30) }))
    .handler(async ({ input }) => {
      const { days } = input;
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Get all monitors with their creation dates and types
      const monitors = await prisma.monitor.findMany({
        select: {
          id: true,
          type: true,
          active: true,
          lastStatus: true,
          createdAt: true,
        },
      });

      // Type distribution
      const typeCounts: Record<string, number> = {};
      for (const monitor of monitors) {
        const type = monitor.type || "unknown";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }

      // Build daily counts map for growth
      const dailyCounts: Record<string, number> = {};
      for (let d = 0; d < days; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + d);
        const key = date.toISOString().split("T")[0];
        dailyCounts[key] = 0;
      }

      // Count new monitors per day
      for (const monitor of monitors) {
        const key = monitor.createdAt.toISOString().split("T")[0];
        if (dailyCounts[key] !== undefined) {
          dailyCounts[key]++;
        }
      }

      // Calculate cumulative counts (include monitors before the range)
      const monitorsBeforeRange = monitors.filter((m) => m.createdAt < startDate).length;
      let cumulative = monitorsBeforeRange;
      const growthTrend = Object.entries(dailyCounts).map(([date, count]) => {
        cumulative += count;
        return { date, newMonitors: count, totalMonitors: cumulative };
      });

      return {
        typeCounts,
        growthTrend,
        periodTotal: monitors.filter((m) => m.createdAt >= startDate).length,
      };
    }),
};
