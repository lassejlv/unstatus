import { auditLog, type AuditLogEvent } from "@unstatus/observability";

type AuditContext = {
  session: {
    user: {
      id: string;
    };
  };
};

type WebAuditEvent = Omit<AuditLogEvent, "service" | "userId"> & {
  context: AuditContext;
};

export function logAudit({ context, ...event }: WebAuditEvent) {
  auditLog({
    ...event,
    service: "web",
    userId: context.session.user.id,
  });
}
