import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "@/orpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Users,
  Building2,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/_authed/admin/")({
  component: AdminOverview,
});

const TIME_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

const monitorGrowthChartConfig = {
  totalMonitors: {
    label: "Total Monitors",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const change = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const isPositive = change >= 0;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isPositive ? "+" : ""}{change}%
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  growth,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  growth?: { current: number; previous: number };
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">{value}</p>
              {growth && <GrowthBadge current={growth.current} previous={growth.previous} />}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-md bg-muted p-2">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminOverview() {
  const [days, setDays] = useState(30);
  const [failureDays, setFailureDays] = useState(14);
  const [incidentDays, setIncidentDays] = useState(30);

  const { data: stats, isLoading: statsLoading } = useQuery(
    orpc.admin.stats.queryOptions({ input: undefined }),
  );

  const { data: userGrowth, isLoading: userGrowthLoading } = useQuery(
    orpc.admin.userGrowth.queryOptions({ input: { days } }),
  );

  const { data: orgGrowth, isLoading: orgGrowthLoading } = useQuery(
    orpc.admin.orgGrowth.queryOptions({ input: { days } }),
  );

  const { data: recentSignups, isLoading: signupsLoading } = useQuery(
    orpc.admin.recentSignups.queryOptions({ input: undefined }),
  );


  const { data: monitorInsights, isLoading: monitorInsightsLoading } = useQuery(
    orpc.admin.monitorInsights.queryOptions({ input: { days } }),
  );

  const { data: failureTrend } = useQuery(
    orpc.admin.failureTrend.queryOptions({ input: { days: failureDays } }),
  );

  const { data: incidentTrend } = useQuery(
    orpc.admin.incidentTrend.queryOptions({ input: { days: incidentDays } }),
  );

  const { data: recentIncidents } = useQuery(
    orpc.admin.recentIncidents.queryOptions({ input: { limit: 5 } }),
  );

  // Calculate average failure rate from trend data
  const avgFailureRate = failureTrend && failureTrend.length > 0
    ? (failureTrend.reduce((sum, d) => sum + d.failureRate, 0) / failureTrend.length).toFixed(2)
    : "0.00";

  // Calculate total incidents in period
  const totalIncidentsInPeriod = incidentTrend
    ? incidentTrend.reduce((sum, d) => sum + d.critical + d.major + d.minor, 0)
    : 0;

  // Format type distribution for display
  const typeData = Object.entries(monitorInsights?.typeCounts ?? {}).map(([type, count]) => ({
    type: type.toUpperCase(),
    count,
    fill: type === "http" ? "hsl(var(--chart-1))" : type === "tcp" ? "hsl(var(--chart-2))" : "hsl(var(--chart-3))",
  }));

  if (statsLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">Platform-wide statistics and user growth.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Use the periodTotal from the API response, or calculate from dailySignups
  const userGrowthData = userGrowth?.dailySignups ?? (userGrowth as unknown as Array<{ date: string; newUsers: number; cumulativeUsers: number }>);
  const orgGrowthData = orgGrowth?.dailySignups ?? (orgGrowth as unknown as Array<{ date: string; newOrgs: number; cumulativeOrgs: number; paidOrgs: number }>);

  const periodTotal = userGrowth?.periodTotal ?? (Array.isArray(userGrowthData) ? userGrowthData.reduce((sum: number, d: { count?: number; newUsers?: number }) => sum + (d.count ?? d.newUsers ?? 0), 0) : 0);
  const orgPeriodTotal = orgGrowth?.periodTotal ?? (Array.isArray(orgGrowthData) ? orgGrowthData.reduce((sum: number, d: { count?: number; newOrgs?: number }) => sum + (d.count ?? d.newOrgs ?? 0), 0) : 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">Platform-wide statistics and user growth.</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.users.total ?? 0}
          subtitle={`+${stats?.users.thisWeek ?? 0} this week`}
          icon={Users}
          growth={stats ? { current: stats.users.thisWeek, previous: stats.users.lastWeek } : undefined}
        />
        <StatCard
          title="Organizations"
          value={stats?.organizations.total ?? 0}
          subtitle={`${stats?.organizations.withSubscription ?? 0} with subscription`}
          icon={Building2}
          growth={stats ? { current: stats.organizations.thisWeek, previous: stats.organizations.lastWeek } : undefined}
        />
        <StatCard
          title="Total Monitors"
          value={stats?.monitors.total ?? 0}
          subtitle={`${stats?.monitors.active ?? 0} active, ${stats?.monitors.paused ?? 0} paused`}
          icon={Activity}
          growth={stats ? { current: stats.monitors.thisWeek, previous: stats.monitors.lastWeek } : undefined}
        />
        <StatCard
          title="Checks Today"
          value={(stats?.checks.today ?? 0).toLocaleString()}
          subtitle={`${stats?.checks.failureRate24h ?? 0}% failure rate (24h)`}
          icon={BarChart3}
        />
      </div>

      {/* Platform Health */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monitor Health</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">{stats?.monitorHealth.up ?? 0}</span>
                <span className="text-xs text-muted-foreground">Up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">{stats?.monitorHealth.degraded ?? 0}</span>
                <span className="text-xs text-muted-foreground">Degraded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium">{stats?.monitorHealth.down ?? 0}</span>
                <span className="text-xs text-muted-foreground">Down</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-orange-500" />
                <span className="text-sm font-medium">{stats?.incidents.open ?? 0}</span>
                <span className="text-xs text-muted-foreground">Open</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{stats?.incidents.thisWeek ?? 0}</span>
                <span className="text-xs text-muted-foreground">This week</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{stats?.incidents.total ?? 0}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-blue-500" />
                <span className="text-sm font-medium">{stats?.organizations.withSubscription ?? 0}</span>
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">
                  {stats && stats.organizations.total > 0
                    ? Math.round((stats.organizations.withSubscription / stats.organizations.total) * 100)
                    : 0}%
                </span>
                <span className="text-xs text-muted-foreground">Conversion</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reliability Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Failure Rate Trend</CardTitle>
              <p className="text-xs text-muted-foreground">
                Avg: {avgFailureRate}% | Failed: {failureTrend?.reduce((s, d) => s + d.failedChecks, 0).toLocaleString() ?? 0} checks
              </p>
            </div>
            <div className="flex gap-1">
              {[7, 14, 30].map((d) => (
                <Button
                  key={d}
                  variant={failureDays === d ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setFailureDays(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {failureTrend && failureTrend.length > 0 ? (
              <ChartContainer config={{ failureRate: { label: "Failure Rate", color: "hsl(var(--chart-1))" } }} className="h-[160px] w-full">
                <AreaChart data={failureTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "currentColor", className: "text-muted-foreground/60" }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: "short", day: "numeric" })}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "currentColor", className: "text-muted-foreground/60" }}
                    tickFormatter={(v) => `${v}%`}
                    width={40}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="failureRate" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Incident Frequency</CardTitle>
              <p className="text-xs text-muted-foreground">
                {totalIncidentsInPeriod} incidents in {incidentDays} days
              </p>
            </div>
            <div className="flex gap-1">
              {[14, 30, 60].map((d) => (
                <Button
                  key={d}
                  variant={incidentDays === d ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setIncidentDays(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {incidentTrend && incidentTrend.length > 0 ? (
              <ChartContainer config={{ total: { label: "Incidents", color: "hsl(var(--chart-2))" } }} className="h-[160px] w-full">
                <BarChart data={incidentTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "currentColor", className: "text-muted-foreground/60" }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: "short", day: "numeric" })}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "currentColor", className: "text-muted-foreground/60" }}
                    width={30}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
                No incidents recorded
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      {recentIncidents && recentIncidents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`size-2 rounded-full ${incident.status === "resolved" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.monitorName} - {incident.orgName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      incident.severity === "critical"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                        : incident.severity === "major"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {incident.severity}
                    </span>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {formatTimeAgo(new Date(incident.startedAt))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Growth Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">User Growth</CardTitle>
          <div className="flex gap-1">
            {TIME_RANGES.map((r) => (
              <Button
                key={r.days}
                variant={days === r.days ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {userGrowthLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : userGrowthData && Array.isArray(userGrowthData) && userGrowthData.length > 0 ? (
            <UserGrowthChart data={userGrowthData as { date: string; newUsers: number; cumulativeUsers: number }[]} />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No signup data available
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {periodTotal} new users in the last {days} days
            </span>
            <span>
              Avg: {periodTotal > 0 ? (periodTotal / days).toFixed(1) : 0} / day
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Organization Growth Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Organization Growth</CardTitle>
        </CardHeader>
        <CardContent>
          {orgGrowthLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : orgGrowthData && Array.isArray(orgGrowthData) && orgGrowthData.length > 0 ? (
            <OrgGrowthChart data={orgGrowthData as { date: string; newOrgs: number; cumulativeOrgs: number; paidOrgs: number }[]} />
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No organization data available
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {orgPeriodTotal} new organizations in the last {days} days
          </div>
        </CardContent>
      </Card>


      {/* Monitor Growth Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Monitor Growth</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {monitorInsights?.periodTotal ?? 0} new monitors in {days} days
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monitorInsightsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : monitorInsights?.growthTrend && monitorInsights.growthTrend.length > 0 ? (
            <ChartContainer config={monitorGrowthChartConfig} className="h-[150px] w-full">
              <AreaChart data={monitorInsights.growthTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="monitorGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-totalMonitors)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-totalMonitors)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={30}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString([], { month: "short", day: "numeric" })
                  }
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={4} width={40} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="totalMonitors"
                  stroke="var(--color-totalMonitors)"
                  strokeWidth={2}
                  fill="url(#monitorGrowthGradient)"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No monitor data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitor Type Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monitor Types</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {monitorInsightsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : typeData.length > 0 ? (
            <div className="flex flex-wrap gap-4 text-sm">
              {typeData.map((item) => (
                <div key={item.type} className="flex items-center gap-2">
                  <div className="size-3 rounded-sm" style={{ backgroundColor: item.fill }} />
                  <span className="text-muted-foreground">{item.type}:</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
              No monitor type data available
            </div>
          )}
        </CardContent>
      </Card>
      {/* Recent Signups */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {signupsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : recentSignups && recentSignups.length > 0 ? (
            <div className="space-y-2">
              {recentSignups.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {user.name?.slice(0, 2).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(new Date(user.createdAt))}
                    </span>
                    {user.orgCount > 0 && (
                      <p className="text-xs text-muted-foreground">{user.orgCount} org{user.orgCount > 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
              No recent signups
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const userChartConfig = {
  newUsers: {
    label: "Daily Signups",
    color: "oklch(0.765 0.177 163.22)",
  },
} satisfies ChartConfig;

function UserGrowthChart({
  data,
}: {
  data: { date: string; newUsers: number; cumulativeUsers: number }[];
}) {
  const maxDaily = Math.max(...data.map((d) => d.newUsers), 1);

  return (
    <ChartContainer config={userChartConfig} className="aspect-[4/1] w-full">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={40}
          tickFormatter={(value) => {
            const d = new Date(value);
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={32}
          domain={[0, Math.ceil(maxDaily * 1.2)]}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                const d = new Date(value);
                return d.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
              }}
            />
          }
        />
        <Bar
          dataKey="newUsers"
          fill="var(--color-newUsers)"
          radius={[2, 2, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ChartContainer>
  );
}

const orgChartConfig = {
  newOrgs: {
    label: "Daily Orgs",
    color: "oklch(0.7 0.15 280)",
  },
} satisfies ChartConfig;

function OrgGrowthChart({
  data,
}: {
  data: { date: string; newOrgs: number; cumulativeOrgs: number; paidOrgs: number }[];
}) {
  return (
    <ChartContainer config={orgChartConfig} className="aspect-[6/1] w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="orgGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-newOrgs)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-newOrgs)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={60}
          tickFormatter={(value) => {
            const d = new Date(value);
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          }}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} width={24} allowDecimals={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                const d = new Date(value);
                return d.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="newOrgs"
          stroke="var(--color-newOrgs)"
          strokeWidth={2}
          fill="url(#orgGradient)"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
