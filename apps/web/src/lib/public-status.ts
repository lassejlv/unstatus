import { ORPCError } from "@orpc/server";

import { prisma } from "@/lib/prisma";
import {
  type ResolvedPublicPage,
  type MonitorRow,
  type StatsRow,
  type LatestRow,
  type IncidentRow,
  type HourlyRow,
  type DependencyRow,
  getLocalDateKey,
  parseDateKeyToLocalMs,
} from "@/types";

const STATUS_PAGE_SELECT = {
  id: true,
  name: true,
  slug: true,
  isPublic: true,
  logoUrl: true,
  brandColor: true,
  headerText: true,
  footerText: true,
  showResponseTimes: true,
  showDependencies: true,
  customCss: true,
  customJs: true,
} as const;

async function resolvePublicPage(
  where: { slug: string } | { customDomain: string },
): Promise<ResolvedPublicPage> {
  let page = await prisma.statusPage.findUnique({
    where,
    select: STATUS_PAGE_SELECT,
  });

  // Fallback: findFirst in case the unique index lookup fails with the adapter
  if (!page && "customDomain" in where) {
    page = await prisma.statusPage.findFirst({
      where: { customDomain: where.customDomain },
      select: STATUS_PAGE_SELECT,
    });
  }

  if (!page || !page.isPublic) {
    throw new ORPCError("NOT_FOUND");
  }

  return page;
}

async function getPublicStatusRows(
  page: ResolvedPublicPage,
  ninetyDaysAgo: Date,
  twentyFourHoursAgo: Date,
) {
  return Promise.all([
    prisma.$queryRawUnsafe<MonitorRow[]>(
      `SELECT spm."monitorId", m.name as "monitorName", spm."displayName", spm."groupName"
      FROM status_page_monitor spm
      JOIN monitor m ON m.id = spm."monitorId"
      WHERE spm."statusPageId" = $1
      ORDER BY spm."sortOrder" ASC`,
      page.id,
    ),
    prisma.$queryRawUnsafe<StatsRow[]>(
      `SELECT dr."monitorId",
        DATE(dr."bucketDate") as day,
        SUM(dr."totalChecks")::bigint as total,
        SUM(dr."upChecks")::bigint as up,
        ROUND(SUM(dr."latencySum")::numeric / NULLIF(SUM(dr."totalChecks"), 0))::float as avg_latency
      FROM monitor_check_daily_rollup dr
      JOIN status_page_monitor spm ON spm."monitorId" = dr."monitorId"
      WHERE spm."statusPageId" = $1 AND dr."bucketDate" >= $2
      GROUP BY dr."monitorId", DATE(dr."bucketDate")`,
      page.id,
      ninetyDaysAgo,
    ),
    prisma.$queryRawUnsafe<LatestRow[]>(
      `SELECT m.id as "monitorId", m."lastStatus" as status
      FROM monitor m
      JOIN status_page_monitor spm ON spm."monitorId" = m.id
      WHERE spm."statusPageId" = $1`,
      page.id,
    ),
    prisma.$queryRawUnsafe<IncidentRow[]>(
      `SELECT i.id, i."monitorId", i.title, i.status, i.severity,
        i."startedAt", i."resolvedAt",
        (SELECT iu.message FROM incident_update iu WHERE iu."incidentId" = i.id ORDER BY iu."createdAt" DESC LIMIT 1) as "lastMessage"
      FROM incident i
      JOIN status_page_monitor spm ON spm."monitorId" = i."monitorId"
      WHERE spm."statusPageId" = $1 AND i."createdAt" >= $2
      ORDER BY i."createdAt" DESC
      LIMIT 10`,
      page.id,
      ninetyDaysAgo,
    ),
    page.showResponseTimes
      ? prisma.$queryRawUnsafe<HourlyRow[]>(
          `SELECT hr."monitorId",
            hr."bucketStart" as hour,
            ROUND(SUM(hr."latencySum")::numeric / NULLIF(SUM(hr."totalChecks"), 0))::float as avg_latency,
            SUM(hr."totalChecks")::bigint as check_count
          FROM monitor_check_hourly_rollup hr
          JOIN status_page_monitor spm ON spm."monitorId" = hr."monitorId"
          WHERE spm."statusPageId" = $1 AND hr."bucketStart" >= $2
          GROUP BY hr."monitorId", hr."bucketStart"
          ORDER BY hour ASC`,
          page.id,
          twentyFourHoursAgo,
        )
      : Promise.resolve([] as HourlyRow[]),
  ]);
}

