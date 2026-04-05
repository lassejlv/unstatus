import type { Incident } from "@unstatus/db";
import { prisma } from "./db.js";
import { sendNotifications } from "./notify.js";
import type { WorkerMonitor } from "./db/types.js";

export async function handleAutoIncident(
  monitor: Pick<WorkerMonitor, "id" | "name" | "organizationId" | "autoIncidents">,
  status: string,
  existingIncident?: Incident,
) {
  if (!monitor.autoIncidents) return;

  if (status === "down") {
    if (!existingIncident) {
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
    if (existingIncident) {
      await prisma.incident.update({
        where: { id: existingIncident.id },
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
