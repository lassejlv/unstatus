/**
 * Shared enum and union type definitions.
 * These types are used across the web app (API, oRPC, UI) and should be the
 * single source of truth for validation schemas and TypeScript types.
 */
import z from "zod";

// --- Monitor Types ---

export const MONITOR_TYPES = ["http", "tcp", "ping", "redis", "postgres"] as const;
export const monitorTypeSchema = z.enum(MONITOR_TYPES);
export type MonitorType = (typeof MONITOR_TYPES)[number];

export const MONITOR_STATUSES = ["up", "down", "degraded"] as const;
export const monitorStatusSchema = z.enum(MONITOR_STATUSES);
export type MonitorStatus = (typeof MONITOR_STATUSES)[number];

// --- Regions ---

export const REGIONS = ["eu", "us", "asia"] as const;
export const regionSchema = z.enum(REGIONS);
export type Region = (typeof REGIONS)[number];

// --- Incident Types ---

export const INCIDENT_STATUSES = ["investigating", "identified", "monitoring", "resolved"] as const;
export const incidentStatusSchema = z.enum(INCIDENT_STATUSES);
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_SEVERITIES = ["maintenance", "minor", "degraded", "major", "critical"] as const;
export const incidentSeveritySchema = z.enum(INCIDENT_SEVERITIES);
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

// --- Maintenance Types ---

export const MAINTENANCE_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export const maintenanceStatusSchema = z.enum(MAINTENANCE_STATUSES);
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

// --- Notification Types ---

export const NOTIFICATION_CHANNEL_TYPES = ["discord", "email"] as const;
export const notificationChannelTypeSchema = z.enum(NOTIFICATION_CHANNEL_TYPES);
export type NotificationChannelType = (typeof NOTIFICATION_CHANNEL_TYPES)[number];