async function getPublicStatusPage(page: ResolvedPublicPage) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3_600_000);

  const [monitorRows, statsRows, latestRows, incidentRows, hourlyRows] = await getPublicStatusRows(
    page,
    ninetyDaysAgo,
    twentyFourHoursAgo,
  );

  const dailyByMonitor = new Map<
    string,
    Map<string, { total: number; up: number; latency: number }>
  >();
  for (const row of statsRows) {
    let statsByDay = dailyByMonitor.get(row.monitorId);
    if (!statsByDay) {
      statsByDay = new Map();
      dailyByMonitor.set(row.monitorId, statsByDay);
    }

    const dayKey = getLocalDateKey(new Date(String(row.day)));
    statsByDay.set(dayKey, {
      total: Number(row.total),
      up: Number(row.up),
      latency: row.avg_latency ?? 0,
    });
  }

  const hourlyByMonitor = new Map<string, { hour: string; avgLatency: number; checkCount: number }[]>();
  for (const row of hourlyRows) {
    let series = hourlyByMonitor.get(row.monitorId);
    if (!series) {
      series = [];
      hourlyByMonitor.set(row.monitorId, series);
    }
    series.push({
      hour: new Date(row.hour).toISOString(),
      avgLatency: row.avg_latency ?? 0,
      checkCount: Number(row.check_count),
    });
  }

  let dependencyRows: DependencyRow[] = [];
  if (page.showDependencies) {
    dependencyRows = await prisma.$queryRawUnsafe<DependencyRow[]>(
      `SELECT
        md."monitorId",
        es.id as "serviceId",
        es.name as "serviceName",
        es.slug as "serviceSlug",
        es."logoUrl" as "serviceLogoUrl",
        es."currentStatus" as "serviceStatus",
        es."statusPageUrl" as "serviceStatusPageUrl",
        es."lastFetchedAt" as "serviceLastFetchedAt",
        esc.name as "componentName",
        esc."currentStatus" as "componentStatus"
      FROM monitor_dependency md
      JOIN external_service es ON es.id = md."externalServiceId"
      LEFT JOIN external_service_component esc ON esc.id = md."externalComponentId"
      JOIN status_page_monitor spm ON spm."monitorId" = md."monitorId"
      WHERE spm."statusPageId" = $1`,
      page.id,
    );
  }

  const depsByMonitor = new Map<string, DependencyRow[]>();
  for (const row of dependencyRows) {
    let deps = depsByMonitor.get(row.monitorId);
    if (!deps) {
      deps = [];
      depsByMonitor.set(row.monitorId, deps);
    }
    deps.push(row);
  }

  const latestByMonitor = new Map(
    latestRows.map((row) => [row.monitorId, row.status]),
  );

  const monitors = monitorRows.map((monitor) => {
    const monitorDaily = dailyByMonitor.get(monitor.monitorId);
    const monitorIncidents = incidentRows.filter(
      (incident) => incident.monitorId === monitor.monitorId,
    );

    let latencySum = 0;
    let latencyDays = 0;
    const daily: { date: string; uptime: number; totalChecks: number }[] = [];

    for (let dayOffset = 89; dayOffset >= 0; dayOffset -= 1) {
      const date = getLocalDateKey(new Date(now.getTime() - dayOffset * 86_400_000));
      const stats = monitorDaily?.get(date);
      const total = stats?.total ?? 0;
      const up = stats?.up ?? 0;

      if (stats) {
        latencySum += stats.latency;
        latencyDays += 1;
      }

      let uptime = total > 0 ? (up / total) * 100 : 100;
      const dayStart = parseDateKeyToLocalMs(date);
      const dayEnd = dayStart + 86_400_000;

      // Time-based incident impact: weight incident duration by severity
      // and subtract proportional downtime from the day's uptime.
      // Matches industry standard (Statuspage, UptimeRobot, BetterStack).
      let incidentDowntimeMs = 0;
      for (const incident of monitorIncidents) {
        const incidentStart = new Date(incident.startedAt).getTime();
        const incidentEnd = incident.resolvedAt
          ? new Date(incident.resolvedAt).getTime()
          : now.getTime();

        const overlapStart = Math.max(incidentStart, dayStart);
        const overlapEnd = Math.min(incidentEnd, dayEnd);
        if (overlapEnd <= overlapStart) continue;

        const weight =
          incident.severity === "critical"
            ? 1.0
            : incident.severity === "major"
              ? 0.5
              : incident.severity === "minor"
                ? 0.1
                : incident.severity === "degraded"
                  ? 0.3
                  : incident.severity === "maintenance"
                    ? 0
                    : 0.3;

        incidentDowntimeMs += (overlapEnd - overlapStart) * weight;
      }

      if (incidentDowntimeMs > 0) {
        const incidentUptime = Math.max(
          0,
          ((86_400_000 - incidentDowntimeMs) / 86_400_000) * 100,
        );
        uptime = Math.min(uptime, incidentUptime);
      }

      daily.push({ date, uptime, totalChecks: total });
    }

    const daysWithData = daily.filter((day) => day.totalChecks > 0);
    const uptimePercent =
      daysWithData.length > 0
        ? Math.round(
            (daysWithData.reduce((sum, day) => sum + day.uptime, 0) / daysWithData.length) * 100,
          ) / 100
        : 100;

    const monitorDeps = depsByMonitor.get(monitor.monitorId);

    return {
      id: monitor.monitorId,
      name: monitor.displayName ?? monitor.monitorName,
      groupName: monitor.groupName,
      currentStatus: latestByMonitor.get(monitor.monitorId) ?? "unknown",
      uptimePercent,
      avgLatency: latencyDays > 0 ? Math.round(latencySum / latencyDays) : 0,
      daily,
      responseTimeSeries: hourlyByMonitor.get(monitor.monitorId) ?? [],
      dependencies: monitorDeps?.map((dependency) => ({
        serviceId: dependency.serviceId,
        serviceName: dependency.serviceName,
        serviceSlug: dependency.serviceSlug,
        serviceLogoUrl: dependency.serviceLogoUrl,
        serviceStatus: dependency.serviceStatus ?? "unknown",
        serviceStatusPageUrl: dependency.serviceStatusPageUrl,
        serviceLastFetchedAt: dependency.serviceLastFetchedAt,
        componentName: dependency.componentName,
        componentStatus: dependency.componentStatus,
      })),
    };
  });

  const monitorIds = monitorRows.map((monitor) => monitor.monitorId);
  const maintenanceWindows = monitorIds.length > 0
    ? await prisma.maintenanceWindow.findMany({
        where: {
          status: { in: ["scheduled", "in_progress"] },
          monitors: { some: { monitorId: { in: monitorIds } } },
        },
        include: {
          monitors: {
            include: { monitor: { select: { id: true, name: true } } },
          },
        },
        orderBy: { scheduledStart: "asc" },
      })
    : [];

  const activeMaintenance = maintenanceWindows.filter((window) => window.status === "in_progress");
  const upcomingMaintenance = maintenanceWindows.filter((window) => window.status === "scheduled");

  const activeIncidents = incidentRows.filter(
    (incident) => incident.status !== "resolved",
  );
  const hasCritical = activeIncidents.some(
    (incident) => incident.severity === "critical",
  );
  const hasMajor = activeIncidents.some(
    (incident) => incident.severity === "major",
  );
  const allCurrentStatuses = monitors.map((monitor) => monitor.currentStatus);

  const overallStatus =
    hasCritical || allCurrentStatuses.some((status) => status === "down")
      ? "major_outage"
      : hasMajor || allCurrentStatuses.some((status) => status === "degraded")
        ? "degraded"
        : activeIncidents.length > 0
          ? "degraded"
          : activeMaintenance.length > 0
            ? "maintenance"
            : allCurrentStatuses.every((status) => status === "up")
              ? "operational"
              : "unknown";

  return {
    name: page.name,
    slug: page.slug,
    logoUrl: page.logoUrl,
    brandColor: page.brandColor,
    headerText: page.headerText,
    footerText: page.footerText,
    showResponseTimes: page.showResponseTimes,
    showDependencies: page.showDependencies,
    customCss: page.customCss,
    customJs: page.customJs,
    overallStatus,
    monitors,
    incidents: incidentRows.map((incident) => ({
      id: incident.id,
      title: incident.title,
      status: incident.status,
      severity: incident.severity,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      lastUpdate: incident.lastMessage,
    })),
    maintenance: {
      active: activeMaintenance.map((window) => ({
        id: window.id,
        title: window.title,
        description: window.description,
        scheduledStart: window.scheduledStart,
        scheduledEnd: window.scheduledEnd,
        actualStart: window.actualStart,
        monitorNames: window.monitors.map((monitor) => monitor.monitor.name),
      })),
      upcoming: upcomingMaintenance.map((window) => ({
        id: window.id,
        title: window.title,
        description: window.description,
        scheduledStart: window.scheduledStart,
        scheduledEnd: window.scheduledEnd,
        monitorNames: window.monitors.map((monitor) => monitor.monitor.name),
      })),
    },
  };
}

