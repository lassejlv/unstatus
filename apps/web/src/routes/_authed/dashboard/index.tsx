import { createFileRoute } from "@tanstack/react-router";
import { skipToken, useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingChecklist } from "./-onboarding-checklist";
import { useState } from "react";
import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, RefreshCw } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusOrb } from "@/components/ui/status-orb";
import { AnimatedNumber, formatters } from "@/components/ui/animated-number";
import { Sparkline, sparklineColors } from "@/components/ui/sparkline";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { useLivePolling, formatRelativeTime } from "@/hooks/use-live-polling";
import { fadeUp } from "@/lib/motion";

export const Route = createFileRoute("/_authed/dashboard/")({
  component: DashboardIndex,
});

const TIME_RANGES = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
] as const;

function DashboardIndex() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const [hours, setHours] = useState(24);

  const overviewQuery = orpc.monitors.overview.queryOptions({
    input: orgId ? { organizationId: orgId, hours } : skipToken,
  });
  const pagesQuery = orpc.statusPages.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const incidentsQuery = orpc.incidents.listByOrg.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const notificationsQuery = orpc.notifications.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery(overviewQuery);
  const { data: pages, isLoading: pagesLoading } = useQuery(pagesQuery);
  const { data: incidents, isLoading: incidentsLoading } = useQuery(incidentsQuery);
  const { data: notifications, isLoading: notificationsLoading } = useQuery(notificationsQuery);

  const dataReady = !overviewLoading && !pagesLoading && !notificationsLoading;
  const { showOnboarding, steps: onboardingSteps, completedCount, dismiss } = useOnboarding({
    orgId,
    monitorCount: overview?.monitors?.length ?? 0,
    statusPageCount: pages?.length ?? 0,
    notificationCount: (notifications as Array<{ id: string }> | undefined)?.length ?? 0,
  });

  // Live polling for real-time feel - must be before any early returns
  const { isRefreshing, secondsSinceRefresh, refresh, isPolling } = useLivePolling({
    interval: 30000,
    enabled: !!orgId && !overviewLoading,
    queryKeys: [
      ["monitors", "overview", { organizationId: orgId, hours }],
      ["incidents", "listByOrg", { organizationId: orgId }],
    ],
  });

  if (overviewLoading || pagesLoading || incidentsLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-6 w-56" />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 md:gap-8">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        </div>
        <Skeleton className="h-52 w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const monitors = overview?.monitors ?? [];
  const active = monitors.filter((m) => m.active).length;
  const paused = monitors.filter((m) => !m.active).length;
  const downCount = monitors.filter((m) => m.currentStatus === "down").length;
  const openIncidents = incidents?.filter((i) => i.status !== "resolved") ?? [];

  const overallStatus =
    downCount > 0
      ? "down"
      : openIncidents.length > 0
        ? "degraded"
        : "up";

  const monitorsWithLatency = monitors.filter((m) => m.avgLatency24h !== null);
  const avgLatencyAll = monitorsWithLatency.length > 0
    ? Math.round(monitorsWithLatency.reduce((s, m) => s + (m.avgLatency24h ?? 0), 0) / monitorsWithLatency.length)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 sm:gap-8">
      {/* Status + key metrics */}
      <motion.div {...fadeUp(0)} className="flex flex-col gap-5 sm:gap-6">
        {/* Hero status section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StatusOrb status={overallStatus} size="default" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-base sm:text-lg">
                {downCount > 0
                  ? `${downCount} monitor${downCount > 1 ? "s" : ""} down`
                  : openIncidents.length > 0
                    ? `${openIncidents.length} open incident${openIncidents.length > 1 ? "s" : ""}`
                    : "All systems operational"}
              </span>
              <span className="text-xs text-muted-foreground">
                {isPolling ? (
                  <>Updated {formatRelativeTime(secondsSinceRefresh)}</>
                ) : (
                  "Polling paused"
                )}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 md:gap-6">
          <MetricCard
            value={overview?.uptimePercent ?? 0}
            format={formatters.percentPrecise}
            label="30-day uptime"
            accent={
              overview?.uptimePercent != null
                ? overview.uptimePercent >= 99.5 ? "emerald"
                : overview.uptimePercent >= 95 ? "yellow"
                : "red"
                : undefined
            }
            sparklineData={overview?.uptimeTrend}
          />
          <MetricCard
            value={avgLatencyAll ?? 0}
            format={formatters.ms}
            label="avg response"
            sparklineData={overview?.latencyTrend}
          />
          <MetricCard
            value={monitors.length}
            format={formatters.integer}
            label={`${active} active${paused > 0 ? ` · ${paused} paused` : ""}`}
          />
          <MetricCard
            value={openIncidents.length}
            format={formatters.integer}
            label="open incidents"
            accent={openIncidents.length > 0 ? "yellow" : undefined}
          />
        </div>
      </motion.div>

      {/* Onboarding */}
      {dataReady && showOnboarding && (
        <OnboardingChecklist
          steps={onboardingSteps}
          completedCount={completedCount}
          onDismiss={dismiss}
        />
      )}

      {/* Response time chart */}
      {(overview?.responseTimeSeries?.length ?? 0) > 0 && (
        <motion.div {...fadeUp(0.05)}>
          <ResponseTimeChart
            data={overview!.responseTimeSeries}
            hours={hours}
            onHoursChange={setHours}
            isLive={isPolling}
          />
        </motion.div>
      )}

      {/* Monitors */}
      <motion.div {...fadeUp(0.1)} className="flex flex-col gap-3">
        <SectionHeader>Monitors</SectionHeader>
        {monitors.length > 0 ? (
          <div className="flex flex-col gap-3">
            {monitors.map((m) => (
              <MonitorCard key={m.id} monitor={m} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Activity className="size-4" /></EmptyMedia>
                <EmptyTitle>No monitors yet</EmptyTitle>
                <EmptyDescription>Add a monitor to start tracking uptime.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </motion.div>

      {/* Recent Activity */}
      {((overview?.recentChecks?.length ?? 0) > 0 || openIncidents.length > 0) && (
        <motion.div {...fadeUp(0.15)} className="flex flex-col gap-3">
          <SectionHeader>Recent Activity</SectionHeader>
          <div className="rounded-lg border bg-card">
            {openIncidents.map((inc, i) => (
              <div
                key={inc.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < openIncidents.length - 1 || (overview?.recentChecks?.length ?? 0) > 0 ? "border-b" : ""
                }`}
              >
                <StatusDot status="down" size="xs" />
                <span className="text-sm truncate flex-1">{inc.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {inc.monitor?.name} · {formatTimeAgo(new Date(inc.startedAt))}
                </span>
                <Badge variant="destructive" className="shrink-0">
                  {inc.status}
                </Badge>
              </div>
            ))}
            {(overview?.recentChecks ?? []).map((check, i) => (
              <div
                key={check.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < (overview?.recentChecks?.length ?? 0) - 1 ? "border-b" : ""
                }`}
              >
                <StatusDot status={check.status as "up" | "down" | "degraded"} size="xs" />
                <span className="text-sm truncate">{check.monitorName}</span>
                <span className="text-xs text-muted-foreground">
                  {check.region?.toUpperCase() ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground flex-1">
                  {formatTimeAgo(new Date(check.checkedAt))}
                </span>
                <span className={`text-xs font-mono tabular-nums shrink-0 ${
                  check.latency < 200 ? "text-emerald-500" :
                  check.latency < 500 ? "text-muted-foreground" :
                  check.latency < 1000 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {check.latency}ms
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty activity state */}
      {openIncidents.length === 0 && (overview?.recentChecks?.length ?? 0) === 0 && monitors.length > 0 && (
        <motion.div {...fadeUp(0.15)} className="flex flex-col gap-3">
          <SectionHeader>Recent Activity</SectionHeader>
          <div className="rounded-lg border bg-card">
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Clock className="size-4" /></EmptyMedia>
                <EmptyTitle>No recent activity</EmptyTitle>
                <EmptyDescription>Activity from monitors and incidents will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MetricCard({
  value,
  format,
  label,
  accent,
  sparklineData,
}: {
  value: number;
  format?: (v: number) => string;
  label: string;
  accent?: "emerald" | "yellow" | "red";
  sparklineData?: number[];
}) {
  const accentColor = accent === "emerald" ? "text-emerald-500" :
    accent === "yellow" ? "text-yellow-500" :
    accent === "red" ? "text-red-500" : "";

  const sparklineColor = accent === "emerald" ? sparklineColors.up :
    accent === "yellow" ? sparklineColors.degraded :
    accent === "red" ? sparklineColors.down : sparklineColors.neutral;

  return (
    <div className="group relative flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span className={`text-2xl font-semibold tracking-tight tabular-nums ${accentColor}`}>
            <AnimatedNumber value={value} format={format} />
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <Sparkline
            data={sparklineData}
            width={64}
            height={24}
            color={sparklineColor}
            className="opacity-60 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
    </div>
  );
}

function MonitorCard({ monitor: m }: { monitor: {
  id: string;
  name: string;
  type: string;
  active: boolean;
  currentStatus: string;
  lastLatency: number | null;
  avgLatency24h: number | null;
  dailyStats: { date: string; status: string }[];
}}) {
  const dotStatus = !m.active
    ? "paused"
    : (m.currentStatus as "up" | "down" | "degraded") || "unknown";

  const statusLabel = !m.active ? "paused" : m.currentStatus === "up" ? "operational" : m.currentStatus;

  const statusColor = !m.active
    ? "text-muted-foreground"
    : m.currentStatus === "up" ? "text-emerald-500"
    : m.currentStatus === "down" ? "text-red-500"
    : m.currentStatus === "degraded" ? "text-yellow-500"
    : "text-muted-foreground";

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot status={dotStatus} />
          <span className="font-medium truncate">{m.name}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-widest">{m.type}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {m.avgLatency24h !== null && (
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {Math.round(m.avgLatency24h)}ms
            </span>
          )}
          <span className={`text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>
      {m.dailyStats.length > 0 && <UptimeBars days={m.dailyStats} />}
    </div>
  );
}

const chartConfig = {
  avgLatency: {
    label: "Avg Latency",
    color: "oklch(0.765 0.177 163.22)",
  },
} satisfies ChartConfig;

function ResponseTimeChart({
  data,
  hours,
  onHoursChange,
  isLive = false,
}: {
  data: { hour: Date | string; avgLatency: number; checkCount: number }[];
  hours: number;
  onHoursChange: (h: number) => void;
  isLive?: boolean;
}) {
  if (data.length === 0) return null;

  const maxLatency = Math.max(...data.map((d) => d.avgLatency), 1);
  const avgLatency = Math.round(data.reduce((s, d) => s + d.avgLatency, 0) / data.length);

  const chartData = data.map((d) => ({
    ...d,
    hour: new Date(d.hour).getTime(),
  }));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Response Time</h2>
            {isLive && <LiveIndicator size="sm" />}
          </div>
          <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
            <span>
              avg{" "}
              <span className="font-mono font-medium text-foreground tabular-nums">
                {avgLatency}ms
              </span>
            </span>
            <span>
              peak{" "}
              <span className="font-mono font-medium text-foreground tabular-nums">
                {Math.round(maxLatency)}ms
              </span>
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <Button
              key={r.hours}
              variant={hours === r.hours ? "default" : "ghost"}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => onHoursChange(r.hours)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-[5/1] w-full">
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-avgLatency)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-avgLatency)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={50}
            tickFormatter={(value) =>
              new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            width={52}
            tickFormatter={(value) => `${Math.round(value)}ms`}
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
            strokeLinecap="round"
            fill="url(#latencyGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: "var(--color-avgLatency)" }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function UptimeBars({ days }: { days: { date: string; status: string }[] }) {
  if (!days.length) return null;

  const upDays = days.filter((d) => d.status === "up").length;
  const totalDays = days.filter((d) => d.status !== "empty").length;
  const uptimePercent =
    totalDays > 0
      ? Math.round((upDays / totalDays) * 1000) / 10
      : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-[2px]">
        {days.map((d) => (
          <div
            key={d.date}
            className={`flex-1 h-7 rounded-sm transition-colors ${
              d.status === "up"
                ? "bg-emerald-500/70 hover:bg-emerald-500"
                : d.status === "down"
                  ? "bg-red-500/70 hover:bg-red-500"
                  : d.status === "degraded"
                    ? "bg-yellow-500/70 hover:bg-yellow-500"
                    : "bg-muted/40 hover:bg-muted"
            }`}
            title={`${d.date}: ${d.status}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>45 days ago</span>
        {uptimePercent !== null && (
          <span className="tabular-nums">{uptimePercent}% uptime</span>
        )}
        <span>Today</span>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
