export type AuditResult = "success" | "failure";

export type AuditLogEvent = {
  action: string;
  result: AuditResult;
  service?: string;
  env?: string;
  region?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

const LOKI_TIMEOUT_MS = 1_500;

function isEnabled() {
  return process.env.AUDIT_LOGS_ENABLED !== "false";
}

function serviceName(service?: string) {
  return service ?? process.env.SERVICE_NAME ?? process.env.RAILWAY_SERVICE_NAME ?? "app";
}

function environmentName(env?: string) {
  return env ?? process.env.LOG_ENV ?? process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development";
}

function cleanLabel(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

function timestampNs() {
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

function buildLine(event: AuditLogEvent) {
  return {
    type: "audit",
    action: event.action,
    result: event.result,
    service: serviceName(event.service),
    env: environmentName(event.env),
    region: event.region ?? process.env.REGION ?? null,
    userId: event.userId ?? null,
    organizationId: event.organizationId ?? null,
    resourceType: event.resourceType ?? null,
    resourceId: event.resourceId ?? null,
    message: event.message ?? null,
    metadata: event.metadata ?? {},
    timestamp: new Date().toISOString(),
  };
}

async function pushToLoki(line: ReturnType<typeof buildLine>) {
  const url = process.env.LOKI_PUSH_URL;
  if (!url) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOKI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streams: [
          {
            stream: {
              service: cleanLabel(line.service),
              env: cleanLabel(line.env),
              event_type: "audit",
              result: line.result,
            },
            values: [[timestampNs(), JSON.stringify(line)]],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`Audit log push failed: Loki returned ${res.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Audit log push failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export function auditLog(event: AuditLogEvent) {
  if (!isEnabled()) return;

  const line = buildLine(event);
  console.log(JSON.stringify(line));

  void pushToLoki(line);
}
