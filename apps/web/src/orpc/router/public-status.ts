import z from "zod";

import { prisma } from "@/lib/prisma";
import { publicProcedure } from "@/orpc/procedures";

type ResolvedPublicPage = {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  logoUrl: string | null;
  brandColor: string | null;
  headerText: string | null;
  footerText: string | null;
};

type MonitorRow = {
  monitorId: string;
  monitorName: string;
  displayName: string | null;
};

type StatsRow = {
  monitorId: string;
  day: string;
  total: bigint;
  up: bigint;
  avg_latency: number;
};

type LatestRow = {
  monitorId: string;
  status: string;
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

async function resolvePublicPage(
  where: { slug: string },
): Promise<ResolvedPublicPage> {
  const page = await prisma.statusPage.findUniqueOrThrow({
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
    },
  });

  if (!page.isPublic) {
    throw new Error("Not found");
  }

  return page;
}

async function getPublicStatusPage(page: ResolvedPublicPage) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);

  const [monitorRows, statsRows, latestRows, incidentRows] = await Promise.all([
    prisma.$queryRawUnsafe<MonitorRow[]>(
      `SELECT spm."monitorId", m.name as "monitorName", spm."displayName"
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
  ]);

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

    const dayKey = row.day instanceof Date
      ? row.day.toISOString().slice(0, 10)
      : String(row.day).slice(0, 10);
    statsByDay.set(dayKey, {
      total: Number(row.total),
      up: Number(row.up),
      latency: row.avg_latency,
    });
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
    const daily: { date: string; uptime: number }[] = [];

    for (let dayOffset = 89; dayOffset >= 0; dayOffset -= 1) {
      const date = new Date(now.getTime() - dayOffset * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const stats = monitorDaily?.get(date);
      const total = stats?.total ?? 0;
      const up = stats?.up ?? 0;

      if (stats) {
        latencySum += stats.latency;
        latencyDays += 1;
      }

      let uptime = total > 0 ? (up / total) * 100 : 100;
      const dayStart = new Date(`${date}T00:00:00Z`).getTime();
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

      daily.push({ date, uptime });
    }

    const uptimePercent =
      daily.length > 0
        ? Math.round(
            (daily.reduce((sum, day) => sum + day.uptime, 0) / daily.length) * 100,
          ) / 100
        : 100;

    return {
      id: monitor.monitorId,
      name: monitor.displayName ?? monitor.monitorName,
      currentStatus: latestByMonitor.get(monitor.monitorId) ?? "unknown",
      uptimePercent,
      avgLatency: latencyDays > 0 ? Math.round(latencySum / latencyDays) : 0,
      daily,
    };
  });

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
  };
}

async function getPublicIncidentPage(
  page: ResolvedPublicPage,
  incidentId: string,
) {
  const incident = await prisma.incident.findFirstOrThrow({
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

export const publicStatusRouter = {
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      const page = await resolvePublicPage({ slug: input.slug });
      return getPublicStatusPage(page);
    }),

  getIncident: publicProcedure
    .input(z.object({ slug: z.string(), incidentId: z.string() }))
    .handler(async ({ input }) => {
      const page = await resolvePublicPage({ slug: input.slug });
      return getPublicIncidentPage(page, input.incidentId);
    }),
};
