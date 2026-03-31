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
  Button,
} from "@react-email/components";

export type InvitationEmailProps = {
  organizationName: string;
  inviterName: string;
  role: string;
  invitationUrl: string;
};

export function InvitationEmail({
  organizationName,
  inviterName,
  role,
  invitationUrl,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to join {organizationName} on Unstatus</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={brand}>Unstatus</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>You've been invited</Heading>
            <Text style={paragraph}>
              <strong>{inviterName}</strong> has invited you to join{" "}
              <strong>{organizationName}</strong> as a <strong>{role}</strong> on Unstatus.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={invitationUrl}>
                Accept invitation
              </Button>
            </Section>

            <Hr style={hr} />

            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={detailLabel}>Organization</td>
                  <td style={detailValue}>{organizationName}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Role</td>
                  <td style={detailValue}>{role}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Invited by</td>
                  <td style={detailValue}>{inviterName}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              If you weren't expecting this invitation, you can safely ignore this email.
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
  margin: "0 0 24px 0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#111827",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "10px 24px",
  borderRadius: "6px",
  display: "inline-block",
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

export default InvitationEmail;
