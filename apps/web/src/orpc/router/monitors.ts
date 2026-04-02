import {
  authedProcedure,
  orgAdminProcedure,
  orgProcedure,
  ORG_MANAGER_ROLES,
  verifyOrgMembership,
  verifyOrgRole,
  checkFeature,
  requireFeature,
} from "@/orpc/procedures";
import { ORPCError } from "@orpc/server";
import { Prisma } from "@unstatus/db";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import z from "zod";

const REGIONS = ["eu", "us", "asia"] as const;

const createInput = z.object({
  organizationId: z.string(),
  name: z.string(),
  type: z.enum(["http", "tcp", "ping"]),
  interval: z.number().int().min(10).default(60),
  timeout: z.number().int().min(1).default(10),
  url: z.string().optional(),
  method: z.string().default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
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
const MAX_CHECK_HISTORY = 200;

type LatestMonitorStateRow = {
  monitorId: string;
  status: string | null;
  latency: number | null;
  checkedAt: Date | null;
};

type AvgLatencyRow = {
  monitorId: string;
  avg_latency: number | null;
  check_count: bigint;
};

type ResponseTimeSeriesRow = {
  hour: Date;
  avg_latency: number | null;
  check_count: bigint;
};

type RecentCheckRow = {
  id: string;
  monitorId: string;
  status: string;
  latency: number;
  region: string | null;
  checkedAt: Date;
  monitor: {
    name: string;
  };
};

function isMissingMonitorPerfSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("monitor_check_hourly_rollup")
    || message.includes("monitor_check_daily_rollup")
    || message.includes("lastStatus")
    || message.includes("does not exist")
    || message.includes("42P01")
    || message.includes("42703")
  );
}

function toMonitorCreateData(input: z.infer<typeof createInput>): Prisma.MonitorUncheckedCreateInput {
  return {
    organizationId: input.organizationId,
    name: input.name,
    type: input.type,
    interval: input.interval,
    timeout: input.timeout,
    url: input.url ?? null,
    method: input.method,
    headers: input.headers ?? Prisma.JsonNull,
    body: input.body ?? null,
    host: input.host ?? null,
    port: input.port ?? null,
    rules: input.rules ?? Prisma.JsonNull,
    regions: input.regions,
    autoIncidents: input.autoIncidents,
  };
}

function toMonitorUpdateData(input: Omit<z.infer<typeof updateInput>, "id" | "organizationId">): Prisma.MonitorUncheckedUpdateInput {
  const data: Prisma.MonitorUncheckedUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.type !== undefined) data.type = input.type;
  if (input.interval !== undefined) data.interval = input.interval;
  if (input.timeout !== undefined) data.timeout = input.timeout;
  if (input.url !== undefined) data.url = input.url ?? null;
  if (input.method !== undefined) data.method = input.method ?? null;
  if (input.headers !== undefined) data.headers = input.headers ?? Prisma.JsonNull;
  if (input.body !== undefined) data.body = input.body ?? null;
  if (input.host !== undefined) data.host = input.host ?? null;
  if (input.port !== undefined) data.port = input.port ?? null;
  if (input.rules !== undefined) data.rules = input.rules ?? Prisma.JsonNull;
  if (input.regions !== undefined) data.regions = input.regions;
  if (input.autoIncidents !== undefined) data.autoIncidents = input.autoIncidents;

  return data;
}

async function getLegacyOverview(
  monitorIds: string[],
  twentyFourHoursAgo: Date,
) {
  return Promise.all([
    prisma.$queryRawUnsafe<LatestMonitorStateRow[]>(
      `SELECT DISTINCT ON (mc."monitorId") mc."monitorId", mc.status, mc.latency, mc."checkedAt"
      FROM monitor_check mc
      WHERE mc."monitorId" = ANY($1)
      ORDER BY mc."monitorId", mc."checkedAt" DESC`,
      monitorIds,
    ),
    prisma.$queryRawUnsafe<AvgLatencyRow[]>(
      `SELECT mc."monitorId", ROUND(AVG(mc.latency))::float as avg_latency, COUNT(*)::bigint as check_count
      FROM monitor_check mc
      WHERE mc."monitorId" = ANY($1) AND mc."checkedAt" >= $2
      GROUP BY mc."monitorId"`,
      monitorIds,
      twentyFourHoursAgo,
    ),
    prisma.$queryRawUnsafe<ResponseTimeSeriesRow[]>(
      `SELECT date_trunc('hour', mc."checkedAt") as hour, ROUND(AVG(mc.latency))::float as avg_latency, COUNT(*)::bigint as check_count
      FROM monitor_check mc
      WHERE mc."monitorId" = ANY($1) AND mc."checkedAt" >= $2
      GROUP BY date_trunc('hour', mc."checkedAt")
      ORDER BY hour ASC`,
      monitorIds,
      twentyFourHoursAgo,
    ),
    prisma.monitorCheck.findMany({
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
    }),
  ]);
}

