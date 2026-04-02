import { Prisma, type Monitor } from "@unstatus/db";
import { prisma } from "./db.js";

const RAW_RETENTION_DAYS = 30;
const HOURLY_RETENTION_DAYS = 35;
const DAILY_BACKFILL_DAYS = 120;
const HOURLY_BACKFILL_DAYS = 35;
const DUE_BATCH_SIZE = 500;

const MONITOR_BASE_SELECT = `
  SELECT
    id,
    "organizationId",
    name,
    type,
    active,
    interval,
    timeout,
    url,
    method,
    headers,
    body,
    host,
    port,
    rules,
    regions,
    "autoIncidents",
    "createdAt",
    "updatedAt",
    "lastCheckedAt"
  FROM monitor
`;

type CheckPersistenceResult = {
  status: string;
  latency: number;
  statusCode?: number | null;
  message?: string | null;
  responseHeaders?: Prisma.InputJsonValue | null;
  responseBody?: string | null;
};

export type WorkerMonitor = Pick<
  Monitor,
  | "id"
  | "organizationId"
  | "name"
  | "type"
  | "active"
  | "interval"
  | "timeout"
  | "url"
  | "method"
  | "headers"
  | "body"
  | "host"
  | "port"
  | "rules"
  | "regions"
  | "autoIncidents"
  | "createdAt"
  | "updatedAt"
  | "lastCheckedAt"
>;

type DueMonitorRow = WorkerMonitor & {
  nextCheckAt: Date | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isMissingMonitorPerfSchema(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("monitor_check_hourly_rollup")
    || message.includes("monitor_check_daily_rollup")
    || message.includes("nextCheckAt")
    || message.includes("lastStatus")
    || message.includes("does not exist")
    || message.includes("42P01")
    || message.includes("42703")
  );
}

function getNextCheckAt(monitor: Pick<Monitor, "interval">, checkedAt: Date) {
  return new Date(checkedAt.getTime() + monitor.interval * 1000);
}

function getStatusCount(status: string, expected: "up" | "down" | "degraded") {
  return status === expected ? 1 : 0;
}

