import { prisma } from "./db.js";
import { sendNotifications } from "./notify.js";

/**
 * Process maintenance window auto-transitions:
 * - scheduled -> in_progress when scheduledStart <= now
 * - in_progress -> completed when scheduledEnd <= now
 */
export async function processMaintenanceWindows() {
  const now = new Date();

  // Start scheduled windows that are due
  const toStart = await prisma.maintenanceWindow.findMany({
    where: {
      status: "scheduled",
      scheduledStart: { lte: now },
    },
    include: {
      monitors: {
        include: { monitor: { select: { id: true, name: true } } },
      },
    },
  });

  if (toStart.length > 0) {
    await prisma.maintenanceWindow.updateMany({
      where: { id: { in: toStart.map((mw) => mw.id) } },
      data: { status: "in_progress", actualStart: now },
    });

    await Promise.allSettled(
      toStart.map((mw) => {
        console.log(`Maintenance started: ${mw.title} (${mw.id})`);
        return sendNotifications(mw.organizationId, {
          type: "maintenance.started",
          title: mw.title,
          monitorNames: mw.monitors.map((m) => m.monitor.name),
        });
      }),
    );
  }

  // Complete in-progress windows that are past their end time
  const toComplete = await prisma.maintenanceWindow.findMany({
    where: {
      status: "in_progress",
      scheduledEnd: { lte: now },
    },
    include: {
      monitors: {
        include: { monitor: { select: { id: true, name: true } } },
      },
    },
  });

  if (toComplete.length > 0) {
    await prisma.maintenanceWindow.updateMany({
      where: { id: { in: toComplete.map((mw) => mw.id) } },
      data: { status: "completed", actualEnd: now },
    });

    await Promise.allSettled(
      toComplete.map((mw) => {
        console.log(`Maintenance completed: ${mw.title} (${mw.id})`);
        return sendNotifications(mw.organizationId, {
          type: "maintenance.completed",
          title: mw.title,
          monitorNames: mw.monitors.map((m) => m.monitor.name),
        });
      }),
    );
  }

  if (toStart.length > 0 || toComplete.length > 0) {
    console.log(`Maintenance transitions: ${toStart.length} started, ${toComplete.length} completed`);
  }
}
