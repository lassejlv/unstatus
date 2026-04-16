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
 * External service/dependency status colors (for Atlassian-style statuses).
 */
export const EXTERNAL_STATUS_COLORS: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded_performance: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-blue-500",
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
