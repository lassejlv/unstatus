export type FetchLike = typeof fetch;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: FetchLike;
  userAgent?: string;
}

export type MonitorType = "http" | "tcp" | "ping";
export type MonitorStatus = "up" | "down" | "degraded";
export type Region = "eu" | "us" | "asia";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type IncidentSeverity = "minor" | "major" | "critical";
export type NotificationChannelType = "discord" | "email";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type Plan = "free" | "pro";

export interface MonitorRule {
  type: string;
  operator: string;
  value: string;
}

export interface Monitor {
  id: string;
  organizationId: string;
  name: string;
  type: MonitorType;
  active: boolean;
  interval: number;
  timeout: number;
  url: string | null;
  method: string | null;
  headers: Record<string, string> | null;
  body: string | null;
  host: string | null;
  port: number | null;
  rules: MonitorRule[] | null;
  regions: Region[];
  autoIncidents: boolean;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  lastStatus: string | null;
  lastLatency: number | null;
  lastStatusCode: number | null;
  lastRegion: string | null;
  lastMessage: string | null;
}

export interface MonitorCheck {
  id: string;
  monitorId: string;
  status: MonitorStatus;
  latency: number;
  statusCode: number | null;
  message: string | null;
  region: string | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  checkedAt: string;
}

export interface CreateMonitorInput {
  name: string;
  type: MonitorType;
  interval?: number;
  timeout?: number;
  url?: string | null;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  host?: string | null;
  port?: number | null;
  rules?: MonitorRule[];
  regions?: Region[];
  autoIncidents?: boolean;
}

export interface UpdateMonitorInput {
  name?: string;
  type?: MonitorType;
  interval?: number;
  timeout?: number;
  url?: string | null;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  host?: string | null;
  port?: number | null;
  rules?: MonitorRule[];
  regions?: Region[];
  autoIncidents?: boolean;
  active?: boolean;
}

export interface MonitorRunResult extends MonitorCheck {}

export interface IncidentMonitorRef {
  monitor: {
    id: string;
    name: string;
  };
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  message: string;
  createdAt: string;
}

export interface IncidentListItem {
  id: string;
  monitorId: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  startedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  monitor: {
    name: string;
  };
  monitors: IncidentMonitorRef[];
  updates: IncidentUpdate[];
}

export interface Incident {
  id: string;
  monitorId: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  startedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  monitors: IncidentMonitorRef[];
  updates: IncidentUpdate[];
}

export interface CreateIncidentInput {
  monitorIds: string[];
  title: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  message: string;
}

export interface UpdateIncidentInput {
  status: IncidentStatus;
  message: string;
}

export interface StatusPageMonitor {
  id: string;
  statusPageId: string;
  monitorId: string;
  sortOrder: number;
  displayName: string | null;
  groupName: string | null;
  monitor: {
    id: string;
    name: string;
  };
}

export interface StatusPage {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  customDomain: string | null;
  isPublic: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandColor: string | null;
  headerText: string | null;
  footerText: string | null;
  customCss: string | null;
  customJs: string | null;
  showResponseTimes: boolean;
  showDependencies: boolean;
  createdAt: string;
  updatedAt: string;
  monitors?: StatusPageMonitor[];
}

export interface CreateStatusPageInput {
  name: string;
  slug: string;
  customDomain?: string | null;
  isPublic?: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  brandColor?: string;
  headerText?: string | null;
  footerText?: string | null;
  customCss?: string | null;
  customJs?: string | null;
  showResponseTimes?: boolean;
  showDependencies?: boolean;
}

export interface UpdateStatusPageInput {
  name?: string;
  slug?: string;
  customDomain?: string | null;
  isPublic?: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  brandColor?: string;
  headerText?: string | null;
  footerText?: string | null;
  customCss?: string | null;
  customJs?: string | null;
  showResponseTimes?: boolean;
  showDependencies?: boolean;
}

