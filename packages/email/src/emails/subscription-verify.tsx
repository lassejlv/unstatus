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

export type SubscriptionVerifyEmailProps = {
  pageName: string;
  verifyUrl: string;
};

export function SubscriptionVerifyEmail({
  pageName,
  verifyUrl,
}: SubscriptionVerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your subscription to {pageName} status updates</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Unstatus</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Confirm your subscription</Heading>
            <Text style={paragraph}>
              You requested to receive status updates for <strong>{pageName}</strong>.
              Click the button below to verify your email and start receiving notifications.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={verifyUrl}>
                Verify email
              </Button>
            </Section>

            <Text style={small}>
              If you didn't request this, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Sent by Unstatus
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

const small: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
};

const footer: React.CSSProperties = {
  padding: "0",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
};

export default SubscriptionVerifyEmail;
