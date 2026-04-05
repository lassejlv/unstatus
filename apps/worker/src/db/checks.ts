import { Prisma } from "@unstatus/db";
import { prisma } from "../db.js";
import {
  isMissingMonitorPerfSchema,
  getNextCheckAt,
  getStatusCount,
  type CheckPersistenceResult,
  type WorkerMonitor,
} from "./types.js";

export async function recordMonitorCheck(
  monitor: Pick<WorkerMonitor, "id" | "interval">,
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
