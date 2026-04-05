import { ORPCError } from "@orpc/server";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import z from "zod";

import { prisma } from "@/lib/prisma";

type ResolvedPublicPage = {
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

type MonitorRow = {
  monitorId: string;
  monitorName: string;
  displayName: string | null;
  groupName: string | null;
};

type StatsRow = {
  monitorId: string;
  day: string;
  total: bigint;
  up: bigint;
  avg_latency: number | null;
};

type LatestRow = {
  monitorId: string;
  status: string | null;
};

type IncidentRow = {
  id: string;
  monitorId: string;
  title: string;
  status: string;
  severity: string;
  startedAt: Date;
  resolvedAt: Date | null;
  lastMessage: string | null;
};

type HourlyRow = {
  monitorId: string;
  hour: Date;
  avg_latency: number | null;
  check_count: bigint;
};

type DependencyRow = {
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

type CurrentDomainStatusResult = {
  domain: string | null;
  data: Awaited<ReturnType<typeof getPublicStatusPageByDomain>> | null;
};

type CurrentDomainIncidentResult = {
  domain: string | null;
  data: Awaited<ReturnType<typeof getPublicIncidentPageByDomain>> | null;
};

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKeyToLocalMs(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
}

function isMissingMonitorPerfSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("monitor_check_hourly_rollup")
    || message.includes("monitor_check_daily_rollup")
    || message.includes("lastStatus")
    || message.includes("does not exist")
    || message.includes("42P01")
    || message.includes("42703")
  );
}

function getHostnameFromHeaders(headers: Headers) {
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost ?? headers.get("host") ?? "";
  const firstHost = host.split(",")[0]?.trim() ?? "";
  const hostname = firstHost.split(":")[0]?.trim().toLowerCase() ?? "";
  return hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
}

function isCustomDomain(hostname: string) {
  const appDomain = process.env.APP_DOMAIN;
  if (!appDomain || !hostname) return false;

  return (
    hostname !== appDomain &&
    hostname !== `www.${appDomain}` &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1"
  );
}

function isNotFoundError(error: unknown) {
  return error instanceof ORPCError && error.code === "NOT_FOUND";
}

async function resolvePublicPage(
  where: { slug: string } | { customDomain: string },
): Promise<ResolvedPublicPage> {
  const page = await prisma.statusPage.findUnique({
    where,
    select: {
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
    },
  });

  if (!page || !page.isPublic) {
    throw new ORPCError("NOT_FOUND");
  }

  return page;
}

async function getLegacyPublicStatusRows(
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
      `SELECT mc."monitorId", DATE(mc."checkedAt") as day, COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE mc.status = 'up')::bigint as up,
        ROUND(AVG(mc.latency))::float as avg_latency
      FROM monitor_check mc
      JOIN status_page_monitor spm ON spm."monitorId" = mc."monitorId"
      WHERE spm."statusPageId" = $1 AND mc."checkedAt" >= $2
      GROUP BY mc."monitorId", DATE(mc."checkedAt")`,
      page.id,
      ninetyDaysAgo,
    ),
    prisma.$queryRawUnsafe<LatestRow[]>(
      `SELECT DISTINCT ON (mc."monitorId") mc."monitorId", mc.status
      FROM monitor_check mc
      JOIN status_page_monitor spm ON spm."monitorId" = mc."monitorId"
      WHERE spm."statusPageId" = $1
      ORDER BY mc."monitorId", mc."checkedAt" DESC`,
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
          `SELECT mc."monitorId",
            date_trunc('hour', mc."checkedAt") as hour,
            ROUND(AVG(mc.latency))::float as avg_latency,
            COUNT(*)::bigint as check_count
          FROM monitor_check mc
          JOIN status_page_monitor spm ON spm."monitorId" = mc."monitorId"
          WHERE spm."statusPageId" = $1 AND mc."checkedAt" >= $2
          GROUP BY mc."monitorId", date_trunc('hour', mc."checkedAt")
          ORDER BY hour ASC`,
          page.id,
          twentyFourHoursAgo,
        )
      : Promise.resolve([] as HourlyRow[]),
  ]);
}

async function getRollupPublicStatusRows(
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

  let monitorRows: MonitorRow[];
  let statsRows: StatsRow[];
  let latestRows: LatestRow[];
  let incidentRows: IncidentRow[];
  let hourlyRows: HourlyRow[];

  try {
    [monitorRows, statsRows, latestRows, incidentRows, hourlyRows] = await getRollupPublicStatusRows(
      page,
      ninetyDaysAgo,
      twentyFourHoursAgo,
    );
  } catch (error) {
    if (!isMissingMonitorPerfSchema(error)) {
      throw error;
    }

    [monitorRows, statsRows, latestRows, incidentRows, hourlyRows] = await getLegacyPublicStatusRows(
      page,
      ninetyDaysAgo,
      twentyFourHoursAgo,
    );
  }

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
    try {
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
    } catch {
      // Table may not exist yet.
    }
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

      for (const incident of monitorIncidents) {
        const incidentStart = new Date(incident.startedAt).getTime();
        const incidentEnd = incident.resolvedAt
          ? new Date(incident.resolvedAt).getTime()
          : now.getTime();

        if (incidentStart < dayEnd && incidentEnd > dayStart) {
          const cap =
            incident.severity === "critical"
              ? 0
              : incident.severity === "major"
                ? 50
                : 75;
          uptime = Math.min(uptime, cap);
        }
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

export const getPublicStatusPageBySlugServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await getPublicStatusPageBySlug(data.slug);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  });

export const getPublicIncidentPageBySlugServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string(), incidentId: z.string() }))
  .handler(async ({ data }) => {
    try {
      return await getPublicIncidentPageBySlug(data.slug, data.incidentId);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  });

export const getCurrentCustomDomainStatusPageServerFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<CurrentDomainStatusResult> => {
    const domain = getHostnameFromHeaders(getRequestHeaders());
    if (!isCustomDomain(domain)) {
      return { domain: null, data: null };
    }

    try {
      return {
        domain,
        data: await getPublicStatusPageByDomain(domain),
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { domain, data: null };
      }

      throw error;
    }
  });

export const getCurrentCustomDomainIncidentPageServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ incidentId: z.string() }))
  .handler(async ({ data }): Promise<CurrentDomainIncidentResult> => {
    const domain = getHostnameFromHeaders(getRequestHeaders());
    if (!isCustomDomain(domain)) {
      return { domain: null, data: null };
    }

    try {
      return {
        domain,
        data: await getPublicIncidentPageByDomain(domain, data.incidentId),
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { domain, data: null };
      }

      throw error;
    }
  });
