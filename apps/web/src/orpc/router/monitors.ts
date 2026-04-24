import {
  authedProcedure,
  orgAdminProcedure,
  orgProcedure,
  ORG_MANAGER_ROLES,
  verifyOrgMembership,
  verifyOrgRole,
  getOrgSubscription,
  requireFeature,
  requireLimit,
} from "@/orpc/procedures";
import { PLAN_LIMITS } from "@/lib/plans";
import { logAudit } from "@/lib/audit";
import { ORPCError } from "@orpc/server";
import { Prisma } from "@unstatus/db";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { monitorTypeSchema, regionSchema } from "@/types";
import z from "zod";

const createInput = z.object({
  organizationId: z.string(),
  name: z.string(),
  type: monitorTypeSchema,
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
  regions: z.array(regionSchema).default(["eu"]),
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

async function getOverview(
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

  create: orgAdminProcedure(createInput).handler(async ({ input, context }) => {
    const orgId = input.organizationId;
    const { tier } = await getOrgSubscription(orgId);

    const count = await prisma.monitor.count({ where: { organizationId: orgId } });
    requireLimit(tier, "monitors", count);

    if (input.autoIncidents) requireFeature(tier, "autoIncidents", "Auto-create incidents");
    if (input.regions.length > 1) requireFeature(tier, "multiRegion", "Multiple regions");
    if (input.type === "ping") requireFeature(tier, "pingMonitor", "Ping monitors");
    if (input.type === "redis") requireFeature(tier, "redisMonitor", "Redis monitors");
    if (input.type === "postgres") requireFeature(tier, "postgresMonitor", "Postgres monitors");
    if (input.interval < PLAN_LIMITS[tier].minInterval) {
      throw new ORPCError("FORBIDDEN", {
        message: `Minimum check interval for your plan is ${PLAN_LIMITS[tier].minInterval} seconds. Upgrade to unlock faster checks.`,
      });
    }

    const monitor = await prisma.monitor.create({ data: toMonitorCreateData(input) });
    logAudit({
      context,
      action: "monitor.create",
      result: "success",
      organizationId: orgId,
      resourceType: "monitor",
      resourceId: monitor.id,
      message: "Monitor created",
      metadata: { type: monitor.type, interval: monitor.interval },
    });
    return monitor;
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input, context }) => {
    const { id, organizationId: _orgId, ...data } = input;
    const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id } });
    await verifyOrgRole(context.session.user.id, monitor.organizationId, ORG_MANAGER_ROLES);

    const orgId = monitor.organizationId;
    const { tier } = await getOrgSubscription(orgId);

    if (data.autoIncidents) requireFeature(tier, "autoIncidents", "Auto-create incidents");
    if (data.regions && data.regions.length > 1) requireFeature(tier, "multiRegion", "Multiple regions");
    if (data.type === "ping") requireFeature(tier, "pingMonitor", "Ping monitors");
    if (data.type === "redis") requireFeature(tier, "redisMonitor", "Redis monitors");
    if (data.type === "postgres") requireFeature(tier, "postgresMonitor", "Postgres monitors");
    if (data.interval !== undefined && data.interval < PLAN_LIMITS[tier].minInterval) {
      throw new ORPCError("FORBIDDEN", {
        message: `Minimum check interval for your plan is ${PLAN_LIMITS[tier].minInterval} seconds. Upgrade to unlock faster checks.`,
      });
    }

    const updated = await prisma.monitor.update({ where: { id }, data: toMonitorUpdateData(data) });
    logAudit({
      context,
      action: "monitor.update",
      result: "success",
      organizationId: orgId,
      resourceType: "monitor",
      resourceId: id,
      message: "Monitor updated",
      metadata: { type: updated.type, active: updated.active },
    });
    return updated;
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.id } });
      await verifyOrgRole(context.session.user.id, monitor.organizationId, ORG_MANAGER_ROLES);
      await prisma.monitor.delete({ where: { id: input.id } });
      logAudit({
        context,
        action: "monitor.delete",
        result: "success",
        organizationId: monitor.organizationId,
        resourceType: "monitor",
        resourceId: input.id,
        message: "Monitor deleted",
        metadata: { type: monitor.type },
      });
    },
  ),

  checks: authedProcedure
    .input(z.object({ monitorId: z.string(), limit: z.number().int().default(50), offset: z.number().int().default(0) }))
    .handler(async ({ input, context }) => {
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
      await verifyOrgMembership(context.session.user.id, monitor.organizationId);
      const take = Math.min(input.limit, MAX_CHECK_HISTORY);
      const [items, total] = await Promise.all([
        prisma.monitorCheck.findMany({
          where: { monitorId: input.monitorId },
          select: {
            id: true,
            monitorId: true,
            status: true,
            latency: true,
            statusCode: true,
            message: true,
            region: true,
            checkedAt: true,
          },
          orderBy: { checkedAt: "desc" },
          take: take + 1,
          skip: input.offset,
        }),
        prisma.monitorCheck.count({ where: { monitorId: input.monitorId } }),
      ]);
      const hasMore = items.length > take;
      return {
        items: items.slice(0, take),
        total,
        hasMore,
      };
    }),

  checkDetail: authedProcedure.input(z.object({ checkId: z.string() })).handler(async ({ input, context }) => {
    const check = await prisma.monitorCheck.findUniqueOrThrow({
      where: { id: input.checkId },
      select: {
        id: true,
        monitorId: true,
        status: true,
        latency: true,
        statusCode: true,
        message: true,
        region: true,
        checkedAt: true,
        responseHeaders: true,
        responseBody: true,
        monitor: { select: { organizationId: true } },
      },
    });

    await verifyOrgMembership(context.session.user.id, check.monitor.organizationId);

    const { monitor: _monitor, ...detail } = check;
    return detail;
  }),

  overview: orgProcedure(z.object({ organizationId: z.string(), hours: z.number().min(1).max(720).default(24) })).handler(
    async ({ input }) => {
      const monitors = await prisma.monitor.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });

      const monitorIds = monitors.map((m) => m.id);
      if (monitorIds.length === 0) {
        return { monitors: [], recentChecks: [], responseTimeSeries: [] };
      }

      const twentyFourHoursAgo = new Date(Date.now() - input.hours * 60 * 60 * 1000);

      const [latestChecks, avgLatencies, responseTimeSeries, recentChecks] = await getOverview(
        monitorIds,
        twentyFourHoursAgo,
      );

      // Uptime % from daily rollups (last 30 days)
      let uptimePercent: number | null = null;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
      const uptimeRows = await prisma.$queryRawUnsafe<{ total: bigint; up: bigint }[]>(
        `SELECT COALESCE(SUM("totalChecks"), 0)::bigint as total,
                COALESCE(SUM("upChecks"), 0)::bigint as up
         FROM monitor_check_daily_rollup
         WHERE "monitorId" = ANY($1) AND "bucketDate" >= $2`,
        monitorIds,
        thirtyDaysAgo,
      );
      const uptimeRow = uptimeRows[0];
      if (uptimeRow && Number(uptimeRow.total) > 0) {
        uptimePercent = Math.round((Number(uptimeRow.up) / Number(uptimeRow.total)) * 10000) / 100;
      }

      // Per-monitor daily uptime bars (last 45 days)
      const dailyByMonitor = new Map<string, { date: string; status: string }[]>();
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86_400_000);
      const dailyRollups = await prisma.monitorCheckDailyRollup.findMany({
        where: {
          monitorId: { in: monitorIds },
          bucketDate: { gte: fortyFiveDaysAgo },
        },
        select: {
          monitorId: true,
          bucketDate: true,
          totalChecks: true,
          upChecks: true,
          downChecks: true,
          degradedChecks: true,
        },
      });

      const byMonitor = new Map<string, typeof dailyRollups>();
      for (const r of dailyRollups) {
        const arr = byMonitor.get(r.monitorId) ?? [];
        arr.push(r);
        byMonitor.set(r.monitorId, arr);
      }

      for (const mid of monitorIds) {
        const rollups = byMonitor.get(mid) ?? [];
        const dateMap = new Map(
          rollups.map((d) => [d.bucketDate.toISOString().split("T")[0], d]),
        );
        const days: { date: string; status: string }[] = [];
        for (let i = 44; i >= 0; i--) {
          const date = new Date(Date.now() - i * 86_400_000);
          const key = date.toISOString().split("T")[0];
          const entry = dateMap.get(key);
          let status = "empty";
          if (entry && entry.totalChecks > 0) {
            if (entry.downChecks > 0) status = "down";
            else if (entry.degradedChecks > 0) status = "degraded";
            else status = "up";
          }
          days.push({ date: key, status });
        }
        dailyByMonitor.set(mid, days);
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
          dailyStats: dailyByMonitor.get(m.id) ?? [],
        };
      });

      return {
        uptimePercent,
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
        logAudit({
          context,
          action: "monitor.run_check",
          result: "failure",
          organizationId: monitor.organizationId,
          resourceType: "monitor",
          resourceId: input.monitorId,
          message: "Worker not configured",
        });
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Worker not configured" });
      }
      const res = await fetch(`${workerUrl}/run/${input.monitorId}`, {
        method: "POST",
        headers: { "x-worker-secret": env.WORKER_SECRET },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        const detail = body?.error ?? `Worker returned ${res.status}`;
        console.error(`Worker check failed: ${detail}`);
        logAudit({
          context,
          action: "monitor.run_check",
          result: "failure",
          organizationId: monitor.organizationId,
          resourceType: "monitor",
          resourceId: input.monitorId,
          message: detail,
          metadata: { region: primaryRegion, status: res.status },
        });
        throw new ORPCError("BAD_GATEWAY", { message: detail });
      }
      const result = await res.json();
      logAudit({
        context,
        action: "monitor.run_check",
        result: "success",
        organizationId: monitor.organizationId,
        resourceType: "monitor",
        resourceId: input.monitorId,
        message: "Manual monitor check run",
        metadata: { region: primaryRegion },
      });
      return result;
    }),
};
