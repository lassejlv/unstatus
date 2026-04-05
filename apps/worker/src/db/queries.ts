import { prisma } from "../db.js";
import {
  MONITOR_BASE_SELECT,
  DUE_BATCH_SIZE,
  getNextCheckAt,
  type WorkerMonitor,
  type DueMonitorRow,
} from "./types.js";

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
  return prisma.$queryRawUnsafe<DueMonitorRow[]>(
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
      AND id NOT IN (
        SELECT mwm."monitorId" FROM maintenance_window_monitor mwm
        JOIN maintenance_window mw ON mw.id = mwm."maintenanceWindowId"
        WHERE mw.status = 'in_progress'
      )
    ORDER BY COALESCE("nextCheckAt", to_timestamp(0)) ASC
    LIMIT ${DUE_BATCH_SIZE}`,
    now,
    region,
  );
}

export async function listLegacyDueMonitors(now: Date, region: string) {
  return prisma.$queryRawUnsafe<WorkerMonitor[]>(
    `${MONITOR_BASE_SELECT}
    WHERE active = true
      AND COALESCE(regions, '[]'::jsonb) @> jsonb_build_array($2::text)
      AND (
        "lastCheckedAt" IS NULL
        OR "lastCheckedAt" + make_interval(secs => interval) <= $1
      )
      AND id NOT IN (
        SELECT mwm."monitorId" FROM maintenance_window_monitor mwm
        JOIN maintenance_window mw ON mw.id = mwm."maintenanceWindowId"
        WHERE mw.status = 'in_progress'
      )
    ORDER BY COALESCE("lastCheckedAt", to_timestamp(0)) ASC
    LIMIT ${DUE_BATCH_SIZE}`,
    now,
    region,
  );
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

export async function claimDueMonitor(monitor: Pick<WorkerMonitor, "id" | "interval">, now: Date) {
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
