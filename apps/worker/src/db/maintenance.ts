import { prisma } from "../db.js";
import {
  RAW_RETENTION_DAYS,
  HOURLY_RETENTION_DAYS,
  DAILY_BACKFILL_DAYS,
  HOURLY_BACKFILL_DAYS,
  isMissingMonitorPerfSchema,
} from "./types.js";

export async function runMonitorPerfMaintenance() {
  const now = new Date();
  const rawCutoff = new Date(now.getTime() - RAW_RETENTION_DAYS * 86_400_000);
  const hourlyCutoff = new Date(now.getTime() - HOURLY_RETENTION_DAYS * 86_400_000);
  const hourlyBackfillCutoff = new Date(now.getTime() - HOURLY_BACKFILL_DAYS * 86_400_000);
  const dailyBackfillCutoff = new Date(now.getTime() - DAILY_BACKFILL_DAYS * 86_400_000);

  try {
    // Backfill monitor status from latest check
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

    // Fix monitors with NULL nextCheckAt
    await prisma.$executeRawUnsafe(
      `UPDATE monitor
      SET "nextCheckAt" = COALESCE(
            "lastCheckedAt" + make_interval(secs => interval),
            NOW()
          ),
          "updatedAt" = NOW()
      WHERE "nextCheckAt" IS NULL`,
    );

    // Backfill hourly rollups
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

    // Backfill daily rollups
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

    // Purge old raw checks
    await prisma.$executeRawUnsafe(
      `DELETE FROM monitor_check
      WHERE "checkedAt" < $1`,
      rawCutoff,
    );

    // Purge old hourly rollups
    await prisma.$executeRawUnsafe(
      `DELETE FROM monitor_check_hourly_rollup
      WHERE "bucketStart" < $1`,
      hourlyCutoff,
    );
  } catch (error) {
    if (!isMissingMonitorPerfSchema(error)) {
      throw error;
    }
  }
}