export interface NotificationChannel {
  id: string;
  organizationId: string;
  name: string;
  type: NotificationChannelType;
  webhookUrl: string | null;
  recipientEmail: string | null;
  enabled: boolean;
  onIncidentCreated: boolean;
  onIncidentResolved: boolean;
  onIncidentUpdated: boolean;
  onMonitorDown: boolean;
  onMonitorRecovered: boolean;
  onMaintenanceScheduled: boolean;
  onMaintenanceStarted: boolean;
  onMaintenanceCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationChannelSettings {
  onIncidentCreated?: boolean;
  onIncidentResolved?: boolean;
  onIncidentUpdated?: boolean;
  onMonitorDown?: boolean;
  onMonitorRecovered?: boolean;
  onMaintenanceScheduled?: boolean;
  onMaintenanceStarted?: boolean;
  onMaintenanceCompleted?: boolean;
}

export type CreateNotificationInput =
  | ({
      name: string;
      type: "discord";
      webhookUrl: string;
      recipientEmail?: string;
    } & NotificationChannelSettings)
  | ({
      name: string;
      type: "email";
      recipientEmail: string;
      webhookUrl?: string;
    } & NotificationChannelSettings);

export interface UpdateNotificationInput extends NotificationChannelSettings {
  name?: string;
  webhookUrl?: string | null;
  recipientEmail?: string | null;
  enabled?: boolean;
}

export interface MaintenanceWindowMonitor {
  monitor: {
    id: string;
    name: string;
  };
}

export interface MaintenanceWindow {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
  monitors: MaintenanceWindowMonitor[];
}

export interface CreateMaintenanceInput {
  title: string;
  description?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  monitorIds: string[];
}

export interface UpdateMaintenanceInput {
  title?: string;
  description?: string | null;
  scheduledStart?: string;
  scheduledEnd?: string;
  monitorIds?: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  subscriptionActive: boolean;
  subscriptionPlanName: string | null;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

export interface DeleteResult {
  deleted: true;
}

export interface UnstatusClient {
  monitors: {
    list(params?: PaginationParams): Promise<PaginatedResult<Monitor>>;
    get(id: string): Promise<Monitor>;
    create(input: CreateMonitorInput): Promise<Monitor>;
    update(id: string, input: UpdateMonitorInput): Promise<Monitor>;
    delete(id: string): Promise<DeleteResult>;
    listChecks(id: string, params?: PaginationParams): Promise<PaginatedResult<MonitorCheck>>;
    run(id: string): Promise<MonitorRunResult>;
  };
  incidents: {
    list(params?: PaginationParams): Promise<PaginatedResult<IncidentListItem>>;
    get(id: string): Promise<Incident>;
    create(input: CreateIncidentInput): Promise<Incident>;
    update(id: string, input: UpdateIncidentInput): Promise<Incident>;
    delete(id: string): Promise<DeleteResult>;
  };
  statusPages: {
    list(params?: PaginationParams): Promise<PaginatedResult<StatusPage>>;
    get(id: string): Promise<StatusPage>;
    create(input: CreateStatusPageInput): Promise<StatusPage>;
    update(id: string, input: UpdateStatusPageInput): Promise<StatusPage>;
    delete(id: string): Promise<DeleteResult>;
  };
  maintenance: {
    list(params?: PaginationParams): Promise<PaginatedResult<MaintenanceWindow>>;
    get(id: string): Promise<MaintenanceWindow>;
    create(input: CreateMaintenanceInput): Promise<MaintenanceWindow>;
    update(id: string, input: UpdateMaintenanceInput): Promise<MaintenanceWindow>;
    delete(id: string): Promise<DeleteResult>;
    start(id: string): Promise<MaintenanceWindow>;
    complete(id: string): Promise<MaintenanceWindow>;
    cancel(id: string): Promise<MaintenanceWindow>;
  };
  notifications: {
    list(params?: PaginationParams): Promise<PaginatedResult<NotificationChannel>>;
    create(input: CreateNotificationInput): Promise<NotificationChannel>;
    update(id: string, input: UpdateNotificationInput): Promise<NotificationChannel>;
    delete(id: string): Promise<DeleteResult>;
  };
  organization: {
    get(): Promise<Organization>;
  };
}
