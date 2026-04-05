import { Prisma, type Monitor } from "@unstatus/db";

export const RAW_RETENTION_DAYS = 30;
export const HOURLY_RETENTION_DAYS = 35;
export const DAILY_BACKFILL_DAYS = 120;
export const HOURLY_BACKFILL_DAYS = 35;
export const DUE_BATCH_SIZE = 500;

export const MONITOR_BASE_SELECT = `
  SELECT
    id,
    "organizationId",
    name,
    type,
    active,
    interval,
    timeout,
    url,
    method,
    headers,
    body,
    host,
    port,
    rules,
    regions,
    "autoIncidents",
    "createdAt",
    "updatedAt",
    "lastCheckedAt"
  FROM monitor
`;

export type CheckPersistenceResult = {
  status: string;
  latency: number;
  statusCode?: number | null;
  message?: string | null;
  responseHeaders?: Prisma.InputJsonValue | null;
  responseBody?: string | null;
};

export type WorkerMonitor = Pick<
  Monitor,
  | "id"
  | "organizationId"
  | "name"
  | "type"
  | "active"
  | "interval"
  | "timeout"
  | "url"
  | "method"
  | "headers"
  | "body"
  | "host"
  | "port"
  | "rules"
  | "regions"
  | "autoIncidents"
  | "createdAt"
  | "updatedAt"
  | "lastCheckedAt"
>;

export type DueMonitorRow = WorkerMonitor & {
  nextCheckAt: Date | null;
};

export function isMissingMonitorPerfSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("monitor_check_hourly_rollup")
    || message.includes("monitor_check_daily_rollup")
    || message.includes("nextCheckAt")
    || message.includes("lastStatus")
    || message.includes("does not exist")
    || message.includes("42P01")
    || message.includes("42703")
  );
}

export function getNextCheckAt(monitor: Pick<Monitor, "interval">, checkedAt: Date) {
  return new Date(checkedAt.getTime() + monitor.interval * 1000);
}

export function getStatusCount(status: string, expected: "up" | "down" | "degraded") {
  return status === expected ? 1 : 0;
}
