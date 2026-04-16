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

// =============================================================================
// UNIFIED STATUS CONFIGURATION
// =============================================================================
// Single source of truth for all status-related colors and labels.
// Use these configs instead of defining inline status mappings.

/**
 * Monitor status configuration (up/down/degraded/paused).
 * Used for internal monitor health indicators.
 */
export const MONITOR_STATUS_CONFIG = {
  up: {
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
  },
  down: {
    label: "Down",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
  },
  paused: {
    label: "Paused",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
} as const;

/**
 * External service status configuration (Atlassian-style).
 * Used for third-party service dependencies and registry services.
 */
export const EXTERNAL_STATUS_CONFIG = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "",
    border: "",
  },
  degraded_performance: {
    label: "Degraded",
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
  },
  partial_outage: {
    label: "Partial Outage",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
  },
  major_outage: {
    label: "Major Outage",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "",
    border: "",
  },
} as const;

/**
 * Overall page status configuration.
 * Used for the main status banner on public pages.
 */
export const OVERALL_STATUS_CONFIG = {
  operational: {
    label: "All Systems Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "border-emerald-500/20 bg-emerald-500/5",
    animate: false, // Calm state - no animation needed for confidence
  },
  degraded: {
    label: "Degraded Performance",
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "border-yellow-500/20 bg-yellow-500/5",
    animate: true, // Draw attention to issues
  },
  major_outage: {
    label: "Major Outage",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "border-red-500/20 bg-red-500/5",
    animate: true, // Draw attention to critical issues
  },
  maintenance: {
    label: "Scheduled Maintenance",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    bg: "border-blue-500/20 bg-blue-500/5",
    animate: false, // Planned, no urgency
  },
  unknown: {
    label: "No Data",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted",
    animate: false,
  },
} as const;

/**
 * Incident status configuration.
 * Used for incident timeline and status indicators.
 */
export const INCIDENT_STATUS_CONFIG = {
  investigating: {
    label: "Investigating",
    dot: "bg-red-500",
    border: "border-red-500",
    glow: "bg-red-500/40",
  },
  identified: {
    label: "Identified",
    dot: "bg-yellow-500",
    border: "border-yellow-500",
    glow: "bg-yellow-500/40",
  },
  monitoring: {
    label: "Monitoring",
    dot: "bg-blue-500",
    border: "border-blue-500",
    glow: "bg-blue-500/40",
  },
  resolved: {
    label: "Resolved",
    dot: "bg-emerald-500",
    border: "border-emerald-500",
    glow: "bg-emerald-500/40",
  },
} as const;

/**
 * Incident severity configuration.
 * Used for incident badges and left border accents.
 */
export const INCIDENT_SEVERITY_CONFIG = {
  critical: {
    label: "Critical",
    border: "border-l-red-500",
    badge: "destructive" as const,
  },
  major: {
    label: "Major",
    border: "border-l-yellow-500",
    badge: "warning" as const,
  },
  minor: {
    label: "Minor",
    border: "border-l-muted-foreground",
    badge: "outline" as const,
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get monitor status config with fallback to unknown.
 */
export function getMonitorStatusConfig(status: string | null | undefined) {
  return MONITOR_STATUS_CONFIG[status as keyof typeof MONITOR_STATUS_CONFIG] ?? MONITOR_STATUS_CONFIG.unknown;
}

/**
 * Get external service status config with fallback to unknown.
 */
export function getExternalStatusConfig(status: string | null | undefined) {
  return EXTERNAL_STATUS_CONFIG[status as keyof typeof EXTERNAL_STATUS_CONFIG] ?? EXTERNAL_STATUS_CONFIG.unknown;
}

/**
 * Get overall page status config with fallback to unknown.
 */
export function getOverallStatusConfig(status: string | null | undefined) {
  return OVERALL_STATUS_CONFIG[status as keyof typeof OVERALL_STATUS_CONFIG] ?? OVERALL_STATUS_CONFIG.unknown;
}

/**
 * Get incident status config with fallback to investigating.
 */
export function getIncidentStatusConfig(status: string | null | undefined) {
  return INCIDENT_STATUS_CONFIG[status as keyof typeof INCIDENT_STATUS_CONFIG] ?? INCIDENT_STATUS_CONFIG.investigating;
}

/**
 * Get incident severity config with fallback to minor.
 */
export function getIncidentSeverityConfig(severity: string | null | undefined) {
  return INCIDENT_SEVERITY_CONFIG[severity as keyof typeof INCIDENT_SEVERITY_CONFIG] ?? INCIDENT_SEVERITY_CONFIG.minor;
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================
// Keep old exports for backward compatibility during migration.
// TODO: Remove these after all consumers are updated.

/** @deprecated Use MONITOR_STATUS_CONFIG instead */
export const MONITOR_STATUS_COLORS: Record<string, string> = {
  up: "bg-emerald-500",
  down: "bg-red-500",
  degraded: "bg-yellow-500",
};

/** @deprecated Use MONITOR_STATUS_CONFIG instead */
export const MONITOR_STATUS_TEXT_COLORS: Record<string, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  degraded: "text-yellow-600 dark:text-yellow-400",
};

/** @deprecated Use getMonitorStatusConfig instead */
export function getMonitorStatusColor(status: string | null | undefined): string {
  return MONITOR_STATUS_COLORS[status ?? ""] ?? "bg-muted-foreground";
}

/** @deprecated Use getMonitorStatusConfig instead */
export function getMonitorStatusTextColor(status: string | null | undefined): string {
  return MONITOR_STATUS_TEXT_COLORS[status ?? ""] ?? "text-muted-foreground";
}

/** @deprecated Use getExternalStatusConfig instead */
export function getExternalStatusColor(status: string | null | undefined): string {
  return EXTERNAL_STATUS_COLORS[status ?? ""] ?? "bg-muted-foreground";
}

/** @deprecated Use EXTERNAL_STATUS_CONFIG instead */
export const EXTERNAL_STATUS_COLORS: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded_performance: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-blue-500",
  unknown: "bg-muted-foreground",
};

/** @deprecated Use EXTERNAL_STATUS_CONFIG instead */
export const EXTERNAL_STATUS_TEXT_COLORS: Record<string, string> = {
  operational: "text-emerald-600 dark:text-emerald-400",
  degraded_performance: "text-yellow-600 dark:text-yellow-400",
  partial_outage: "text-orange-600 dark:text-orange-400",
  major_outage: "text-red-600 dark:text-red-400",
  maintenance: "text-blue-600 dark:text-blue-400",
  unknown: "text-muted-foreground",
};

/** @deprecated Use INCIDENT_STATUS_CONFIG instead */
export const INCIDENT_STATUS_COLORS: Record<string, string> = {
  resolved: "border-emerald-500 bg-emerald-500",
  monitoring: "border-blue-500 bg-blue-500",
  identified: "border-yellow-500 bg-yellow-500",
  investigating: "border-red-500 bg-red-500",
};

/** @deprecated Use getIncidentStatusConfig instead */
export function getIncidentStatusColor(status: string): string {
  return INCIDENT_STATUS_COLORS[status] ?? INCIDENT_STATUS_COLORS.investigating;
}
