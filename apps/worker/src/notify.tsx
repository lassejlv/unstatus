import { prisma } from "./db.js";
import { createEmailClient, NotificationEmail, type NotificationEmailProps } from "@unstatus/email";

const email = process.env.INBOUND_API_KEY
  ? createEmailClient(process.env.INBOUND_API_KEY)
  : null;

type NotifyEvent =
  | { type: "monitor.down"; monitorName: string; message?: string }
  | { type: "monitor.recovered"; monitorName: string }
  | { type: "incident.created"; monitorName: string; title: string; severity: string; message: string }
  | { type: "incident.resolved"; monitorName: string; title: string }
  | { type: "incident.updated"; monitorName: string; title: string; status: string; message: string }
  | { type: "maintenance.scheduled"; title: string; scheduledStart: string; scheduledEnd: string; monitorNames: string[] }
  | { type: "maintenance.started"; title: string; monitorNames: string[] }
  | { type: "maintenance.completed"; title: string; monitorNames: string[] };

const EVENT_TO_FLAG: Record<NotifyEvent["type"], string> = {
  "monitor.down": "onMonitorDown",
  "monitor.recovered": "onMonitorRecovered",
  "incident.created": "onIncidentCreated",
  "incident.resolved": "onIncidentResolved",
  "incident.updated": "onIncidentUpdated",
  "maintenance.scheduled": "onMaintenanceScheduled",
  "maintenance.started": "onMaintenanceStarted",
  "maintenance.completed": "onMaintenanceCompleted",
};

const SEVERITY_COLORS: Record<string, number> = {
  critical: 0xef4444,
  major: 0xf97316,
  degraded: 0xf59e0b,
  minor: 0xeab308,
  maintenance: 0x6b7280,
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
    case "maintenance.scheduled":
      return {
        title: `Maintenance Scheduled: ${event.title}`,
        description: `From ${new Date(event.scheduledStart).toLocaleString()} to ${new Date(event.scheduledEnd).toLocaleString()}`,
        color: 0x3b82f6,
        fields: [{ name: "Affected Monitors", value: event.monitorNames.join(", "), inline: false }],
        timestamp: new Date().toISOString(),
      };
    case "maintenance.started":
      return {
        title: `Maintenance Started: ${event.title}`,
        description: `Affected monitors: ${event.monitorNames.join(", ")}`,
        color: 0xf59e0b,
        timestamp: new Date().toISOString(),
      };
    case "maintenance.completed":
      return {
        title: `Maintenance Completed: ${event.title}`,
        description: `Affected monitors: ${event.monitorNames.join(", ")}`,
        color: 0x22c55e,
        timestamp: new Date().toISOString(),
      };
  }
}

function buildEmailSubject(event: NotifyEvent): string {
  switch (event.type) {
    case "monitor.down":
      return `[Unstatus] ${event.monitorName} is down`;
    case "monitor.recovered":
      return `[Unstatus] ${event.monitorName} recovered`;
    case "incident.created":
      return `[Unstatus] Incident: ${event.title}`;
    case "incident.resolved":
      return `[Unstatus] Resolved: ${event.title}`;
    case "incident.updated":
      return `[Unstatus] Updated: ${event.title}`;
    case "maintenance.scheduled":
      return `[Unstatus] Maintenance Scheduled: ${event.title}`;
    case "maintenance.started":
      return `[Unstatus] Maintenance Started: ${event.title}`;
    case "maintenance.completed":
      return `[Unstatus] Maintenance Completed: ${event.title}`;
  }
}

function eventToEmailProps(event: NotifyEvent): NotificationEmailProps {
  switch (event.type) {
    case "monitor.down":
      return { eventType: event.type, monitorName: event.monitorName, message: event.message };
    case "monitor.recovered":
      return { eventType: event.type, monitorName: event.monitorName };
    case "incident.created":
      return { eventType: event.type, monitorName: event.monitorName, title: event.title, severity: event.severity, message: event.message };
    case "incident.resolved":
      return { eventType: event.type, monitorName: event.monitorName, title: event.title };
    case "incident.updated":
      return { eventType: event.type, monitorName: event.monitorName, title: event.title, status: event.status, message: event.message };
    case "maintenance.scheduled":
      return { eventType: "incident.created" as const, monitorName: event.monitorNames.join(", "), title: event.title, severity: "minor", message: `Scheduled maintenance` };
    case "maintenance.started":
      return { eventType: "incident.created" as const, monitorName: event.monitorNames.join(", "), title: `Maintenance: ${event.title}`, severity: "minor", message: "Maintenance has started." };
    case "maintenance.completed":
      return { eventType: "incident.resolved" as const, monitorName: event.monitorNames.join(", "), title: `Maintenance: ${event.title}` };
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

  const inboundFrom = process.env.INBOUND_FROM;

  await Promise.allSettled(
    channels.map(async (channel) => {
      if (channel.type === "discord" && channel.webhookUrl) {
        const embed = buildEmbed(event);
        const res = await fetch(channel.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });
        if (!res.ok) {
          console.error(`Discord webhook failed for channel ${channel.id}: ${res.status}`);
        }
      } else if (channel.type === "email" && channel.recipientEmail && inboundFrom && email) {
        const recipients = channel.recipientEmail.split(",").map((e) => e.trim()).filter(Boolean);
        await email.emails.send({
          from: inboundFrom,
          to: recipients,
          subject: buildEmailSubject(event),
          react: <NotificationEmail {...eventToEmailProps(event)} />,
        });
      }
    }),
  );
}
