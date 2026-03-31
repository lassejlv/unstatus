import { prisma } from "@/lib/prisma";
import { email } from "@/lib/email";
import { env } from "@/lib/env";
import { NotificationEmail, type NotificationEmailProps } from "@unstatus/email";

type NotifyEvent =
  | { type: "incident.created"; monitorId: string; monitorName: string; title: string; severity: string; message: string }
  | { type: "incident.resolved"; monitorId: string; monitorName: string; title: string }
  | { type: "incident.updated"; monitorId: string; monitorName: string; title: string; status: string; message: string };

const EVENT_TO_FLAG: Record<NotifyEvent["type"], string> = {
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

function buildEmailSubject(event: NotifyEvent): string {
  switch (event.type) {
    case "incident.created":
      return `[Unstatus] Incident: ${event.title}`;
    case "incident.resolved":
      return `[Unstatus] Resolved: ${event.title}`;
    case "incident.updated":
      return `[Unstatus] Updated: ${event.title}`;
  }
}

function eventToEmailProps(event: NotifyEvent): NotificationEmailProps {
  switch (event.type) {
    case "incident.created":
      return { eventType: event.type, monitorName: event.monitorName, title: event.title, severity: event.severity, message: event.message };
    case "incident.resolved":
      return { eventType: event.type, monitorName: event.monitorName, title: event.title };
    case "incident.updated":
      return { eventType: event.type, monitorName: event.monitorName, title: event.title, status: event.status, message: event.message };
  }
}

export async function sendNotifications(organizationId: string, event: NotifyEvent) {
  const flag = EVENT_TO_FLAG[event.type];

  // Send to org notification channels (Discord + email)
  const channels = await prisma.notificationChannel.findMany({
    where: {
      organizationId,
      enabled: true,
      [flag]: true,
    },
  });

  const channelPromises = channels.map(async (channel) => {
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
    } else if (channel.type === "email" && channel.recipientEmail) {
      const recipients = channel.recipientEmail.split(",").map((e) => e.trim()).filter(Boolean);
      await email.emails.send({
        from: env.INBOUND_FROM,
        to: recipients,
        subject: buildEmailSubject(event),
        react: <NotificationEmail {...eventToEmailProps(event)} />,
      });
    }
  });

  // Send to public status page subscribers
  const subscriberPromises = notifySubscribers(event);

  await Promise.allSettled([...channelPromises, subscriberPromises]);
}

async function notifySubscribers(event: NotifyEvent) {
  // Find status pages that include this monitor
  const statusPageMonitors = await prisma.statusPageMonitor.findMany({
    where: { monitorId: event.monitorId },
    select: { statusPageId: true },
  });

  if (statusPageMonitors.length === 0) return;

  const statusPageIds = statusPageMonitors.map((spm) => spm.statusPageId);

  // Get verified subscribers for these pages
  const subscribers = await prisma.statusPageSubscriber.findMany({
    where: {
      statusPageId: { in: statusPageIds },
      verified: true,
    },
  });

  if (subscribers.length === 0) return;

  // Filter subscribers by monitor preference
  const filtered = subscribers.filter((sub) => {
    const monitorIds = sub.monitorIds as string[];
    return monitorIds.length === 0 || monitorIds.includes(event.monitorId);
  });

  if (filtered.length === 0) return;

  const domain = env.APP_DOMAIN === "localhost" ? "http://localhost:3000" : `https://${env.APP_DOMAIN}`;
  const emailProps = eventToEmailProps(event);

  await Promise.allSettled(
    filtered.map(async (sub) => {
      const unsubscribeUrl = `${domain}/status/unsubscribe?token=${sub.token}`;
      await email.emails.send({
        from: env.INBOUND_FROM,
        to: sub.email,
        subject: buildEmailSubject(event),
        react: <NotificationEmail {...emailProps} />,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
        },
      });
    }),
  );
}