async function getPublicIncidentPage(
  page: ResolvedPublicPage,
  incidentId: string,
) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      monitor: {
        statusPageMonitors: {
          some: { statusPageId: page.id },
        },
      },
    },
    include: {
      monitor: { select: { name: true } },
      updates: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!incident) {
    throw new ORPCError("NOT_FOUND");
  }

  return {
    pageName: page.name,
    pageSlug: page.slug,
    id: incident.id,
    title: incident.title,
    status: incident.status,
    severity: incident.severity,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    monitorName: incident.monitor.name,
    updates: incident.updates.map((update) => ({
      id: update.id,
      status: update.status,
      message: update.message,
      createdAt: update.createdAt,
    })),
  };
}

export async function getPublicStatusPageBySlug(slug: string) {
  const page = await resolvePublicPage({ slug });
  return getPublicStatusPage(page);
}

export async function getPublicStatusPageByDomain(domain: string) {
  const page = await resolvePublicPage({ customDomain: domain });
  return getPublicStatusPage(page);
}

export async function getPublicIncidentPageBySlug(slug: string, incidentId: string) {
  const page = await resolvePublicPage({ slug });
  return getPublicIncidentPage(page, incidentId);
}

export async function getPublicIncidentPageByDomain(domain: string, incidentId: string) {
  const page = await resolvePublicPage({ customDomain: domain });
  return getPublicIncidentPage(page, incidentId);
}
