import { createFileRoute } from "@tanstack/react-router";
import { skipToken, useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_authed/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;

  const overviewQuery = orpc.monitors.overview.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const pagesQuery = orpc.statusPages.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const incidentsQuery = orpc.incidents.listByOrg.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery(overviewQuery);
  const { data: pages, isLoading: pagesLoading } = useQuery(pagesQuery);
  const { data: incidents, isLoading: incidentsLoading } = useQuery(incidentsQuery);

  if (overviewLoading || pagesLoading || incidentsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  const monitors = overview?.monitors ?? [];
  const active = monitors.filter((m) => m.active).length;
  const paused = monitors.filter((m) => !m.active).length;
  const downCount = monitors.filter((m) => m.currentStatus === "down").length;
  const openIncidents = incidents?.filter((i) => i.status !== "resolved") ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* Overall status banner */}
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
          downCount > 0
            ? "border-red-500/30 bg-red-500/5"
            : openIncidents.length > 0
              ? "border-yellow-500/30 bg-yellow-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
        }`}
      >
        <div
          className={`size-2.5 rounded-full ${
            downCount > 0
              ? "bg-red-500"
              : openIncidents.length > 0
                ? "bg-yellow-500"
                : "bg-emerald-500"
          }`}
        />
        <span className="text-sm font-medium">
          {downCount > 0
            ? `${downCount} monitor${downCount > 1 ? "s" : ""} down`
            : openIncidents.length > 0
              ? `${openIncidents.length} open incident${openIncidents.length > 1 ? "s" : ""}`
              : "All systems operational"}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Monitors" value={monitors.length}>
          <span className="text-muted-foreground">
            {active} active · {paused} paused
          </span>
        </StatCard>
        <StatCard label="Up" value={monitors.filter((m) => m.currentStatus === "up").length}>
          <span className="text-emerald-500">operational</span>
        </StatCard>
        <StatCard label="Status Pages" value={pages?.length ?? 0} />
        <StatCard label="Incidents" value={incidents?.length ?? 0}>
          <span className={openIncidents.length > 0 ? "text-yellow-500" : "text-muted-foreground"}>
            {openIncidents.length} open
          </span>
        </StatCard>
      </div>

      {/* Response time chart */}
      {(overview?.responseTimeSeries?.length ?? 0) > 0 && (
        <ResponseTimeChart data={overview!.responseTimeSeries} />
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* Monitor status list */}
        <div className="flex flex-col rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Monitors</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Current status and response times</p>
          </div>
          <div className="flex flex-col">
            {monitors.length > 0 ? (
              monitors.map((m, i) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    i < monitors.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`size-2 shrink-0 rounded-full ${
                        !m.active
                          ? "bg-muted-foreground"
                          : m.currentStatus === "up"
                            ? "bg-emerald-500"
                            : m.currentStatus === "down"
                              ? "bg-red-500"
                              : m.currentStatus === "degraded"
                                ? "bg-yellow-500"
                                : "bg-muted-foreground"
                      }`}
                    />
                    <span className="text-sm truncate">{m.name}</span>
                    {!m.active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">paused</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {m.avgLatency24h !== null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {Math.round(m.avgLatency24h)}ms
                      </span>
                    )}
                    <Badge
                      variant={
                        !m.active
                          ? "secondary"
                          : m.currentStatus === "up"
                            ? "default"
                            : m.currentStatus === "down"
                              ? "destructive"
                              : "secondary"
                      }
                      className="text-[10px] px-1.5 py-0 min-w-[32px] justify-center"
                    >
                      {!m.active ? "paused" : m.currentStatus}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">No monitors configured yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="flex flex-col rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Recent Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest checks and incidents</p>
          </div>
          <div className="flex flex-col">
            {/* Open incidents first */}
            {openIncidents.map((inc, i) => (
              <div
                key={inc.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < openIncidents.length - 1 || (overview?.recentChecks?.length ?? 0) > 0
                    ? "border-b"
                    : ""
                }`}
              >
                <div className="size-2 shrink-0 rounded-full bg-red-500" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate">{inc.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {(inc as any).monitor?.name} · {formatTimeAgo(new Date(inc.startedAt))}
                  </span>
                </div>
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                  {inc.status}
                </Badge>
              </div>
            ))}
            {/* Recent checks */}
            {(overview?.recentChecks ?? []).map((check, i) => (
              <div
                key={check.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < (overview?.recentChecks?.length ?? 0) - 1 ? "border-b" : ""
                }`}
              >
                <div
                  className={`size-2 shrink-0 rounded-full ${
                    check.status === "up"
                      ? "bg-emerald-500"
                      : check.status === "down"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate">{check.monitorName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {check.region?.toUpperCase() ?? "—"} · {formatTimeAgo(new Date(check.checkedAt))}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {check.latency}ms
                </span>
              </div>
            ))}
            {openIncidents.length === 0 && (overview?.recentChecks?.length ?? 0) === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-medium">{value}</span>
      {children && <div className="text-[0.625rem]">{children}</div>}
    </div>
  );
}

function ResponseTimeChart({
  data,
}: {
  data: { hour: Date | string; avgLatency: number; checkCount: number }[];
}) {
  if (data.length === 0) return null;

  const maxLatency = Math.max(...data.map((d) => d.avgLatency), 1);
  const chartHeight = 120;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium">Response Time</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Average latency over the last 24 hours</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            avg{" "}
            <span className="font-mono font-medium text-foreground">
              {Math.round(data.reduce((s, d) => s + d.avgLatency, 0) / data.length)}ms
            </span>
          </span>
          <span>
            peak{" "}
            <span className="font-mono font-medium text-foreground">
              {Math.round(maxLatency)}ms
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-end gap-[3px]" style={{ height: chartHeight }}>
        {data.map((d, i) => {
          const height = Math.max((d.avgLatency / maxLatency) * chartHeight, 2);
          const hour = new Date(d.hour);
          return (
            <div
              key={i}
              className="group relative flex-1 flex items-end"
              style={{ height: chartHeight }}
            >
              <div
                className="w-full rounded-t-sm bg-emerald-500/70 transition-colors group-hover:bg-emerald-500"
                style={{ height }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
                <div className="rounded border bg-popover px-2 py-1 text-[10px] shadow-md whitespace-nowrap">
                  <div className="font-medium">{Math.round(d.avgLatency)}ms</div>
                  <div className="text-muted-foreground">
                    {hour.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {d.checkCount} checks
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span>24h ago</span>
        <span>Now</span>
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
