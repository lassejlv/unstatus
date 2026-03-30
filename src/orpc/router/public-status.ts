import z from "zod";

import {
  customDomainsFeatureEnabled,
  getRequestHostname,
  isPlatformHost,
  normalizeHostname,
} from "@/lib/hostnames";
import { prisma } from "@/lib/prisma";
import { publicProcedure } from "@/orpc/procedures";

export type ResolvedPublicPage = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  isPublic: boolean;
  logoUrl: string | null;
  brandColor: string | null;
  headerText: string | null;
  footerText: string | null;
};

export type RequestHostInfo =
  | {
      mode: "platform";
      host: string | null;
    }
  | {
      mode: "custom";
      host: string;
      pageId: string;
      slug: string;
    }
  | {
      mode: "unknown";
      host: string;
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

async function findPublicPage(where: {
  slug?: string;
  customDomain?: string;
}): Promise<ResolvedPublicPage | null> {
  return prisma.statusPage.findFirst({
    where: {
      ...where,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: true,
      isPublic: true,
      logoUrl: true,
      brandColor: true,
      headerText: true,
      footerText: true,
    },
  });
}

export async function findPublicPageBySlug(slug: string) {
  return findPublicPage({ slug });
}

export async function findPublicPageByHost(host: string) {
  const normalizedHost = normalizeHostname(host);
  if (!normalizedHost) return null;
  return findPublicPage({ customDomain: normalizedHost });
}

export async function resolvePublicPageBySlug(
  slug: string,
): Promise<ResolvedPublicPage> {
  const page = await findPublicPageBySlug(slug);

  if (!page) {
    throw new Error("Not found");
  }

  return page;
}

export async function resolvePublicPageByHost(
  host: string,
): Promise<ResolvedPublicPage> {
  const page = await findPublicPageByHost(host);

  if (!page) {
    throw new Error("Not found");
  }

  return page;
}

export async function resolveRequestHostInfo(
  headers: Headers,
): Promise<RequestHostInfo> {
  const host = getRequestHostname(headers);

  if (!host) {
    return { mode: "platform", host: null };
  }

  if (isPlatformHost(host)) {
    return { mode: "platform", host };
  }

  const page = await findPublicPageByHost(host);
  if (page) {
    return {
      mode: "custom",
      host,
      pageId: page.id,
      slug: page.slug,
    };
  }

  if (customDomainsFeatureEnabled()) {
    return { mode: "unknown", host };
  }

  return { mode: "platform", host };
}

export async function getPublicStatusPage(page: ResolvedPublicPage) {
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

    statsByDay.set(row.day, {
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
            (daily.reduce((sum, day) => sum + day.uptime, 0) / daily.length) *
              100,
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
    customDomain: page.customDomain,
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

export async function getPublicIncidentPage(
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
    pageCustomDomain: page.customDomain,
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
  getRequestHostInfo: publicProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      return resolveRequestHostInfo(context.headers);
    }),

  getCurrentHostPage: publicProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      const hostInfo = await resolveRequestHostInfo(context.headers);
      if (hostInfo.mode !== "custom") {
        return null;
      }

      const page = await resolvePublicPageByHost(hostInfo.host);
      return getPublicStatusPage(page);
    }),

  getCurrentHostIncident: publicProcedure
    .input(z.object({ incidentId: z.string() }))
    .handler(async ({ input, context }) => {
      const hostInfo = await resolveRequestHostInfo(context.headers);
      if (hostInfo.mode !== "custom") {
        return null;
      }

      const page = await resolvePublicPageByHost(hostInfo.host);
      return getPublicIncidentPage(page, input.incidentId);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      const page = await resolvePublicPageBySlug(input.slug);
      return getPublicStatusPage(page);
    }),

  getByHost: publicProcedure
    .input(z.object({ host: z.string() }))
    .handler(async ({ input }) => {
      const page = await resolvePublicPageByHost(input.host);
      return getPublicStatusPage(page);
    }),

  getIncident: publicProcedure
    .input(z.object({ slug: z.string(), incidentId: z.string() }))
    .handler(async ({ input }) => {
      const page = await resolvePublicPageBySlug(input.slug);
      return getPublicIncidentPage(page, input.incidentId);
    }),

  getIncidentByHost: publicProcedure
    .input(z.object({ host: z.string(), incidentId: z.string() }))
    .handler(async ({ input }) => {
      const page = await resolvePublicPageByHost(input.host);
      return getPublicIncidentPage(page, input.incidentId);
    }),
};
