import { prisma } from "./db.js";

type NotifyEvent =
  | { type: "monitor.down"; monitorName: string; message?: string }
  | { type: "monitor.recovered"; monitorName: string }
  | { type: "incident.created"; monitorName: string; title: string; severity: string; message: string }
  | { type: "incident.resolved"; monitorName: string; title: string }
  | { type: "incident.updated"; monitorName: string; title: string; status: string; message: string };

const EVENT_TO_FLAG: Record<NotifyEvent["type"], string> = {
  "monitor.down": "onMonitorDown",
  "monitor.recovered": "onMonitorRecovered",
  "incident.created": "onIncidentCreated",
  "incident.resolved": "onIncidentResolved",
  "incident.updated": "onIncidentUpdated",
};

const SEVERITY_COLORS: Record<string, number> = {
  critical: 0xef4444,
  major: 0xf97316,
  minor: 0xeab308,
};

function buildEmbed(event: NotifyEvent) {
  switch (event.type) {
    case "monitor.down":
      return {
        title: `${event.monitorName} is down`,
        description: event.message || "Monitor is not responding.",
        color: 0xef4444,
        timestamp: new Date().toISOString(),
      };
    case "monitor.recovered":
      return {
        title: `${event.monitorName} recovered`,
        description: "Monitor is back up and responding normally.",
        color: 0x22c55e,
        timestamp: new Date().toISOString(),
      };
    case "incident.created":
      return {
        title: `Incident: ${event.title}`,
        description: event.message,
        color: SEVERITY_COLORS[event.severity] ?? 0xef4444,
        fields: [
          { name: "Monitor", value: event.monitorName, inline: true },
          { name: "Severity", value: event.severity, inline: true },
        ],
        timestamp: new Date().toISOString(),
      };
    case "incident.resolved":
      return {
        title: `Resolved: ${event.title}`,
        description: `Incident for ${event.monitorName} has been resolved.`,
        color: 0x22c55e,
        timestamp: new Date().toISOString(),
      };
    case "incident.updated":
      return {
        title: `Updated: ${event.title}`,
        description: event.message,
        color: 0x3b82f6,
        fields: [
          { name: "Monitor", value: event.monitorName, inline: true },
          { name: "Status", value: event.status, inline: true },
        ],
        timestamp: new Date().toISOString(),
      };
  }
}

export async function sendNotifications(organizationId: string, event: NotifyEvent) {
  const flag = EVENT_TO_FLAG[event.type];
  const channels = await prisma.notificationChannel.findMany({
    where: {
      organizationId,
      enabled: true,
      [flag]: true,
    },
  });

  await Promise.allSettled(
    channels.map(async (channel) => {
      const embed = buildEmbed(event);
      const res = await fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!res.ok) {
        console.error(`Discord webhook failed for channel ${channel.id}: ${res.status}`);
      }
    }),
  );
}
