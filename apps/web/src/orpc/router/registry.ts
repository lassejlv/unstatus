import z from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure } from "@/orpc/procedures";

export const registryRouter = {
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return prisma.externalService.findMany({
        where: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" as const } },
                  { slug: { contains: input.search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          website: true,
          logoUrl: true,
          category: true,
          statusPageUrl: true,
          currentStatus: true,
          currentDescription: true,
          lastFetchedAt: true,
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
    }),

  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      const service = await prisma.externalService.findUniqueOrThrow({
        where: { slug: input.slug },
        include: {
          components: {
            orderBy: [{ groupName: "asc" }, { name: "asc" }],
          },
        },
      });

      const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
      const statusHistory = await prisma.$queryRawUnsafe<
        { day: string; status: string; count: bigint }[]
      >(
        `SELECT DATE("checkedAt") as day, status, COUNT(*)::bigint as count
         FROM external_service_status
         WHERE "externalServiceId" = $1 AND "checkedAt" >= $2
         GROUP BY DATE("checkedAt"), status
         ORDER BY day ASC`,
        service.id,
        ninetyDaysAgo,
      );

      const dailyStatus = new Map<string, string>();
      const dailyCounts = new Map<string, { total: number; operational: number }>();

      for (const row of statusHistory) {
        const dayKey = new Date(String(row.day)).toISOString().split("T")[0]!;
        const count = Number(row.count);
        const existing = dailyCounts.get(dayKey) ?? { total: 0, operational: 0 };
        existing.total += count;
        if (row.status === "operational") {
          existing.operational += count;
        }
        dailyCounts.set(dayKey, existing);
      }

      for (const [day, counts] of dailyCounts) {
        const uptimeRatio = counts.total > 0 ? counts.operational / counts.total : 1;
        if (uptimeRatio >= 1) {
          dailyStatus.set(day, "operational");
        } else if (uptimeRatio >= 0.5) {
          dailyStatus.set(day, "degraded_performance");
        } else {
          dailyStatus.set(day, "major_outage");
        }
      }

      const daily: { date: string; status: string }[] = [];
      const now = new Date();
      for (let i = 89; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 86_400_000).toISOString().split("T")[0]!;
        daily.push({
          date,
          status: dailyStatus.get(date) ?? "unknown",
        });
      }

      return {
        id: service.id,
        name: service.name,
        slug: service.slug,
        website: service.website,
        logoUrl: service.logoUrl,
        category: service.category,
        statusPageUrl: service.statusPageUrl,
        currentStatus: service.currentStatus,
        currentDescription: service.currentDescription,
        lastFetchedAt: service.lastFetchedAt,
        components: service.components.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          groupName: c.groupName,
          currentStatus: c.currentStatus,
        })),
        daily,
      };
    }),

  categories: publicProcedure.handler(async () => {
    const result = await prisma.$queryRawUnsafe<{ category: string; count: bigint }[]>(
      `SELECT category, COUNT(*)::bigint as count
       FROM external_service
       GROUP BY category
       ORDER BY category ASC`,
    );
    return result.map((r) => ({ category: r.category, count: Number(r.count) }));
  }),
};
