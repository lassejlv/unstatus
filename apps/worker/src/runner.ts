import { prisma } from "./db.js";
import { checkHttp } from "./checkers/http.js";
import { checkTcp } from "./checkers/tcp.js";
import { sendNotifications } from "./notify.js";
import type { Monitor } from "@unstatus/db";

const region = process.env.REGION ?? "eu";

async function handleAutoIncident(monitor: Monitor, status: string) {
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
  const monitor = await prisma.monitor.findUniqueOrThrow({
    where: { id: monitorId },
  });
  const result =
    monitor.type === "tcp" ? await checkTcp(monitor) : await checkHttp(monitor);

  const [check] = await prisma.$transaction([
    prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status: result.status,
        latency: result.latency,
        statusCode: result.statusCode,
        message: result.message,
        responseHeaders: result.responseHeaders,
        responseBody: result.responseBody,
        region,
      },
    }),
    prisma.monitor.update({
      where: { id: monitor.id },
      data: { lastCheckedAt: new Date() },
    }),
  ]);

  await handleAutoIncident(monitor, result.status);

  return check;
}

export async function runChecks() {
  const now = new Date();
  const monitors = await prisma.monitor.findMany({ where: { active: true } });
  const filtered = monitors.filter((m) => {
    const regions = (m.regions as string[]) ?? [];
    if (!regions.includes(region)) return false;
    if (m.lastCheckedAt) {
      const elapsed =
        (now.getTime() - new Date(m.lastCheckedAt).getTime()) / 1000;
      if (elapsed < m.interval) return false;
    }
    return true;
  });

  const results = await Promise.allSettled(
    filtered.map(async (monitor) => {
      // Atomically claim this monitor by setting lastCheckedAt only if it hasn't changed
      const claimed = await prisma.monitor.updateMany({
        where: {
          id: monitor.id,
          lastCheckedAt: monitor.lastCheckedAt,
        },
        data: { lastCheckedAt: now },
      });
      if (claimed.count === 0) return; // another run already claimed it

      const result =
        monitor.type === "tcp"
          ? await checkTcp(monitor)
          : await checkHttp(monitor);

      await prisma.monitorCheck.create({
        data: {
          monitorId: monitor.id,
          status: result.status,
          latency: result.latency,
          statusCode: result.statusCode,
          message: result.message,
          responseHeaders: result.responseHeaders,
          responseBody: result.responseBody,
          region,
        },
      });

      await handleAutoIncident(monitor, result.status);
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return { total: filtered.length, failed };
}
