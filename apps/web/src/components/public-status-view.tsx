import { type ReactNode, Fragment, useState, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
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
import { StatusDot } from "@/components/ui/status-dot";
import { UptimeBar } from "@/components/ui/uptime-bar";
import { useTheme } from "@/hooks/use-theme";
import { DependencyList, DependencyImpactBanner } from "@/components/-dependency-chain";
import { getOverallStatusConfig, getIncidentStatusColor, getIncidentSeverityConfig, getIncidentStatusConfig } from "@/lib/constants";
import { Sun, Moon, Monitor, ChevronDown, ChevronRight, Check, Bell, MessageCircle, Wrench, Clock, CheckCircle2 } from "lucide-react";

export type PublicStatusMonitorDependency = {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  serviceLogoUrl: string | null;
  serviceStatus: string;
  serviceStatusPageUrl: string | null;
  serviceLastFetchedAt: string | Date | null;
  componentName: string | null;
  componentStatus: string | null;
};

export type PublicStatusMonitorData = {
  id: string;
  name: string;
  groupName?: string | null;
  currentStatus: string;
  uptimePercent: number;
  avgLatency: number;
  daily: { date: string; uptime: number; totalChecks: number }[];
  responseTimeSeries?: { hour: string; avgLatency: number; checkCount: number }[];
  dependencies?: PublicStatusMonitorDependency[];
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

export type PublicMaintenanceWindow = {
  id: string;
  title: string;
  description: string | null;
  scheduledStart: string | Date;
  scheduledEnd: string | Date;
  actualStart?: string | Date | null;
  monitorNames: string[];
};

export type PublicStatusPageData = {
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  headerText: string | null;
  footerText: string | null;
  showResponseTimes?: boolean;
  showDependencies?: boolean;
  customCss?: string | null;
  customJs?: string | null;
  overallStatus: string;
  monitors: PublicStatusMonitorData[];
  incidents: PublicStatusIncidentSummary[];
  maintenance?: {
    active: PublicMaintenanceWindow[];
    upcoming: PublicMaintenanceWindow[];
  };
  lastUpdatedAt?: string | Date | null;
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
  const isLoading = message.toLowerCase().includes("loading");
  return (
    <div className="flex min-h-screen items-center justify-center">
      {isLoading ? (
        <div className="flex flex-col items-center gap-2.5">
          <Spinner className="size-5" />
          <p className="text-xs text-muted-foreground animate-pulse">{message}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/** Skeleton loader matching the status page layout */
export function StatusPageSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header skeleton */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-6 w-52 rounded-md bg-muted animate-pulse" />
        <div className="flex gap-2 pt-1">
          <div className="h-7 w-24 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />
        </div>
      </div>

      {/* Overall status skeleton */}
      <div className="h-14 rounded-lg bg-muted animate-pulse" />

      {/* Monitor cards skeleton */}
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                <div className="h-4 w-14 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="mt-4 flex gap-[2px]">
              {Array.from({ length: 45 }).map((_, j) => (
                <div
                  key={j}
                  className="h-8 flex-1 rounded-[3px] bg-muted animate-pulse"
                  style={{ animationDelay: `${j * 15}ms` }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="h-3 w-10 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/** Skeleton loader for incident detail page */
export function IncidentPageSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      {/* Back link skeleton */}
      <div className="h-4 w-24 rounded bg-muted animate-pulse" />

      {/* Title section skeleton */}
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="mt-2 h-3 w-64 rounded bg-muted animate-pulse" />
      </div>

      {/* Separator */}
      <div className="my-6 h-px w-full bg-border" />

      {/* Updates skeleton */}
      <div className="flex flex-col gap-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative flex gap-4 pb-8 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {i < 2 && (
              <div className="absolute top-5 bottom-0 left-[9px] w-px bg-border" />
            )}
            <div className="relative z-10 mt-1">
              <div className="size-[19px] rounded-full bg-muted animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              </div>
              <div className="mt-2 h-4 w-full max-w-md rounded bg-muted animate-pulse" />
              <div className="mt-1.5 h-4 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  // Collapsed groups persisted to localStorage, keyed by page slug
  const storageKey = `unstatus:collapsed-groups:${data.slug}`;
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set();
  });

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Inject custom JS
  useEffect(() => {
    if (!data.customJs) return;
    const script = document.createElement("script");
    script.textContent = data.customJs;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [data.customJs]);

  return (
    <TooltipProvider>
      {/* Brand accent bar */}
      {accent && accent !== "#000000" && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: accent }}
        />
      )}

      {/* Custom CSS injection */}
      {data.customCss && (
        <style dangerouslySetInnerHTML={{ __html: data.customCss }} />
      )}

      <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="animate-fade-in mb-8 flex flex-col items-center gap-4 text-center sm:mb-10">
          <div className="flex flex-col items-center gap-2.5">
            {data.logoUrl && <img src={data.logoUrl} alt="" className="h-8 sm:h-9" />}
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{data.name}</h1>
            {data.headerText && (
              <p className="text-sm text-muted-foreground max-w-md">{data.headerText}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 pt-1 w-full sm:flex-row sm:w-auto">
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

        {/* Active maintenance banners */}
        {data.maintenance?.active && data.maintenance.active.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 animate-fade-in" style={{ animationDelay: "70ms" }}>
            {data.maintenance.active.map((mw) => (
              <div
                key={mw.id}
                className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3"
              >
                <Wrench className="size-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{mw.title}</p>
                  {mw.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{mw.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Ends {new Date(mw.scheduledEnd).toLocaleString()}</span>
                    <span>{mw.monitorNames.join(", ")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monitors — grouped */}
        <div className="mt-8 flex flex-col gap-4">
          {(() => {
            const groups = new Map<string, PublicStatusMonitorData[]>();
            const ungrouped: PublicStatusMonitorData[] = [];
            for (const m of data.monitors) {
              if (m.groupName) {
                const existing = groups.get(m.groupName) ?? [];
                existing.push(m);
                groups.set(m.groupName, existing);
              } else {
                ungrouped.push(m);
              }
            }
            const sections: { name: string | null; monitors: PublicStatusMonitorData[] }[] = [];
            for (const [name, monitors] of groups) {
              sections.push({ name, monitors });
            }
            if (ungrouped.length > 0) {
              sections.push({ name: null, monitors: ungrouped });
            }
            // If no groups at all, just render flat
            if (sections.length === 1 && sections[0]?.name === null) {
              return sections[0]!.monitors.map((monitor, i) => (
                <div key={monitor.id} className="animate-fade-in" style={{ animationDelay: `${100 + i * 40}ms` }}>
                  <MonitorCard
                    monitor={monitor}
                    showResponseTimes={data.showResponseTimes !== false}
                  />
                </div>
              ));
            }
            let idx = 0;
            return sections.map((section) => {
              const isCollapsed = section.name ? collapsedGroups.has(section.name) : false;
              // Compute group-level status summary
              const allUp = section.monitors.every((m) => m.currentStatus === "up");
              const anyDown = section.monitors.some((m) => m.currentStatus === "down");
              const groupDot = anyDown
                ? "bg-red-500"
                : allUp
                  ? "bg-emerald-500"
                  : "bg-yellow-500";

              return (
                <div key={section.name ?? "__ungrouped"}>
                  {section.name ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(section.name!)}
                      className="mb-3 flex w-full items-center gap-2 group py-1"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="size-3.5 text-muted-foreground/70 transition-transform group-hover:text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-3.5 text-muted-foreground/70 transition-transform group-hover:text-muted-foreground" />
                      )}
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 group-hover:text-foreground transition-colors">
                        {section.name}
                      </h3>
                      <span className="text-[11px] text-muted-foreground/50 tabular-nums">{section.monitors.length}</span>
                      {isCollapsed && (
                        <span className={`ml-auto size-2 rounded-full ${groupDot}`} />
                      )}
                    </button>
                  ) : null}
                  {!isCollapsed && (
                    <div className="flex flex-col gap-3">
                      {section.monitors.map((monitor) => {
                        const i = idx++;
                        return (
                          <div key={monitor.id} className="animate-fade-in" style={{ animationDelay: `${100 + i * 40}ms` }}>
                            <MonitorCard
                              monitor={monitor}
                              showResponseTimes={data.showResponseTimes !== false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* Upcoming maintenance */}
        {data.maintenance?.upcoming && data.maintenance.upcoming.length > 0 && (
          <div className="animate-fade-in mt-12" style={{ animationDelay: `${100 + data.monitors.length * 40 + 30}ms` }}>
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Scheduled maintenance
            </h2>
            <div className="flex flex-col gap-2">
              {data.maintenance.upcoming.map((mw) => (
                <div
                  key={mw.id}
                  className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 ring-1 ring-foreground/5"
                >
                  <Clock className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{mw.title}</p>
                    {mw.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{mw.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      <span>{new Date(mw.scheduledStart).toLocaleString()} — {new Date(mw.scheduledEnd).toLocaleString()}</span>
                      <span className="text-muted-foreground/70">{mw.monitorNames.join(", ")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Incidents - Prominent Display */}
        {(() => {
          const activeIncidents = data.incidents.filter((i) => !i.resolvedAt);
          if (activeIncidents.length === 0) return null;
          return (
            <div className="animate-fade-in mt-6" style={{ animationDelay: "80ms" }}>
              <div className="rounded-lg border-2 border-red-500/30 bg-red-500/5 p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                  </span>
                  Active Incidents
                </h2>
                <div className="flex flex-col gap-2">
                  {activeIncidents.map((incident) => (
                    <Fragment key={incident.id}>
                      {renderIncidentLink(incident, <ActiveIncidentRow incident={incident} />)}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Past Incidents */}
        <div className="animate-fade-in mt-12" style={{ animationDelay: `${100 + data.monitors.length * 40 + 50}ms` }}>
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Past incidents (90 days)
          </h2>
          {(() => {
            const resolvedIncidents = data.incidents
              .filter((i) => i.resolvedAt)
              .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
            if (resolvedIncidents.length === 0) {
              return <NoIncidentsMessage />;
            }
            return (
              <div className="flex flex-col gap-2">
                {resolvedIncidents.map((incident) => (
                  <Fragment key={incident.id}>
                    {renderIncidentLink(incident, <ResolvedIncidentRow incident={incident} />)}
                  </Fragment>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="mt-16 flex items-center justify-between border-t pt-6">
          <div className="flex flex-col gap-1.5">
            {data.footerText && (
              <p className="text-xs text-muted-foreground">{data.footerText}</p>
            )}
            <p className="text-[11px] text-muted-foreground/50">
              Powered by{" "}
              <a
                href="https://unstatus.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                Unstatus
              </a>
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
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="inline-flex items-center rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20">
        {backLink}
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight">{data.title}</h1>
          <Badge variant={data.status === "resolved" ? "success" : "destructive"}>
            {data.status}
          </Badge>
          <Badge variant="outline">{data.severity}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.monitorName} · Started {new Date(data.startedAt).toLocaleString()}
          {data.resolvedAt &&
            ` · Resolved ${new Date(data.resolvedAt).toLocaleString()}`}
        </p>
      </div>

      <Separator className="my-8" />

      <div className="flex flex-col gap-0">
        {data.updates.map((update, index) => {
          const isLatest = index === 0 && data.status !== "resolved";
          return (
            <div key={update.id} className="relative flex gap-4 pb-8 last:pb-0">
              {index < data.updates.length - 1 && (
                <div className="absolute top-5 bottom-0 left-[9px] w-px bg-border" />
              )}
              <div className="relative z-10 mt-1 flex items-center justify-center">
                <div className={`size-[19px] rounded-full border-2 ${getIncidentStatusColor(update.status)}`} />
                {isLatest && (
                  <div className={`absolute size-[19px] rounded-full ${dotGlowColor(update.status)} animate-ping`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {update.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground/70">
                    {timeAgo(new Date(update.createdAt))}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{update.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverallBanner({ status, accent }: { status: string; accent?: string }) {
  const config = getOverallStatusConfig(status);

  return (
    <div
      className={`flex items-center justify-center gap-2.5 rounded-lg border px-5 py-4 ${config.bg}`}
      style={accent && accent !== "#000000" ? { borderLeftWidth: 3, borderLeftColor: accent } : undefined}
    >
      <StatusDot
        status={status as "operational" | "degraded" | "major_outage" | "maintenance" | "unknown"}
        size="default"
        pulse={config.animate} // Only animate when there are issues requiring attention
      />
      <span className={`text-sm font-medium ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}

function MonitorCard({
  monitor,
  showResponseTimes,
}: {
  monitor: PublicStatusMonitorData;
  showResponseTimes: boolean;
}) {
  const [showChart, setShowChart] = useState(false);

  const uptimeColor =
    monitor.uptimePercent >= 99.5
      ? "text-emerald-600 dark:text-emerald-400"
      : monitor.uptimePercent >= 95
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const hasChart = showResponseTimes && (monitor.responseTimeSeries?.length ?? 0) > 0;

  return (
    <div className="rounded-lg border bg-card ring-1 ring-foreground/5">
      {/* Top row */}
      <div className="flex w-full items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <StatusDot status={monitor.currentStatus as "up" | "down" | "degraded" | "paused" | "unknown"} size="sm" />
          <span className="text-sm font-medium">{monitor.name}</span>
        </div>
        <div className="flex items-center gap-4 text-right">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground/80 tabular-nums cursor-default">{monitor.avgLatency}ms</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Avg response time</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-sm font-semibold tabular-nums cursor-default ${uptimeColor}`}>
                {monitor.uptimePercent}%
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>90-day uptime</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Uptime bar */}
      <div className="px-4 pb-4">
        <UptimeBar daily={monitor.daily} showLabels={false} />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground/70">
          <span>90 days ago</span>
          <span>Today</span>
        </div>

        {/* Dependencies */}
        {monitor.dependencies && monitor.dependencies.length > 0 && (
          <>
            <DependencyImpactBanner
              monitorStatus={monitor.currentStatus}
              dependencies={monitor.dependencies}
            />
            <DependencyList dependencies={monitor.dependencies} />
          </>
        )}
      </div>

      {/* Response time chart - expandable */}
      {hasChart && monitor.responseTimeSeries && monitor.responseTimeSeries.length > 0 && (
        <div className="border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowChart((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <span className="font-medium">Response Time</span>
            {showChart ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
          {showChart && (
            <div className="px-4 pb-4">
              <ResponseTimeChart data={monitor.responseTimeSeries} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const chartConfig = {
  avgLatency: {
    label: "Latency",
    color: "oklch(0.765 0.177 163.22)",
  },
} satisfies ChartConfig;

// Custom tooltip for the response time chart
function ResponseTimeTooltip({
  active,
  payload,
  overallAvg,
}: {
  active?: boolean;
  payload?: Array<{ payload: { hour: number; avgLatency: number; checkCount: number } }>;
  overallAvg: number;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const date = new Date(data.hour);
  const latency = Math.round(data.avgLatency);
  const diff = latency - overallAvg;
  const diffPercent = overallAvg > 0 ? Math.round((diff / overallAvg) * 100) : 0;

  // Determine if latency is good, normal, or slow
  const isGood = diffPercent <= -10;
  const isSlow = diffPercent >= 20;

  return (
    <div className="rounded-xl border border-border/50 bg-popover/95 backdrop-blur-sm px-3.5 py-3 shadow-xl shadow-black/10 dark:shadow-black/30 ring-1 ring-white/10 dark:ring-white/5 min-w-[160px]">
      {/* Date/time header */}
      <div className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
        {date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
        <span className="mx-1.5 text-border/50">·</span>
        {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>

      {/* Primary metric: Response time */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {latency}
          <span className="text-sm font-medium text-muted-foreground ml-0.5">ms</span>
        </span>
        {diffPercent !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
              isGood
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : isSlow
                  ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                  : "text-muted-foreground bg-muted/50"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diffPercent}%
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="my-2.5 h-px bg-border/50" />

      {/* Secondary info */}
      <div className="flex items-center justify-between gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500/60" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground/80">{data.checkCount.toLocaleString()}</span> checks
          </span>
        </div>
        <span className="text-muted-foreground/70 tabular-nums">
          avg <span className="font-medium text-muted-foreground">{overallAvg}ms</span>
        </span>
      </div>
    </div>
  );
}

const TIME_RANGES = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
  { label: "90d", hours: 24 * 90 },
] as const;

/** Empty state for response time chart */
function ChartEmptyState({ selectedRange }: { selectedRange: number }) {
  const rangeLabel = TIME_RANGES.find((r) => r.hours === selectedRange)?.label ?? "selected period";
  return (
    <div className="flex aspect-[2.5/1] sm:aspect-[4/1] w-full items-center justify-center rounded-lg bg-muted/15 ring-1 ring-border/20">
      <div className="text-center px-4">
        <p className="text-sm text-muted-foreground">
          No response data for the last {rangeLabel}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Try selecting a longer time range
        </p>
      </div>
    </div>
  );
}

function ResponseTimeChart({
  data,
}: {
  data: { hour: string; avgLatency: number; checkCount: number }[];
}) {
  const [selectedRange, setSelectedRange] = useState<number>(24);

  // Filter data based on selected time range
  const now = Date.now();
  const cutoff = now - selectedRange * 60 * 60 * 1000;
  const filteredData = data.filter((d) => new Date(d.hour).getTime() >= cutoff);

  const chartData = filteredData.map((d) => ({
    ...d,
    hour: new Date(d.hour).getTime(),
  }));

  const overallAvg = filteredData.length > 0
    ? Math.round(filteredData.reduce((s, d) => s + d.avgLatency, 0) / filteredData.length)
    : 0;

  const hasData = chartData.length > 0;

  return (
    <div className="space-y-4">
      {/* Header with time range selector and avg display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Response time
          </span>
          <div className="flex items-center gap-0.5 rounded-md border border-border/40 bg-muted/25 p-0.5">
            {TIME_RANGES.map((range) => {
              const isSelected = selectedRange === range.hours;
              return (
                <button
                  key={range.hours}
                  onClick={() => setSelectedRange(range.hours)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
                    isSelected
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                      : "text-muted-foreground/70 hover:text-foreground hover:bg-background/40"
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
        {hasData && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">avg</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {overallAvg}ms
            </span>
          </div>
        )}
      </div>

      {/* Chart container with subtle background */}
      {hasData ? (
        <div className="rounded-lg bg-muted/10 p-2 sm:p-3">
          <ChartContainer config={chartConfig} className="aspect-[4/1] sm:aspect-[5/1] w-full">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="latencyGradientPublic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-avgLatency)" stopOpacity={0.28} />
                  <stop offset="40%" stopColor="var(--color-avgLatency)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="var(--color-avgLatency)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 6"
                vertical={false}
                stroke="currentColor"
                className="text-border/30"
              />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={selectedRange <= 24 ? 50 : 70}
                tick={{ fontSize: 10, fill: "currentColor", className: "text-muted-foreground/60" }}
                tickFormatter={(v) => {
                  const date = new Date(v);
                  if (selectedRange <= 24) {
                    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  }
                  return date.toLocaleDateString([], { month: "short", day: "numeric" });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={52}
                tick={{ fontSize: 10, fill: "currentColor", className: "text-muted-foreground/60" }}
                tickFormatter={(v) => `${Math.round(v)}ms`}
              />
              <ChartTooltip
                content={<ResponseTimeTooltip overallAvg={overallAvg} />}
                cursor={{
                  stroke: "var(--color-avgLatency)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                  strokeOpacity: 0.4,
                }}
              />
              <Area
                type="monotone"
                dataKey="avgLatency"
                stroke="var(--color-avgLatency)"
                strokeWidth={1.5}
                fill="url(#latencyGradientPublic)"
                animationDuration={400}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      ) : (
        <ChartEmptyState selectedRange={selectedRange} />
      )}
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
        <div className="relative min-h-[120px]">
          {/* Success state with fade-in animation */}
          <div
            className={`absolute inset-0 flex items-center gap-3 py-2 transition-all duration-300 ${
              success ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="size-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium">You're subscribed</p>
              <p className="text-xs text-muted-foreground">Check your email to verify your subscription.</p>
            </div>
          </div>

          {/* Form with fade-out animation */}
          <form
            className={`flex flex-col gap-3 transition-all duration-300 ${
              success ? "opacity-0 -translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"
            }`}
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
              <p className="text-xs text-red-500 animate-fade-in">{error}</p>
            )}
            <Button type="submit" disabled={loading || !emailValue}>
              {loading ? <Spinner className="size-4" /> : "Subscribe"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Active incident row - more prominent styling for ongoing issues */
function ActiveIncidentRow({ incident }: { incident: PublicStatusIncidentSummary }) {
  const severityConfig = getIncidentSeverityConfig(incident.severity);

  return (
    <div
      className="group cursor-pointer rounded-lg border bg-card px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{incident.title}</span>
          <Badge variant={severityConfig.badge}>
            {incident.severity}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {timeAgo(new Date(incident.startedAt))}
          </span>
          <Badge variant="destructive">
            {incident.status}
          </Badge>
        </div>
      </div>
      {incident.lastUpdate && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {incident.lastUpdate}
        </p>
      )}
    </div>
  );
}

/** Resolved incident row - subdued styling for past incidents */
function ResolvedIncidentRow({ incident }: { incident: PublicStatusIncidentSummary }) {
  return (
    <div
      className="group cursor-pointer rounded-lg border bg-card/50 px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-150 hover:bg-card hover:-translate-y-0.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span className="text-sm font-medium text-muted-foreground">{incident.title}</span>
          <Badge variant="outline" className="text-muted-foreground">
            {incident.severity}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDateFull(new Date(incident.startedAt))}
          </span>
          <Badge variant="success">
            resolved
          </Badge>
        </div>
      </div>
    </div>
  );
}

/** Empty state when no past incidents */
function NoIncidentsMessage() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-8 text-center">
      <CheckCircle2 className="mx-auto size-8 text-emerald-500/60" />
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        No incidents in the past 90 days
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Systems have been running smoothly
      </p>
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
      className="rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground active:scale-95"
      title={`Theme: ${theme}`}
    >
      <Icon className="size-4" />
    </button>
  );
}

function dotGlowColor(status: string): string {
  const config = getIncidentStatusConfig(status);
  return config.glow;
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
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
