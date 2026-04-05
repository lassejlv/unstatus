import { prisma } from "./db.js";
import { checkHttp } from "./checkers/http.js";
import { checkTcp } from "./checkers/tcp.js";
import { checkPing } from "./checkers/ping.js";
import { checkRedis } from "./checkers/redis.js";
import { checkPostgres } from "./checkers/postgres.js";
import type { Monitor } from "@unstatus/db";
import {
  isMissingMonitorPerfSchema,
  type WorkerMonitor,
} from "./db/types.js";
import {
  claimLegacyMonitor,
  claimDueMonitor,
  getMonitorById,
  listLegacyDueMonitors,
  listDueMonitors,
} from "./db/queries.js";
import { recordMonitorCheck } from "./db/checks.js";
import { handleAutoIncident } from "./incidents.js";
import { createLimiter } from "./limiter.js";

const region = process.env.REGION ?? "eu";
const limit = createLimiter(Number(process.env.CHECK_CONCURRENCY ?? 20));

async function runCheck(monitor: WorkerMonitor) {
  switch (monitor.type) {
    case "tcp": return checkTcp(monitor as Monitor);
    case "ping": return checkPing(monitor as Monitor);
    case "redis": return checkRedis(monitor as Monitor);
    case "postgres": return checkPostgres(monitor as Monitor);
    default: return checkHttp(monitor as Monitor);
  }
}

export async function runSingleCheck(monitorId: string) {
  const monitor = await getMonitorById(monitorId);
  const result = await runCheck(monitor);
  const check = await recordMonitorCheck(monitor, result, region, new Date());

  // Fetch existing incident for this monitor
  const existing = monitor.autoIncidents
    ? await prisma.incident.findFirst({ where: { monitorId: monitor.id, resolvedAt: null } })
    : null;
  await handleAutoIncident(monitor, result.status, existing ?? undefined);

  return check;
}

async function runLegacyChecks(now: Date) {
  const monitors = await listLegacyDueMonitors(now, region);

  // Batch pre-fetch open incidents for autoIncident monitors
  const autoIds = monitors.filter((m) => m.autoIncidents).map((m) => m.id);
  const openIncidents = autoIds.length > 0
    ? await prisma.incident.findMany({ where: { monitorId: { in: autoIds }, resolvedAt: null } })
    : [];
  const incidentMap = new Map(openIncidents.map((i) => [i.monitorId, i]));

  const results = await Promise.allSettled(
    monitors.map((monitor) =>
      limit(async () => {
        const claimed = await claimLegacyMonitor(monitor, now);
        if (!claimed) return;

        const result = await runCheck(monitor);
        await recordMonitorCheck(monitor, result, region, new Date());
        await handleAutoIncident(monitor, result.status, incidentMap.get(monitor.id));
      }),
    ),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return { total: monitors.length, failed };
}

export async function runChecks() {
  const now = new Date();

  try {
    const monitors = await listDueMonitors(now, region);

    // Batch pre-fetch open incidents for autoIncident monitors
    const autoIds = monitors.filter((m) => m.autoIncidents).map((m) => m.id);
    const openIncidents = autoIds.length > 0
      ? await prisma.incident.findMany({ where: { monitorId: { in: autoIds }, resolvedAt: null } })
      : [];
    const incidentMap = new Map(openIncidents.map((i) => [i.monitorId, i]));

    const results = await Promise.allSettled(
      monitors.map((monitor) =>
        limit(async () => {
          const claimed = await claimDueMonitor(monitor, now);
          if (!claimed) return;

          const result = await runCheck(monitor);
          await recordMonitorCheck(monitor, result, region, new Date());
          await handleAutoIncident(monitor, result.status, incidentMap.get(monitor.id));
        }),
      ),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    return { total: monitors.length, failed };
  } catch (error) {
    if (!isMissingMonitorPerfSchema(error)) {
      throw error;
    }

    return runLegacyChecks(now);
  }
}