export async function recordMonitorCheck(
  monitor: Pick<Monitor, "id" | "interval">,
  result: CheckPersistenceResult,
  region: string,
  checkedAt: Date,
) {
  const nextCheckAt = getNextCheckAt(monitor, checkedAt);

  try {
    return await prisma.$transaction(async (tx) => {
      const check = await tx.monitorCheck.create({
        data: {
          monitorId: monitor.id,
          status: result.status,
          latency: result.latency,
          statusCode: result.statusCode,
          message: result.message,
          responseHeaders: result.responseHeaders ?? Prisma.JsonNull,
          responseBody: result.responseBody,
          region,
          checkedAt,
        },
      });

      await tx.$executeRawUnsafe(
        `UPDATE monitor
        SET "lastCheckedAt" = $2,
            "nextCheckAt" = $3,
            "lastStatus" = $4,
            "lastLatency" = $5,
            "lastStatusCode" = $6,
            "lastRegion" = $7,
            "lastMessage" = $8,
            "updatedAt" = $2
        WHERE id = $1`,
        monitor.id,
        checkedAt,
        nextCheckAt,
        result.status,
        result.latency,
        result.statusCode ?? null,
        region,
        result.message ?? null,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO monitor_check_hourly_rollup
          ("monitorId", "bucketStart", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
        VALUES
          ($1, date_trunc('hour', $2::timestamp), 1, $3, $4, $5, $6)
        ON CONFLICT ("monitorId", "bucketStart")
        DO UPDATE SET
          "totalChecks" = monitor_check_hourly_rollup."totalChecks" + 1,
          "upChecks" = monitor_check_hourly_rollup."upChecks" + EXCLUDED."upChecks",
          "downChecks" = monitor_check_hourly_rollup."downChecks" + EXCLUDED."downChecks",
          "degradedChecks" = monitor_check_hourly_rollup."degradedChecks" + EXCLUDED."degradedChecks",
          "latencySum" = monitor_check_hourly_rollup."latencySum" + EXCLUDED."latencySum"`,
        monitor.id,
        checkedAt,
        getStatusCount(result.status, "up"),
        getStatusCount(result.status, "down"),
        getStatusCount(result.status, "degraded"),
        result.latency,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO monitor_check_daily_rollup
          ("monitorId", "bucketDate", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
        VALUES
          ($1, date_trunc('day', $2::timestamp), 1, $3, $4, $5, $6)
        ON CONFLICT ("monitorId", "bucketDate")
        DO UPDATE SET
          "totalChecks" = monitor_check_daily_rollup."totalChecks" + 1,
          "upChecks" = monitor_check_daily_rollup."upChecks" + EXCLUDED."upChecks",
          "downChecks" = monitor_check_daily_rollup."downChecks" + EXCLUDED."downChecks",
          "degradedChecks" = monitor_check_daily_rollup."degradedChecks" + EXCLUDED."degradedChecks",
          "latencySum" = monitor_check_daily_rollup."latencySum" + EXCLUDED."latencySum"`,
        monitor.id,
        checkedAt,
        getStatusCount(result.status, "up"),
        getStatusCount(result.status, "down"),
        getStatusCount(result.status, "degraded"),
        result.latency,
      );

      return check;
    });
  } catch (error) {
    if (!isMissingMonitorPerfSchema(error)) {
      throw error;
    }

    const [check] = await prisma.$transaction([
      prisma.monitorCheck.create({
        data: {
          monitorId: monitor.id,
          status: result.status,
          latency: result.latency,
          statusCode: result.statusCode,
          message: result.message,
          responseHeaders: result.responseHeaders ?? Prisma.JsonNull,
          responseBody: result.responseBody,
          region,
          checkedAt,
        },
      }),
      prisma.$executeRawUnsafe(
        `UPDATE monitor
        SET "lastCheckedAt" = $2,
            "updatedAt" = $2
        WHERE id = $1`,
        monitor.id,
        checkedAt,
      ),
    ]);

    return check;
  }
}

export async function getMonitorById(monitorId: string) {
  const monitors = await prisma.$queryRawUnsafe<WorkerMonitor[]>(
    `${MONITOR_BASE_SELECT}
    WHERE id = $1
    LIMIT 1`,
    monitorId,
  );

  const monitor = monitors[0];
  if (!monitor) {
    throw new Error(`Monitor ${monitorId} not found`);
  }

  return monitor;
}

export async function listDueMonitors(now: Date, region: string) {
  const monitors = await prisma.$queryRawUnsafe<DueMonitorRow[]>(
    `SELECT
      id,
      "organizationId",
      name,
      type,
      active,
      interval,
      timeout,
      url,
      method,
      headers,
      body,
      host,
      port,
      rules,
      regions,
      "autoIncidents",
      "createdAt",
      "updatedAt",
      "lastCheckedAt",
      "nextCheckAt"
    FROM monitor
    WHERE active = true
      AND COALESCE(regions, '[]'::jsonb) @> jsonb_build_array($2::text)
      AND ("nextCheckAt" IS NULL OR "nextCheckAt" <= $1)
    ORDER BY COALESCE("nextCheckAt", to_timestamp(0)) ASC
    LIMIT ${DUE_BATCH_SIZE}`,
    now,
    region,
  );

  return monitors;
}

export async function listLegacyDueMonitors(now: Date, region: string) {
  const monitors = await prisma.$queryRawUnsafe<WorkerMonitor[]>(
    `${MONITOR_BASE_SELECT}
    WHERE active = true
      AND COALESCE(regions, '[]'::jsonb) @> jsonb_build_array($2::text)
      AND (
        "lastCheckedAt" IS NULL
        OR "lastCheckedAt" + make_interval(secs => interval) <= $1
      )
    ORDER BY COALESCE("lastCheckedAt", to_timestamp(0)) ASC
    LIMIT ${DUE_BATCH_SIZE}`,
    now,
    region,
  );

  return monitors;
}

export async function claimLegacyMonitor(
  monitor: Pick<WorkerMonitor, "id" | "lastCheckedAt">,
  now: Date,
) {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `UPDATE monitor
    SET "lastCheckedAt" = $2,
        "updatedAt" = $2
    WHERE id = $1
      AND active = true
      AND "lastCheckedAt" IS NOT DISTINCT FROM $3
    RETURNING id`,
    monitor.id,
    now,
    monitor.lastCheckedAt ?? null,
  );

  return rows.length > 0;
}

export async function claimDueMonitor(monitor: Pick<Monitor, "id" | "interval">, now: Date) {
  const claimedUntil = getNextCheckAt(monitor, now);

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `UPDATE monitor
    SET "nextCheckAt" = $2,
        "updatedAt" = $1
    WHERE id = $3
      AND active = true
      AND ("nextCheckAt" IS NULL OR "nextCheckAt" <= $1)
    RETURNING id`,
    now,
    claimedUntil,
    monitor.id,
  );

  return rows.length > 0;
}

let maintenanceRunning: Promise<void> | null = null;

