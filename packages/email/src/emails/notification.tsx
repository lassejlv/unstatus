import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Preview,
  Link,
} from "@react-email/components";

export type NotificationEmailProps = {
  eventType: "monitor.down" | "monitor.recovered" | "incident.created" | "incident.resolved" | "incident.updated" | "test";
  monitorName: string;
  title?: string;
  severity?: string;
  message?: string;
  status?: string;
  unsubscribeUrl?: string;
};

const EVENT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  "monitor.down": { label: "Monitor Down", color: "#ef4444", bgColor: "#fef2f2" },
  "monitor.recovered": { label: "Monitor Recovered", color: "#22c55e", bgColor: "#f0fdf4" },
  "incident.created": { label: "Incident Created", color: "#ef4444", bgColor: "#fef2f2" },
  "incident.resolved": { label: "Incident Resolved", color: "#22c55e", bgColor: "#f0fdf4" },
  "incident.updated": { label: "Incident Updated", color: "#3b82f6", bgColor: "#eff6ff" },
  test: { label: "Test Notification", color: "#22c55e", bgColor: "#f0fdf4" },
};

function getDescription(props: NotificationEmailProps): string {
  switch (props.eventType) {
    case "monitor.down":
      return props.message || "Monitor is not responding.";
    case "monitor.recovered":
      return "Monitor is back up and responding normally.";
    case "incident.created":
      return props.message || "A new incident has been created.";
    case "incident.resolved":
      return `Incident for ${props.monitorName} has been resolved.`;
    case "incident.updated":
      return props.message || "Incident has been updated.";
    case "test":
      return "This is a test notification from Unstatus. If you see this, your email notifications are working correctly!";
  }
}

function getHeading(props: NotificationEmailProps): string {
  switch (props.eventType) {
    case "monitor.down":
      return `${props.monitorName} is down`;
    case "monitor.recovered":
      return `${props.monitorName} recovered`;
    case "incident.created":
      return `Incident: ${props.title}`;
    case "incident.resolved":
      return `Resolved: ${props.title}`;
    case "incident.updated":
      return `Updated: ${props.title}`;
    case "test":
      return "Test Notification";
  }
}

export function NotificationEmail(props: NotificationEmailProps) {
  const config = EVENT_CONFIG[props.eventType];
  const heading = getHeading(props);
  const description = getDescription(props);

  return (
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={brand}>Unstatus</Text>
          </Section>

          {/* Status badge */}
          <Section style={{ ...badge, backgroundColor: config.bgColor, borderLeft: `4px solid ${config.color}` }}>
            <Text style={{ ...badgeText, color: config.color }}>{config.label}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>{heading}</Heading>
            <Text style={paragraph}>{description}</Text>

            {/* Details */}
            {(props.monitorName || props.severity || props.status) && (
              <>
                <Hr style={hr} />
                <table style={detailsTable}>
                  <tbody>
                    <tr>
                      <td style={detailLabel}>Monitor</td>
                      <td style={detailValue}>{props.monitorName}</td>
                    </tr>
                    {props.severity && (
                      <tr>
                        <td style={detailLabel}>Severity</td>
                        <td style={detailValue}>{props.severity}</td>
                      </tr>
                    )}
                    {props.status && (
                      <tr>
                        <td style={detailLabel}>Status</td>
                        <td style={detailValue}>{props.status}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Sent by Unstatus.{" "}
              {props.unsubscribeUrl && (
                <Link href={props.unsubscribeUrl} style={unsubscribeLink}>
                  Unsubscribe
                </Link>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 20px",
};

const header: React.CSSProperties = {
  padding: "0 0 24px 0",
};

const brand: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const badge: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "6px",
  marginBottom: "24px",
};

const badgeText: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  padding: "24px",
};

const h1: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 8px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "0 0 16px 0",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
};

const detailsTable: React.CSSProperties = {
  width: "100%",
  fontSize: "13px",
};

const detailLabel: React.CSSProperties = {
  color: "#6b7280",
  padding: "4px 0",
  width: "100px",
};

const detailValue: React.CSSProperties = {
  color: "#111827",
  fontWeight: 500,
  padding: "4px 0",
};

const footer: React.CSSProperties = {
  padding: "0",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
};

const unsubscribeLink: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "underline",
};

export default NotificationEmail;
