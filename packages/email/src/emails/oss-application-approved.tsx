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

export type OssApplicationApprovedEmailProps = {
  organizationName: string;
  githubRepo: string;
  discountCode: string;
  expiresAt: Date | string;
  redeemUrl: string;
};

export function OssApplicationApprovedEmail({
  organizationName,
  githubRepo,
  discountCode,
  expiresAt,
  redeemUrl,
}: OssApplicationApprovedEmailProps) {
  const expires = new Date(expiresAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Html>
      <Head />
      <Preview>Your Unstatus OSS application is approved</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Unstatus</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>You're in.</Heading>
            <Text style={paragraph}>
              Your OSS program application for <strong>{organizationName}</strong> has
              been approved. As a thank you for maintaining open source, you're
              getting <strong>6 months of the Scale plan on us</strong>.
            </Text>

            <Text style={paragraphSmall}>Use this code at checkout:</Text>

            <Section style={codeBoxContainer}>
              <div style={codeBox}>{discountCode}</div>
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={redeemUrl}>
                Redeem on Billing
              </Button>
            </Section>

            <Text style={smallWarning}>
              Heads up: this code expires on <strong>{expires}</strong> and can
              only be used once. Redeem it before then to lock in your 6 free
              months.
            </Text>

            <Hr style={hr} />

            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={detailLabel}>Organization</td>
                  <td style={detailValue}>{organizationName}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Repository</td>
                  <td style={detailValue}>{githubRepo}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Discount</td>
                  <td style={detailValue}>100% off Scale for 6 months</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Just reply to this email.
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
  fontSize: "20px",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 8px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "0 0 20px 0",
};

const paragraphSmall: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 8px 0",
};

const codeBoxContainer: React.CSSProperties = {
  margin: "0 0 20px 0",
};

const codeBox: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "18px",
  fontWeight: 600,
  color: "#111827",
  backgroundColor: "#f3f4f6",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "12px 16px",
  textAlign: "center" as const,
  letterSpacing: "1px",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "0 0 20px 0",
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

const smallWarning: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 16px 0",
  lineHeight: "1.6",
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
  width: "120px",
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

export default OssApplicationApprovedEmail;
