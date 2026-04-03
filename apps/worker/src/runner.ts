import { prisma } from "./db.js";
import { checkHttp } from "./checkers/http.js";
import { checkTcp } from "./checkers/tcp.js";
import { checkPing } from "./checkers/ping.js";
import { sendNotifications } from "./notify";
import type { Monitor } from "@unstatus/db";
import {
  claimLegacyMonitor,
  claimDueMonitor,
  getMonitorById,
  isMissingMonitorPerfSchema,
  listLegacyDueMonitors,
  listDueMonitors,
  recordMonitorCheck,
  type WorkerMonitor,
} from "./monitor-perf.js";

const region = process.env.REGION ?? "eu";

async function handleAutoIncident(
  monitor: Pick<WorkerMonitor, "id" | "name" | "organizationId" | "autoIncidents">,
  status: string,
) {
  if (!monitor.autoIncidents) return;

  if (status === "down") {
    // Only create if no unresolved incident exists
    const existing = await prisma.incident.findFirst({
      where: { monitorId: monitor.id, resolvedAt: null },
    });
    if (!existing) {
      await prisma.incident.create({
        data: {
          monitorId: monitor.id,
          title: `${monitor.name} is down`,
          status: "investigating",
          severity: "major",
          updates: { create: { status: "investigating", message: "Monitor detected as down." } },
          monitors: { create: { monitorId: monitor.id } },
        },
      });
      sendNotifications(monitor.organizationId, {
        type: "monitor.down",
        monitorName: monitor.name,
      }).catch((e) => console.error("Notification failed:", e));
    }
  } else if (status === "up") {
    // Auto-resolve any open incident
    const open = await prisma.incident.findFirst({
      where: { monitorId: monitor.id, resolvedAt: null },
    });
    if (open) {
      await prisma.incident.update({
        where: { id: open.id },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          updates: { create: { status: "resolved", message: "Monitor recovered automatically." } },
        },
      });
      sendNotifications(monitor.organizationId, {
        type: "monitor.recovered",
        monitorName: monitor.name,
      }).catch((e) => console.error("Notification failed:", e));
    }
  }
}

export async function runSingleCheck(monitorId: string) {
  const monitor = await getMonitorById(monitorId);
  const result =
    monitor.type === "tcp" ? await checkTcp(monitor as Monitor)
    : monitor.type === "ping" ? await checkPing(monitor as Monitor)
    : await checkHttp(monitor as Monitor);

  const check = await recordMonitorCheck(monitor, result, region, new Date());

  await handleAutoIncident(monitor, result.status);

  return check;
}

async function runLegacyChecks(now: Date) {
  const monitors = await listLegacyDueMonitors(now, region);

  const results = await Promise.allSettled(
    monitors.map(async (monitor) => {
      const claimed = await claimLegacyMonitor(monitor, now);
      if (!claimed) return;

      const result =
        monitor.type === "tcp"
          ? await checkTcp(monitor as Monitor)
          : monitor.type === "ping"
            ? await checkPing(monitor as Monitor)
            : await checkHttp(monitor as Monitor);

      await recordMonitorCheck(monitor, result, region, new Date());
      await handleAutoIncident(monitor, result.status);
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return { total: monitors.length, failed };
}

export async function runChecks() {
  const now = new Date();

  try {
    const monitors = await listDueMonitors(now, region);

    const results = await Promise.allSettled(
      monitors.map(async (monitor) => {
        const claimed = await claimDueMonitor(monitor, now);
        if (!claimed) return;

        const result =
          monitor.type === "tcp"
            ? await checkTcp(monitor as Monitor)
            : monitor.type === "ping"
              ? await checkPing(monitor as Monitor)
              : await checkHttp(monitor as Monitor);

        await recordMonitorCheck(monitor, result, region, new Date());
        await handleAutoIncident(monitor, result.status);
      }),
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
