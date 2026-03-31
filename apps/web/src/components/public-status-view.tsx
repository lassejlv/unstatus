import type { ReactNode } from "react";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

export type PublicStatusMonitorData = {
  id: string;
  name: string;
  currentStatus: string;
  uptimePercent: number;
  avgLatency: number;
  daily: { date: string; uptime: number }[];
};

export type PublicStatusIncidentSummary = {
  id: string;
  title: string;
  status: string;
  severity: string;
  startedAt: string | Date;
  resolvedAt: string | Date | null;
  lastUpdate: string | null;
};

export type PublicStatusPageData = {
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  headerText: string | null;
  footerText: string | null;
  overallStatus: string;
  monitors: PublicStatusMonitorData[];
  incidents: PublicStatusIncidentSummary[];
};

export type PublicIncidentData = {
  pageName: string;
  pageSlug: string;
  id: string;
  title: string;
  status: string;
  severity: string;
  startedAt: string | Date;
  resolvedAt: string | Date | null;
  monitorName: string;
  updates: {
    id: string;
    status: string;
    message: string;
    createdAt: string | Date;
  }[];
};

export function CenteredMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-5" />
    </div>
  );
}

export function PublicStatusPageView({
  data,
  renderIncidentLink,
}: {
  data: PublicStatusPageData;
  renderIncidentLink: (
    incident: PublicStatusIncidentSummary,
    content: ReactNode,
  ) => ReactNode;
}) {
  const accent = data.brandColor || undefined;

  return (
    <TooltipProvider>
      {/* Brand accent bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accent ?? "var(--primary)" }}
      />

      <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          {data.logoUrl && <img src={data.logoUrl} alt="" className="h-8" />}
          <h1 className="text-lg font-semibold tracking-tight">{data.name}</h1>
          {data.headerText && (
            <p className="text-sm text-muted-foreground">{data.headerText}</p>
          )}
        </div>

        {/* Overall status banner */}
        <OverallBanner status={data.overallStatus} accent={accent} />

        {/* Monitors */}
        <div className="mt-6 flex flex-col gap-3">
          {data.monitors.map((monitor) => (
            <MonitorCard key={monitor.id} monitor={monitor} />
          ))}
        </div>

        {/* Incidents */}
        {data.incidents.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent incidents
            </h2>
            <div className="flex flex-col gap-2">
              {[...data.incidents]
                .sort((a, b) => (a.resolvedAt ? 1 : 0) - (b.resolvedAt ? 1 : 0))
                .map((incident) => (
                  <Fragment key={incident.id}>
                    {renderIncidentLink(incident, <IncidentRow incident={incident} />)}
                  </Fragment>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-14 flex flex-col items-center gap-1 text-center">
          {data.footerText && (
            <p className="text-xs text-muted-foreground">{data.footerText}</p>
          )}
          <p className="text-[11px] text-muted-foreground/60">
            Powered by <span className="font-medium">Unstatus</span>
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function PublicIncidentPageView({
  data,
  backLink,
}: {
  data: PublicIncidentData;
  backLink: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      {backLink}

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">{data.title}</h1>
          <Badge variant={data.status === "resolved" ? "secondary" : "destructive"}>
            {data.status}
          </Badge>
          <Badge variant="outline">{data.severity}</Badge>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {data.monitorName} · Started {new Date(data.startedAt).toLocaleString()}
          {data.resolvedAt &&
            ` · Resolved ${new Date(data.resolvedAt).toLocaleString()}`}
        </p>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col gap-0">
        {data.updates.map((update, index) => {
          const isLatest = index === 0 && data.status !== "resolved";
          return (
            <div key={update.id} className="relative flex gap-4 pb-8 last:pb-0">
              {index < data.updates.length - 1 && (
                <div className="absolute top-5 bottom-0 left-[9px] w-px bg-border" />
              )}
              <div className="relative z-10 mt-1 flex items-center justify-center">
                <div className={`size-[19px] rounded-full border-2 ${dotColor(update.status)}`} />
                {isLatest && (
                  <div className={`absolute size-[19px] rounded-full ${dotGlowColor(update.status)} animate-ping`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {update.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(new Date(update.createdAt))}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed">{update.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Components ---

const STATUS_CONFIG = {
  operational: {
    label: "All Systems Operational",
    dotClass: "bg-emerald-500",
    bgClass: "border-emerald-500/20 bg-emerald-500/5",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  degraded: {
    label: "Degraded Performance",
    dotClass: "bg-yellow-500",
    bgClass: "border-yellow-500/20 bg-yellow-500/5",
    textClass: "text-yellow-600 dark:text-yellow-400",
  },
  major_outage: {
    label: "Major Outage",
    dotClass: "bg-red-500",
    bgClass: "border-red-500/20 bg-red-500/5",
    textClass: "text-red-600 dark:text-red-400",
  },
  unknown: {
    label: "No Data",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
  },
} as const;

function OverallBanner({ status, accent }: { status: string; accent?: string }) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;

  return (
    <div
      className={`flex items-center justify-center gap-2.5 rounded-lg border px-4 py-3 ${config.bgClass}`}
      style={accent ? { borderLeftWidth: 3, borderLeftColor: accent } : undefined}
    >
      <span className="relative flex size-2.5">
        <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${config.dotClass}`} />
        <span className={`relative inline-flex size-2.5 rounded-full ${config.dotClass}`} />
      </span>
      <span className={`text-sm font-medium ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  );
}

function MonitorCard({ monitor }: { monitor: PublicStatusMonitorData }) {
  const statusColor =
    monitor.currentStatus === "up"
      ? "bg-emerald-500"
      : monitor.currentStatus === "degraded"
        ? "bg-yellow-500"
        : monitor.currentStatus === "down"
          ? "bg-red-500"
          : "bg-muted-foreground";

  const glowColor =
    monitor.currentStatus === "up"
      ? "shadow-emerald-500/30"
      : monitor.currentStatus === "degraded"
        ? "shadow-yellow-500/30"
        : monitor.currentStatus === "down"
          ? "shadow-red-500/30"
          : "";

  return (
    <div className="rounded-lg border p-4">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`size-2 rounded-full shadow-sm ${statusColor} ${glowColor}`} />
          <span className="text-sm font-medium">{monitor.name}</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-xs text-muted-foreground">{monitor.avgLatency}ms</span>
          <span className="text-sm font-semibold tabular-nums">
            {monitor.uptimePercent}%
          </span>
        </div>
      </div>

      {/* Uptime bar */}
      <div className="mt-3">
        <UptimeBar daily={monitor.daily} />
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>90d ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

function UptimeBar({ daily }: { daily: { date: string; uptime: number }[] }) {
  return (
    <div className="flex gap-[2px]">
      {daily.map((day) => (
        <Tooltip key={day.date}>
          <TooltipTrigger asChild>
            <div
              className={`h-9 flex-1 rounded-sm transition-all hover:opacity-80 hover:scale-y-110 ${barColor(day.uptime)}`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">{formatDate(day.date)}</p>
            <p className="tabular-nums">{day.uptime.toFixed(2)}% uptime</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function IncidentRow({ incident }: { incident: PublicStatusIncidentSummary }) {
  const severityBorder =
    incident.severity === "critical"
      ? "border-l-red-500"
      : incident.severity === "major"
        ? "border-l-yellow-500"
        : "border-l-muted-foreground";

  return (
    <div
      className={`rounded-lg border border-l-[3px] px-4 py-3 transition-all hover:bg-accent/50 hover:-translate-y-px ${severityBorder}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{incident.title}</span>
          <Badge
            variant={
              incident.severity === "critical"
                ? "destructive"
                : incident.severity === "major"
                  ? "secondary"
                  : "outline"
            }
          >
            {incident.severity}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {timeAgo(new Date(incident.startedAt))}
          </span>
          <Badge variant={incident.resolvedAt ? "outline" : "default"}>
            {incident.status}
          </Badge>
        </div>
      </div>
      {incident.lastUpdate && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
          {incident.lastUpdate}
        </p>
      )}
    </div>
  );
}

// --- Utils ---

function barColor(uptime: number): string {
  if (uptime >= 99.5) return "bg-emerald-500";
  if (uptime >= 95) return "bg-emerald-400";
  if (uptime >= 90) return "bg-yellow-400";
  if (uptime >= 50) return "bg-orange-400";
  if (uptime > 0) return "bg-red-500";
  return "bg-muted";
}

function dotColor(status: string): string {
  switch (status) {
    case "resolved":
      return "border-emerald-500 bg-emerald-500";
    case "monitoring":
      return "border-blue-500 bg-blue-500";
    case "identified":
      return "border-yellow-500 bg-yellow-500";
    default:
      return "border-red-500 bg-red-500";
  }
}

function dotGlowColor(status: string): string {
  switch (status) {
    case "monitoring":
      return "bg-blue-500/40";
    case "identified":
      return "bg-yellow-500/40";
    default:
      return "bg-red-500/40";
  }
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
