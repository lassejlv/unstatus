/**
 * Shared constants used across the application.
 *
 * Note: Core enum types and values are defined in @/types/enums.ts.
 * This file contains UI-specific constants (display labels, colors).
 */

// Re-export enums from types for convenience
export {
  REGIONS,
  type Region,
  INCIDENT_STATUSES,
  type IncidentStatus,
  INCIDENT_SEVERITIES,
  type IncidentSeverity,
} from "@/types";

/**
 * Monitor check regions with display labels.
 */
export const MONITOR_REGIONS = [
  { id: "eu", label: "\u{1F1EA}\u{1F1FA} Europe" },
  { id: "us", label: "\u{1F1FA}\u{1F1F8} US" },
  { id: "asia", label: "\u{1F1F8}\u{1F1EC} Singapore" },
] as const;

/**
 * Monitor check status colors (for monitor up/down/degraded).
 */
export const MONITOR_STATUS_COLORS: Record<string, string> = {
  up: "bg-emerald-500",
  down: "bg-red-500",
  degraded: "bg-yellow-500",
};

/**
 * Monitor check status text colors for better contrast.
 */
export const MONITOR_STATUS_TEXT_COLORS: Record<string, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  degraded: "text-yellow-600 dark:text-yellow-400",
};

/**
 * Get the background color class for a monitor status.
 */
export function getMonitorStatusColor(status: string | null | undefined): string {
  return MONITOR_STATUS_COLORS[status ?? ""] ?? "bg-muted-foreground";
}

/**
 * Get the text color class for a monitor status.
 */
export function getMonitorStatusTextColor(status: string | null | undefined): string {
  return MONITOR_STATUS_TEXT_COLORS[status ?? ""] ?? "text-muted-foreground";
}

/**
 * Get the background color class for an external service status.
 */
export function getExternalStatusColor(status: string | null | undefined): string {
  return EXTERNAL_STATUS_COLORS[status ?? ""] ?? "bg-muted-foreground";
}

/**
 * External service/dependency status colors (for Atlassian-style statuses).
 */
export const EXTERNAL_STATUS_COLORS: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded_performance: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-blue-500",
  unknown: "bg-muted-foreground",
};

/**
 * External service/dependency status text colors for better contrast.
 */
export const EXTERNAL_STATUS_TEXT_COLORS: Record<string, string> = {
  operational: "text-emerald-600 dark:text-emerald-400",
  degraded_performance: "text-yellow-600 dark:text-yellow-400",
  partial_outage: "text-orange-600 dark:text-orange-400",
  major_outage: "text-red-600 dark:text-red-400",
  maintenance: "text-blue-600 dark:text-blue-400",
  unknown: "text-muted-foreground",
};

/**
 * Incident status colors for timeline dots (filled style).
 */
export const INCIDENT_STATUS_COLORS: Record<string, string> = {
  resolved: "border-emerald-500 bg-emerald-500",
  monitoring: "border-blue-500 bg-blue-500",
  identified: "border-yellow-500 bg-yellow-500",
  investigating: "border-red-500 bg-red-500",
};

/**
 * Get the color class for an incident status dot.
 */
export function getIncidentStatusColor(status: string): string {
  return INCIDENT_STATUS_COLORS[status] ?? INCIDENT_STATUS_COLORS.investigating;
}
