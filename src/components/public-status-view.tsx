import type { ReactNode } from "react";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  customDomain?: string | null;
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
  pageCustomDomain?: string | null;
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
      <p className="text-sm text-muted-foreground">{message}</p>
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
  return (
    <TooltipProvider>
      <div className="mx-auto min-h-screen max-w-3xl px-4 py-12">
        <div className="mb-8 flex flex-col items-center gap-3">
          {data.logoUrl && <img src={data.logoUrl} alt="" className="h-10" />}
          <h1 className="text-xl font-semibold">{data.name}</h1>
          {data.headerText && (
            <p className="text-sm text-muted-foreground">{data.headerText}</p>
          )}
        </div>

        <OverallBanner status={data.overallStatus} />

        <div className="mt-8 flex flex-col gap-4">
          {data.monitors.map((monitor) => (
            <MonitorCard key={monitor.id} monitor={monitor} />
          ))}
        </div>

        {data.incidents.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-sm font-medium">Recent incidents</h2>
            <div className="flex flex-col gap-3">
              {[...data.incidents]
                .sort((a, b) => (a.resolvedAt ? 1 : 0) - (b.resolvedAt ? 1 : 0))
                .map((incident) => {
                  const content = <IncidentRow incident={incident} />;
                  return (
                    <Fragment key={incident.id}>
                      {renderIncidentLink(incident, content)}
                    </Fragment>
                  );
                })}
            </div>
          </div>
        )}

        {data.footerText && (
          <p className="mt-12 text-center text-xs text-muted-foreground">
            {data.footerText}
          </p>
        )}
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
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      {backLink}

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{data.title}</h1>
          <Badge variant={data.status === "resolved" ? "secondary" : "destructive"}>
            {data.status}
          </Badge>
          <Badge variant="outline">{data.severity}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {data.monitorName} · Started {new Date(data.startedAt).toLocaleString()}
          {data.resolvedAt &&
            ` · Resolved ${new Date(data.resolvedAt).toLocaleString()}`}
        </p>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col gap-0">
        {data.updates.map((update, index) => (
          <div key={update.id} className="relative flex gap-3 pb-6 last:pb-0">
            {index < data.updates.length - 1 && (
              <div className="absolute top-4 bottom-0 left-[7px] w-px bg-border" />
            )}
            <div
              className={`relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${dotColor(update.status)}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  {update.status}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(update.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs">{update.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  operational: {
    label: "All Systems Operational",
    class: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  },
  degraded: {
    label: "Degraded Performance",
    class: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
  },
  major_outage: {
    label: "Major Outage",
    class: "border-red-500/20 bg-red-500/10 text-red-600",
  },
  unknown: { label: "No Data", class: "bg-muted text-muted-foreground" },
} as const;

function OverallBanner({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-center text-sm font-medium ${config.class}`}
    >
      {config.label}
    </div>
  );
}

function MonitorCard({ monitor }: { monitor: PublicStatusMonitorData }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <StatusDot status={monitor.currentStatus} />
          <CardTitle className="text-sm font-medium">{monitor.name}</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          {monitor.uptimePercent}% uptime
        </span>
      </CardHeader>
      <CardContent>
        <UptimeBar daily={monitor.daily} />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>90 days ago</span>
          <span>{monitor.avgLatency}ms avg</span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "up"
      ? "bg-emerald-500"
      : status === "degraded"
        ? "bg-yellow-500"
        : status === "down"
          ? "bg-red-500"
          : "bg-gray-400";

  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function UptimeBar({ daily }: { daily: { date: string; uptime: number }[] }) {
  return (
    <div className="flex gap-[2px]">
      {daily.map((day) => (
        <Tooltip key={day.date}>
          <TooltipTrigger asChild>
            <div
              className={`h-8 flex-1 rounded-sm transition-opacity hover:opacity-80 ${barColor(day.uptime)}`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">{formatDate(day.date)}</p>
            <p>{day.uptime.toFixed(1)}% uptime</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function IncidentRow({ incident }: { incident: PublicStatusIncidentSummary }) {
  const severityColor =
    incident.severity === "critical"
      ? "destructive"
      : incident.severity === "major"
        ? "secondary"
        : "outline";

  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{incident.title}</span>
          <Badge variant={severityColor as "destructive" | "secondary" | "outline"}>
            {incident.severity}
          </Badge>
        </div>
        <Badge variant={incident.resolvedAt ? "outline" : "default"}>
          {incident.status}
        </Badge>
      </div>
      {incident.lastUpdate && (
        <p className="mt-1 text-xs text-muted-foreground">
          {incident.lastUpdate}
        </p>
      )}
    </div>
  );
}

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

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
