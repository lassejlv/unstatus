/**
 * Transforms our internal status page data into Atlassian Statuspage-compatible
 * summary.json format (https://www.atlassianstatuspage.io/api/v2).
 */

type StatusPageData = {
  name: string;
  slug: string;
  overallStatus: string;
  monitors: {
    id: string;
    name: string;
    groupName: string | null;
    currentStatus: string;
    uptimePercent: number;
  }[];
  incidents: {
    id: string;
    title: string;
    status: string;
    severity: string;
    startedAt: Date;
    resolvedAt: Date | null;
    lastUpdate: string | null;
  }[];
  maintenance: {
    active: {
      id: string;
      title: string;
      description: string | null;
      scheduledStart: Date;
      scheduledEnd: Date | null;
      actualStart: Date | null;
    }[];
    upcoming: {
      id: string;
      title: string;
      description: string | null;
      scheduledStart: Date;
      scheduledEnd: Date | null;
    }[];
  };
};

function mapMonitorStatus(status: string): string {
  switch (status) {
    case "up": return "operational";
    case "degraded": return "degraded_performance";
    case "down": return "major_outage";
    default: return "operational";
  }
}

function mapOverallIndicator(status: string): string {
  switch (status) {
    case "operational": return "none";
    case "degraded": return "minor";
    case "major_outage": return "critical";
    case "maintenance": return "maintenance";
    default: return "none";
  }
}

function mapOverallDescription(status: string): string {
  switch (status) {
    case "operational": return "All Systems Operational";
    case "degraded": return "Minor Service Outage";
    case "major_outage": return "Major Service Outage";
    case "maintenance": return "Scheduled Maintenance";
    default: return "All Systems Operational";
  }
}

function mapIncidentImpact(severity: string): string {
  switch (severity) {
    case "critical": return "critical";
    case "major": return "major";
    case "minor": return "minor";
    case "maintenance": return "maintenance";
    case "degraded": return "minor";
    default: return "none";
  }
}

export function buildAtlassianSummary(data: StatusPageData, pageUrl: string) {
  const now = new Date().toISOString();

  return {
    page: {
      id: data.slug,
      name: data.name,
      url: pageUrl,
      time_zone: "Etc/UTC",
      updated_at: now,
    },
    status: {
      indicator: mapOverallIndicator(data.overallStatus),
      description: mapOverallDescription(data.overallStatus),
    },
    components: data.monitors.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      status: mapMonitorStatus(monitor.currentStatus),
      group_id: monitor.groupName ?? null,
      group: false,
      created_at: now,
      updated_at: now,
    })),
    incidents: data.incidents
      .filter((i) => i.status !== "resolved")
      .map((incident) => ({
        id: incident.id,
        name: incident.title,
        status: incident.status,
        impact: mapIncidentImpact(incident.severity),
        created_at: new Date(incident.startedAt).toISOString(),
        updated_at: new Date(incident.startedAt).toISOString(),
        resolved_at: incident.resolvedAt ? new Date(incident.resolvedAt).toISOString() : null,
        shortlink: `${pageUrl}/incident/${incident.id}`,
        incident_updates: incident.lastUpdate
          ? [{
              id: incident.id,
              status: incident.status,
              body: incident.lastUpdate,
              created_at: new Date(incident.startedAt).toISOString(),
              updated_at: new Date(incident.startedAt).toISOString(),
            }]
          : [],
      })),
    scheduled_maintenances: [
      ...data.maintenance.active.map((mw) => ({
        id: mw.id,
        name: mw.title,
        status: "in_progress",
        impact: "maintenance" as const,
        scheduled_for: new Date(mw.scheduledStart).toISOString(),
        scheduled_until: mw.scheduledEnd ? new Date(mw.scheduledEnd).toISOString() : null,
        created_at: new Date(mw.scheduledStart).toISOString(),
        updated_at: mw.actualStart ? new Date(mw.actualStart).toISOString() : new Date(mw.scheduledStart).toISOString(),
      })),
      ...data.maintenance.upcoming.map((mw) => ({
        id: mw.id,
        name: mw.title,
        status: "scheduled",
        impact: "maintenance" as const,
        scheduled_for: new Date(mw.scheduledStart).toISOString(),
        scheduled_until: mw.scheduledEnd ? new Date(mw.scheduledEnd).toISOString() : null,
        created_at: new Date(mw.scheduledStart).toISOString(),
        updated_at: new Date(mw.scheduledStart).toISOString(),
      })),
    ],
  };
}
