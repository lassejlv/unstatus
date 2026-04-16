import { createFileRoute } from "@tanstack/react-router";
import { skipToken, useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingChecklist } from "./-onboarding-checklist";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
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
import { Activity, Clock } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/")({
  component: DashboardIndex,
});

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 8 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
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

  if (overviewLoading || pagesLoading || incidentsLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-6 w-56" />
          <div className="grid grid-cols-4 gap-8">
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

  const dotColorClass =
    downCount > 0
      ? "bg-red-500"
      : openIncidents.length > 0
        ? "bg-yellow-500"
        : "bg-emerald-500";

  const monitorsWithLatency = monitors.filter((m) => m.avgLatency24h !== null);
  const avgLatencyAll = monitorsWithLatency.length > 0
    ? Math.round(monitorsWithLatency.reduce((s, m) => s + (m.avgLatency24h ?? 0), 0) / monitorsWithLatency.length)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8">
      {/* Status + key metrics */}
      <motion.div {...fadeUp(0)} className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dotColorClass}`} />
            <span className={`relative inline-flex size-2.5 rounded-full ${dotColorClass}`} />
          </span>
          <span className="font-medium">
            {downCount > 0
              ? `${downCount} monitor${downCount > 1 ? "s" : ""} down`
              : openIncidents.length > 0
                ? `${openIncidents.length} open incident${openIncidents.length > 1 ? "s" : ""}`
                : "All systems operational"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-8">
          <Metric
            value={overview?.uptimePercent != null ? `${overview.uptimePercent}%` : "—"}
            label="30-day uptime"
            accent={
              overview?.uptimePercent != null
                ? overview.uptimePercent >= 99.5 ? "text-emerald-500"
                : overview.uptimePercent >= 95 ? "text-yellow-500"
                : "text-red-500"
                : undefined
            }
          />
          <Metric
            value={avgLatencyAll != null ? `${avgLatencyAll}ms` : "—"}
            label="avg response"
          />
          <Metric
            value={monitors.length}
            label={`${active} active${paused > 0 ? ` · ${paused} paused` : ""}`}
          />
          <Metric
            value={openIncidents.length}
            label="open incidents"
            accent={openIncidents.length > 0 ? "text-yellow-500" : undefined}
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
          <ResponseTimeChart data={overview!.responseTimeSeries} hours={hours} onHoursChange={setHours} />
        </motion.div>
      )}

      {/* Monitors */}
      <motion.div {...fadeUp(0.1)} className="flex flex-col gap-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Monitors</h2>
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
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Recent Activity</h2>
          <div className="rounded-lg border bg-card">
            {openIncidents.map((inc, i) => (
              <div
                key={inc.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < openIncidents.length - 1 || (overview?.recentChecks?.length ?? 0) > 0 ? "border-b" : ""
                }`}
              >
                <div className="size-1.5 shrink-0 rounded-full bg-red-500" />
                <span className="text-sm truncate flex-1">{inc.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {inc.monitor?.name} · {formatTimeAgo(new Date(inc.startedAt))}
                </span>
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
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
                <div
                  className={`size-1.5 shrink-0 rounded-full ${
                    check.status === "up" ? "bg-emerald-500" :
                    check.status === "down" ? "bg-red-500" : "bg-yellow-500"
                  }`}
                />
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
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Recent Activity</h2>
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

function Metric({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-3xl font-semibold tracking-tight tabular-nums ${accent ?? ""}`}>
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
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
  const statusDot = !m.active
    ? "bg-muted-foreground"
    : m.currentStatus === "up" ? "bg-emerald-500"
    : m.currentStatus === "down" ? "bg-red-500"
    : m.currentStatus === "degraded" ? "bg-yellow-500"
    : "bg-muted-foreground";

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
          <div className={`size-2.5 shrink-0 rounded-full ${statusDot}`} />
          <span className="font-medium truncate">{m.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.type}</span>
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

function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.6, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, count, rounded]);

  return <>{display}</>;
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
}: {
  data: { hour: Date | string; avgLatency: number; checkCount: number }[];
  hours: number;
  onHoursChange: (h: number) => void;
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
        <div className="flex items-baseline gap-4">
          <h2 className="text-sm font-medium">Response Time</h2>
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
              className="h-6 text-[10px] px-2"
              onClick={() => onHoursChange(r.hours)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-[5/1] w-full">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            tickMargin={8}
            width={55}
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
      <div className="flex justify-between text-[10px] text-muted-foreground">
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
