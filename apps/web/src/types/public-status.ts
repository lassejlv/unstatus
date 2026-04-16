/**
 * Types for public status page data retrieval.
 * Used by both the server functions (lib/public-status.ts) and oRPC router.
 */

/**
 * Resolved status page data from the database.
 */
export type ResolvedPublicPage = {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  logoUrl: string | null;
  brandColor: string | null;
  headerText: string | null;
  footerText: string | null;
  showResponseTimes: boolean;
  showDependencies: boolean;
  customCss: string | null;
  customJs: string | null;
};

/**
 * Raw monitor row from status page query.
 */
export type MonitorRow = {
  monitorId: string;
  monitorName: string;
  displayName: string | null;
  groupName: string | null;
};

/**
 * Daily statistics row from aggregation query.
 */
export type StatsRow = {
  monitorId: string;
  day: string;
  total: bigint;
  up: bigint;
  avg_latency: number | null;
};

/**
 * Latest monitor status row.
 */
export type LatestRow = {
  monitorId: string;
  status: string | null;
};

/**
 * Incident row for public status display.
 */
export type IncidentRow = {
  id: string;
  monitorId: string;
  title: string;
  status: string;
  severity: string;
  startedAt: Date;
  resolvedAt: Date | null;
  lastMessage: string | null;
};

/**
 * Hourly rollup row for response time charts.
 */
export type HourlyRow = {
  monitorId: string;
  hour: Date;
  avg_latency: number | null;
  check_count: bigint;
};

/**
 * External service dependency row.
 */
export type DependencyRow = {
  monitorId: string;
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  serviceLogoUrl: string | null;
  serviceStatus: string | null;
  serviceStatusPageUrl: string | null;
  serviceLastFetchedAt: Date | null;
  componentName: string | null;
  componentStatus: string | null;
};

// --- Utility Functions ---

/**
 * Convert a Date to a local date key string (YYYY-MM-DD).
 */
export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date key string (YYYY-MM-DD) to milliseconds since epoch.
 */
export function parseDateKeyToLocalMs(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
}