export async function runMonitorPerfMaintenance() {
  if (maintenanceRunning) {
    return maintenanceRunning;
  }

  maintenanceRunning = (async () => {
    const now = new Date();
    const rawCutoff = new Date(now.getTime() - RAW_RETENTION_DAYS * 86_400_000);
    const hourlyCutoff = new Date(now.getTime() - HOURLY_RETENTION_DAYS * 86_400_000);
    const hourlyBackfillCutoff = new Date(now.getTime() - HOURLY_BACKFILL_DAYS * 86_400_000);
    const dailyBackfillCutoff = new Date(now.getTime() - DAILY_BACKFILL_DAYS * 86_400_000);

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE monitor m
        SET "lastCheckedAt" = latest."checkedAt",
            "nextCheckAt" = COALESCE(
              m."nextCheckAt",
              latest."checkedAt" + make_interval(secs => m.interval)
            ),
            "lastStatus" = latest.status,
            "lastLatency" = latest.latency,
            "lastStatusCode" = latest."statusCode",
            "lastRegion" = latest.region,
            "lastMessage" = latest.message,
            "updatedAt" = GREATEST(m."updatedAt", latest."checkedAt")
        FROM (
          SELECT DISTINCT ON (mc."monitorId")
            mc."monitorId",
            mc.status,
            mc.latency,
            mc."statusCode",
            mc.region,
            mc.message,
            mc."checkedAt"
          FROM monitor_check mc
          ORDER BY mc."monitorId", mc."checkedAt" DESC
        ) latest
        WHERE m.id = latest."monitorId"`,
      );

      await prisma.$executeRawUnsafe(
        `UPDATE monitor
        SET "nextCheckAt" = COALESCE(
              "lastCheckedAt" + make_interval(secs => interval),
              NOW()
            ),
            "updatedAt" = NOW()
        WHERE "nextCheckAt" IS NULL`,
      );

      await prisma.$executeRawUnsafe(
        `INSERT INTO monitor_check_hourly_rollup
          ("monitorId", "bucketStart", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
        SELECT
          mc."monitorId",
          date_trunc('hour', mc."checkedAt") as "bucketStart",
          COUNT(*)::int as "totalChecks",
          COUNT(*) FILTER (WHERE mc.status = 'up')::int as "upChecks",
          COUNT(*) FILTER (WHERE mc.status = 'down')::int as "downChecks",
          COUNT(*) FILTER (WHERE mc.status = 'degraded')::int as "degradedChecks",
          COALESCE(SUM(mc.latency), 0)::int as "latencySum"
        FROM monitor_check mc
        WHERE mc."checkedAt" >= $1
        GROUP BY mc."monitorId", date_trunc('hour', mc."checkedAt")
        ON CONFLICT ("monitorId", "bucketStart")
        DO UPDATE SET
          "totalChecks" = EXCLUDED."totalChecks",
          "upChecks" = EXCLUDED."upChecks",
          "downChecks" = EXCLUDED."downChecks",
          "degradedChecks" = EXCLUDED."degradedChecks",
          "latencySum" = EXCLUDED."latencySum"`,
        hourlyBackfillCutoff,
      );

      await prisma.$executeRawUnsafe(
        `INSERT INTO monitor_check_daily_rollup
          ("monitorId", "bucketDate", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
        SELECT
          mc."monitorId",
          date_trunc('day', mc."checkedAt") as "bucketDate",
          COUNT(*)::int as "totalChecks",
          COUNT(*) FILTER (WHERE mc.status = 'up')::int as "upChecks",
          COUNT(*) FILTER (WHERE mc.status = 'down')::int as "downChecks",
          COUNT(*) FILTER (WHERE mc.status = 'degraded')::int as "degradedChecks",
          COALESCE(SUM(mc.latency), 0)::int as "latencySum"
        FROM monitor_check mc
        WHERE mc."checkedAt" >= $1
        GROUP BY mc."monitorId", date_trunc('day', mc."checkedAt")
        ON CONFLICT ("monitorId", "bucketDate")
        DO UPDATE SET
          "totalChecks" = EXCLUDED."totalChecks",
          "upChecks" = EXCLUDED."upChecks",
          "downChecks" = EXCLUDED."downChecks",
          "degradedChecks" = EXCLUDED."degradedChecks",
          "latencySum" = EXCLUDED."latencySum"`,
        dailyBackfillCutoff,
      );

      await prisma.$executeRawUnsafe(
        `DELETE FROM monitor_check
        WHERE "checkedAt" < $1`,
        rawCutoff,
      );

      await prisma.$executeRawUnsafe(
        `DELETE FROM monitor_check_hourly_rollup
        WHERE "bucketStart" < $1`,
        hourlyCutoff,
      );
    } catch (error) {
      if (!isMissingMonitorPerfSchema(error)) {
        throw error;
      }
    } finally {
      maintenanceRunning = null;
    }
  })();

  return maintenanceRunning;
}