async function getRollupOverview(
  monitorIds: string[],
  twentyFourHoursAgo: Date,
) {
  return Promise.all([
    prisma.$queryRawUnsafe<LatestMonitorStateRow[]>(
      `SELECT m.id as "monitorId",
        m."lastStatus" as status,
        m."lastLatency" as latency,
        m."lastCheckedAt" as "checkedAt"
      FROM monitor m
      WHERE m.id = ANY($1)`,
      monitorIds,
    ),
    prisma.$queryRawUnsafe<AvgLatencyRow[]>(
      `SELECT hr."monitorId",
        ROUND(SUM(hr."latencySum")::numeric / NULLIF(SUM(hr."totalChecks"), 0))::float as avg_latency,
        SUM(hr."totalChecks")::bigint as check_count
      FROM monitor_check_hourly_rollup hr
      WHERE hr."monitorId" = ANY($1) AND hr."bucketStart" >= $2
      GROUP BY hr."monitorId"`,
      monitorIds,
      twentyFourHoursAgo,
    ),
    prisma.$queryRawUnsafe<ResponseTimeSeriesRow[]>(
      `SELECT hr."bucketStart" as hour,
        ROUND(SUM(hr."latencySum")::numeric / NULLIF(SUM(hr."totalChecks"), 0))::float as avg_latency,
        SUM(hr."totalChecks")::bigint as check_count
      FROM monitor_check_hourly_rollup hr
      WHERE hr."monitorId" = ANY($1) AND hr."bucketStart" >= $2
      GROUP BY hr."bucketStart"
      ORDER BY hour ASC`,
      monitorIds,
      twentyFourHoursAgo,
    ),
    prisma.monitorCheck.findMany({
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
    }),
  ]);
}

export const monitorsRouter = {
  list: orgProcedure(z.object({ organizationId: z.string() })).handler(
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

  create: orgAdminProcedure(createInput).handler(async ({ input }) => {
    const orgId = input.organizationId;

    if (input.autoIncidents) {
      requireFeature(await checkFeature(orgId, "auto_incidents"), "Auto-create incidents");
    }
    if (input.regions.length > 1) {
      requireFeature(await checkFeature(orgId, "multi_regions"), "Multiple regions");
    }

    return prisma.monitor.create({ data: toMonitorCreateData(input) });
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input, context }) => {
    const { id, organizationId: _orgId, ...data } = input;
    const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id } });
    await verifyOrgRole(context.session.user.id, monitor.organizationId, ORG_MANAGER_ROLES);

    const orgId = monitor.organizationId;

    if (data.autoIncidents) {
      requireFeature(await checkFeature(orgId, "auto_incidents"), "Auto-create incidents");
    }
    if (data.regions && data.regions.length > 1) {
      requireFeature(await checkFeature(orgId, "multi_regions"), "Multiple regions");
    }

    return prisma.monitor.update({ where: { id }, data: toMonitorUpdateData(data) });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.id } });
      await verifyOrgRole(context.session.user.id, monitor.organizationId, ORG_MANAGER_ROLES);
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
        take: Math.min(input.limit, MAX_CHECK_HISTORY),
      });
    }),

  overview: orgProcedure(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      const monitors = await prisma.monitor.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });

      const monitorIds = monitors.map((m) => m.id);
      if (monitorIds.length === 0) {
        return { monitors: [], recentChecks: [], responseTimeSeries: [] };
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      let latestChecks: LatestMonitorStateRow[];
      let avgLatencies: AvgLatencyRow[];
      let responseTimeSeries: ResponseTimeSeriesRow[];
      let recentChecks: RecentCheckRow[];

      try {
        [latestChecks, avgLatencies, responseTimeSeries, recentChecks] = await getRollupOverview(
          monitorIds,
          twentyFourHoursAgo,
        );
      } catch (error) {
        if (!isMissingMonitorPerfSchema(error)) {
          throw error;
        }

        [latestChecks, avgLatencies, responseTimeSeries, recentChecks] = await getLegacyOverview(
          monitorIds,
          twentyFourHoursAgo,
        );
      }

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
      await verifyOrgRole(context.session.user.id, monitor.organizationId, ORG_MANAGER_ROLES);

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
