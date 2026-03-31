import { type ReactNode, Fragment, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon, Monitor, ChevronDown, Check, Bell, MessageCircle } from "lucide-react";

// --- Types ---

export type PublicStatusMonitorData = {
  id: string;
  name: string;
  currentStatus: string;
  uptimePercent: number;
  avgLatency: number;
  daily: { date: string; uptime: number; totalChecks: number }[];
  responseTimeSeries?: { hour: string; avgLatency: number; checkCount: number }[];
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
  showResponseTimes?: boolean;
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

// --- Main View ---

export function PublicStatusPageView({
  data,
  renderIncidentLink,
  onSubscribe,
  subscribeLoading,
  subscribeSuccess,
  subscribeError,
}: {
  data: PublicStatusPageData;
  renderIncidentLink: (
    incident: PublicStatusIncidentSummary,
    content: ReactNode,
  ) => ReactNode;
  onSubscribe?: (email: string, monitorIds?: string[]) => Promise<void>;
  subscribeLoading?: boolean;
  subscribeSuccess?: boolean;
  subscribeError?: string;
}) {
  const accent = data.brandColor || undefined;
  const [expandedMonitor, setExpandedMonitor] = useState<string | null>(null);

  return (
    <TooltipProvider>
      {/* Brand accent bar */}
      {accent && accent !== "#000000" && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: accent }}
        />
      )}

      <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="animate-fade-in mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-col items-center gap-2">
            {data.logoUrl && <img src={data.logoUrl} alt="" className="h-8" />}
            <h1 className="text-lg font-semibold tracking-tight">{data.name}</h1>
            {data.headerText && (
              <p className="text-sm text-muted-foreground">{data.headerText}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSubscribe && (
              <SubscribeDialog
                monitors={data.monitors}
                onSubscribe={onSubscribe}
                loading={subscribeLoading}
                success={subscribeSuccess}
                error={subscribeError}
              />
            )}
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:support@unstatus.app?subject=Issue Report: ${data.name}`}>
                <MessageCircle className="size-3.5" />
                Report an issue
              </a>
            </Button>
          </div>
        </div>

        {/* Overall status banner */}
        <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <OverallBanner status={data.overallStatus} accent={accent} />
        </div>

        {/* Monitors */}
        <div className="mt-6 flex flex-col gap-3">
          {data.monitors.map((monitor, i) => (
            <div
              key={monitor.id}
              className="animate-fade-in"
              style={{ animationDelay: `${100 + i * 40}ms` }}
            >
              <MonitorCard
                monitor={monitor}
                showResponseTimes={data.showResponseTimes !== false}
                expanded={expandedMonitor === monitor.id}
                onToggle={() =>
                  setExpandedMonitor(
                    expandedMonitor === monitor.id ? null : monitor.id,
                  )
                }
              />
            </div>
          ))}
        </div>

        {/* Incidents */}
        {data.incidents.length > 0 && (
          <div className="animate-fade-in mt-10" style={{ animationDelay: `${100 + data.monitors.length * 40 + 50}ms` }}>
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
        <div className="mt-14 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            {data.footerText && (
              <p className="text-xs text-muted-foreground">{data.footerText}</p>
            )}
            <p className="text-[11px] text-muted-foreground/60">
              Powered by <span className="font-medium">Unstatus</span>
            </p>
          </div>
          <ThemeToggle />
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
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
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
      className={`flex items-center justify-center gap-2.5 rounded-lg border px-5 py-4 ${config.bgClass}`}
      style={accent && accent !== "#000000" ? { borderLeftWidth: 3, borderLeftColor: accent } : undefined}
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

function MonitorCard({
  monitor,
  showResponseTimes,
  expanded,
  onToggle,
}: {
  monitor: PublicStatusMonitorData;
  showResponseTimes: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusColor =
    monitor.currentStatus === "up"
      ? "bg-emerald-500"
      : monitor.currentStatus === "degraded"
        ? "bg-yellow-500"
        : monitor.currentStatus === "down"
          ? "bg-red-500"
          : "bg-muted-foreground";

  const uptimeColor =
    monitor.uptimePercent >= 99.5
      ? "text-emerald-600 dark:text-emerald-400"
      : monitor.uptimePercent >= 95
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const hasChart = showResponseTimes && (monitor.responseTimeSeries?.length ?? 0) > 0;

  return (
    <div className="rounded-lg border bg-card ring-1 ring-foreground/5 transition-all hover:ring-foreground/10">
      {/* Top row */}
      <button
        type="button"
        className="flex w-full items-center justify-between p-4"
        onClick={hasChart ? onToggle : undefined}
      >
        <div className="flex items-center gap-2.5">
          <span className={`size-2 rounded-full ${statusColor}`} />
          <span className="text-sm font-medium">{monitor.name}</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-xs text-muted-foreground">{monitor.avgLatency}ms</span>
          <span className={`text-sm font-semibold tabular-nums ${uptimeColor}`}>
            {monitor.uptimePercent}%
          </span>
          {hasChart && (
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </button>

      {/* Uptime bar */}
      <div className="px-4 pb-3">
        <UptimeBar daily={monitor.daily} />
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>90d ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Expandable chart */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {expanded && monitor.responseTimeSeries && monitor.responseTimeSeries.length > 0 && (
            <div className="border-t px-4 py-4">
              <ResponseTimeChart data={monitor.responseTimeSeries} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const chartConfig = {
  avgLatency: {
    label: "Latency",
    color: "oklch(0.765 0.177 163.22)",
  },
} satisfies ChartConfig;

function ResponseTimeChart({
  data,
}: {
  data: { hour: string; avgLatency: number; checkCount: number }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    hour: new Date(d.hour).getTime(),
  }));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Response time (24h)</span>
        <span className="text-xs text-muted-foreground font-mono">
          avg {Math.round(data.reduce((s, d) => s + d.avgLatency, 0) / data.length)}ms
        </span>
      </div>
      <ChartContainer config={chartConfig} className="aspect-[5/1] w-full">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="latencyGradientPublic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-avgLatency)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-avgLatency)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={50}
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={40}
            tickFormatter={(v) => `${v}ms`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  if (!payload?.[0]?.payload) return "";
                  const d = payload[0].payload;
                  const time = new Date(d.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return `${time} · ${d.checkCount} checks`;
                }}
                formatter={(value) => [`${Math.round(Number(value))}ms`, "Latency"]}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="avgLatency"
            stroke="var(--color-avgLatency)"
            strokeWidth={2}
            fill="url(#latencyGradientPublic)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function UptimeBar({ daily }: { daily: { date: string; uptime: number; totalChecks: number }[] }) {
  return (
    <div className="flex gap-[2px]">
      {daily.map((day) => (
        <Tooltip key={day.date}>
          <TooltipTrigger asChild>
            <div
              className={`h-8 flex-1 rounded-[3px] transition-all hover:opacity-80 hover:scale-y-110 ${barColor(day.uptime, day.totalChecks)}`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">{formatDate(day.date)}</p>
            {day.totalChecks > 0 ? (
              <p className="tabular-nums">{day.uptime.toFixed(2)}% uptime</p>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function SubscribeDialog({
  monitors: _monitors,
  onSubscribe,
  loading,
  success,
  error,
}: {
  monitors: PublicStatusMonitorData[];
  onSubscribe: (email: string, monitorIds?: string[]) => Promise<void>;
  loading?: boolean;
  success?: boolean;
  error?: string;
}) {
  const [emailValue, setEmailValue] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="size-3.5" />
          Get updates
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to updates</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="flex items-center gap-2 text-sm py-2">
            <Check className="size-4 text-emerald-500" />
            <span>Check your email to verify your subscription.</span>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailValue) return;
              await onSubscribe(emailValue);
            }}
          >
            <p className="text-sm text-muted-foreground">
              Get notified by email when incidents are created or resolved.
            </p>
            <Input
              type="email"
              placeholder="your@email.com"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              required
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <Button type="submit" disabled={loading || !emailValue}>
              {loading ? <Spinner className="size-4" /> : "Subscribe"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
      className={`rounded-lg border border-l-[3px] bg-card px-4 py-3 ring-1 ring-foreground/5 transition-all hover:ring-foreground/10 hover:-translate-y-px ${severityBorder}`}
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

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title={`Theme: ${theme}`}
    >
      <Icon className="size-4" />
    </button>
  );
}

// --- Utils ---

function barColor(uptime: number, totalChecks: number): string {
  if (totalChecks === 0) return "bg-muted";
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
