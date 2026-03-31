import { authedProcedure, orgProcedure, verifyOrgMembership } from "@/orpc/procedures";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import z from "zod";

const REGIONS = ["eu", "us", "asia"] as const;

const createInput = z.object({
  organizationId: z.string(),
  name: z.string(),
  type: z.enum(["http", "tcp"]),
  interval: z.number().int().min(10).default(60),
  timeout: z.number().int().min(1).default(10),
  url: z.string().optional(),
  method: z.string().default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().optional(),
  rules: z
    .array(z.object({ type: z.string(), operator: z.string(), value: z.string() }))
    .optional(),
  regions: z.array(z.enum(REGIONS)).default(["eu"]),
  autoIncidents: z.boolean().default(false),
});

const updateInput = createInput.partial().extend({ id: z.string() });

const runCheckLimiter = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

export const monitorsRouter = {
  list: orgProcedure.input(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      return prisma.monitor.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.id } });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);
      return monitor;
    },
  ),

  create: orgProcedure.input(createInput).handler(async ({ input }) => {
    return prisma.monitor.create({ data: input });
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input, context }) => {
    const { id, organizationId: _orgId, ...data } = input;
    const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id } });
    await verifyOrgMembership(context.session.user.id, monitor.organizationId);
    return prisma.monitor.update({ where: { id }, data });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.id } });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);
      await prisma.monitor.delete({ where: { id: input.id } });
    },
  ),

  checks: authedProcedure
    .input(z.object({ monitorId: z.string(), limit: z.number().int().default(100) }))
    .handler(async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);
      return prisma.monitorCheck.findMany({
        where: { monitorId: input.monitorId },
        orderBy: { checkedAt: "desc" },
        take: input.limit,
      });
    }),

  overview: orgProcedure.input(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      const monitors = await prisma.monitor.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });

      const monitorIds = monitors.map((m) => m.id);
      if (monitorIds.length === 0) {
        return { monitors: [], recentChecks: [], responseTimeSeries: [] };
      }

      // Latest check per monitor
      const latestChecks = await prisma.$queryRawUnsafe<
        { monitorId: string; status: string; latency: number; checkedAt: Date }[]
      >(
        `SELECT DISTINCT ON (mc."monitorId") mc."monitorId", mc.status, mc.latency, mc."checkedAt"
        FROM monitor_check mc
        WHERE mc."monitorId" = ANY($1)
        ORDER BY mc."monitorId", mc."checkedAt" DESC`,
        monitorIds,
      );

      // Avg latency per monitor (last 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const avgLatencies = await prisma.$queryRawUnsafe<
        { monitorId: string; avg_latency: number; check_count: bigint }[]
      >(
        `SELECT mc."monitorId", ROUND(AVG(mc.latency))::float as avg_latency, COUNT(*)::bigint as check_count
        FROM monitor_check mc
        WHERE mc."monitorId" = ANY($1) AND mc."checkedAt" >= $2
        GROUP BY mc."monitorId"`,
        monitorIds,
        twentyFourHoursAgo,
      );

      // Response time series (hourly avg, last 24h) for all monitors combined
      const responseTimeSeries = await prisma.$queryRawUnsafe<
        { hour: Date; avg_latency: number; check_count: bigint }[]
      >(
        `SELECT date_trunc('hour', mc."checkedAt") as hour, ROUND(AVG(mc.latency))::float as avg_latency, COUNT(*)::bigint as check_count
        FROM monitor_check mc
        WHERE mc."monitorId" = ANY($1) AND mc."checkedAt" >= $2
        GROUP BY date_trunc('hour', mc."checkedAt")
        ORDER BY hour ASC`,
        monitorIds,
        twentyFourHoursAgo,
      );

      // Recent checks across all monitors (last 10)
      const recentChecks = await prisma.monitorCheck.findMany({
        where: { monitorId: { in: monitorIds } },
        orderBy: { checkedAt: "desc" },
        take: 10,
        select: {
          id: true,
          monitorId: true,
          status: true,
          latency: true,
          region: true,
          checkedAt: true,
          monitor: { select: { name: true } },
        },
      });

      const latestMap = new Map(latestChecks.map((c) => [c.monitorId, c]));
      const avgMap = new Map(avgLatencies.map((a) => [a.monitorId, a]));

      const monitorSummaries = monitors.map((m) => {
        const latest = latestMap.get(m.id);
        const avg = avgMap.get(m.id);
        return {
          id: m.id,
          name: m.name,
          type: m.type,
          active: m.active,
          currentStatus: latest?.status ?? "unknown",
          lastLatency: latest?.latency ?? null,
          lastCheckedAt: latest?.checkedAt ?? null,
          avgLatency24h: avg?.avg_latency ?? null,
          checkCount24h: avg ? Number(avg.check_count) : 0,
        };
      });

      return {
        monitors: monitorSummaries,
        recentChecks: recentChecks.map((c) => ({
          id: c.id,
          monitorId: c.monitorId,
          monitorName: c.monitor.name,
          status: c.status,
          latency: c.latency,
          region: c.region,
          checkedAt: c.checkedAt,
        })),
        responseTimeSeries: responseTimeSeries.map((r) => ({
          hour: r.hour,
          avgLatency: r.avg_latency,
          checkCount: Number(r.check_count),
        })),
      };
    },
  ),

  runCheck: authedProcedure
    .input(z.object({ monitorId: z.string() }))
    .handler(async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);

      const now = Date.now();
      const lastRun = runCheckLimiter.get(context.session.user.id);
      if (lastRun && now - lastRun < RATE_LIMIT_MS) {
        throw new ORPCError("TOO_MANY_REQUESTS", { message: "Please wait before running another check" });
      }
      runCheckLimiter.set(context.session.user.id, now);

      const regions = (monitor.regions as string[]) ?? ["eu"];
      const primaryRegion = regions[0] ?? "eu";
      const workerUrlMap: Record<string, string | undefined> = {
        eu: env.WORKER_EU_URL,
        us: env.WORKER_US_URL,
        asia: env.WORKER_ASIA_URL,
      };
      const workerUrl = workerUrlMap[primaryRegion] ?? env.WORKER_EU_URL ?? env.WORKER_URL;
      if (!workerUrl || !env.WORKER_SECRET) {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Worker not configured" });
      }
      const res = await fetch(`${workerUrl}/run/${input.monitorId}`, {
        method: "POST",
        headers: { "x-worker-secret": env.WORKER_SECRET },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`Worker check failed: ${res.status} ${body}`);
        throw new ORPCError("BAD_GATEWAY", { message: "Monitor check failed. Please try again later." });
      }
      return res.json();
    }),
};
