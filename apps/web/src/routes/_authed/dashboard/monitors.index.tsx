import { createFileRoute } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { X, ChevronLeft, Pencil, Copy, Check, Activity } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge } from "@/components/upgrade-badge";

const REGIONS = [
  { id: "eu", label: "🇪🇺 Europe" },
  { id: "us", label: "🇺🇸 US" },
  { id: "asia", label: "🇸🇬 Singapore" },
] as const;

export const Route = createFileRoute("/_authed/dashboard/monitors/")({
  component: MonitorsPage,
});

function MonitorsPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const monitorsQuery = orpc.monitors.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const { data: monitors, isLoading } = useQuery(monitorsQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]);
  const [statusFilter, setStatusFilter] = useState<"all" | "up" | "down" | "paused">("all");

  const filteredMonitors = useMemo(() => {
    if (!monitors) return [];
    return monitors.filter((m) => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()) &&
          !(m.url ?? m.host ?? "").toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter === "paused" && m.active) return false;
      if (statusFilter === "up" && (m as any).lastStatus !== "up") return false;
      if (statusFilter === "down" && (m as any).lastStatus !== "down") return false;
      return true;
    });
  }, [monitors, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-4 min-h-0">
      {/* Main content */}
      <div className="flex flex-1 flex-col gap-4 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-medium">Monitors</h1>
          {activeOrg && <CreateMonitorDialog organizationId={activeOrg.id} monitorCount={monitors?.length ?? 0} />}
        </div>
        {(monitors?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search monitors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-8 text-xs"
            />
            <div className="flex gap-1">
              {(["all", "up", "down", "paused"] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs px-2.5"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s === "up" ? "Up" : s === "down" ? "Down" : "Paused"}
                </Button>
              ))}
            </div>
          </div>
        )}
        {filteredMonitors.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMonitors.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                className={`flex flex-col gap-2.5 rounded-lg border bg-card p-3.5 text-left transition-colors hover:border-foreground/20 ${
                  selectedId === m.id ? "border-foreground/30 bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{m.name}</span>
                  <Badge variant={m.active ? "default" : "secondary"} className="shrink-0 ml-2">
                    {m.active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {m.type === "http" ? m.url : m.type === "ping" ? `ping ${m.host}` : `${m.host}:${m.port}`}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      !m.active ? "bg-muted-foreground"
                      : (m as any).lastStatus === "up" ? "bg-emerald-500"
                      : (m as any).lastStatus === "down" ? "bg-red-500"
                      : (m as any).lastStatus === "degraded" ? "bg-yellow-500"
                      : "bg-muted-foreground"
                    }`}
                  />
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {m.type.toUpperCase()}
                  </Badge>
                  <span>
                    {((m.regions as string[]) ?? []).map((r) => r.toUpperCase()).join(", ") || "—"}
                  </span>
                  <span className="ml-auto">
                    {(m as any).lastLatency != null ? `${(m as any).lastLatency}ms · ` : ""}
                    {m.interval}s
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : monitors?.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No monitors match your search.
          </div>
        ) : (
          <Empty>
            <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/50 mx-auto mb-3">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <EmptyHeader>
              <EmptyTitle>No monitors yet</EmptyTitle>
              <EmptyDescription>
                Add your first monitor to start tracking uptime.
              </EmptyDescription>
            </EmptyHeader>
            {activeOrg && <CreateMonitorDialog organizationId={activeOrg.id} monitorCount={monitors?.length ?? 0} />}
          </Empty>
        )}
      </div>

      {/* Sidecar panel */}
      <MonitorSidecar
        monitorId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function MonitorSidecar({
  monitorId,
  onClose,
}: {
  monitorId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const monitorOpts = orpc.monitors.get.queryOptions({
    input: monitorId ? { id: monitorId } : skipToken,
  });
  const [checkPage, setCheckPage] = useState(0);
  const checksOpts = orpc.monitors.checks.queryOptions({
    input: monitorId ? { monitorId, limit: 50, offset: checkPage * 50 } : skipToken,
  });
  const { data: monitor } = useQuery(monitorOpts);
  const { data: checksData } = useQuery(checksOpts);
  const checks = checksData?.items;
  const checksTotal = checksData?.total ?? 0;
  const checksHasMore = checksData?.hasMore ?? false;
  const [selectedCheck, setSelectedCheck] = useState<NonNullable<typeof checks>[0] | null>(null);
  const [view, setView] = useState<"main" | "edit" | "confirmDelete">("main");
  const [copied, setCopied] = useState(false);

  // Reset overlays when switching monitors
  const prevMonitorId = useRef(monitorId);
  if (monitorId !== prevMonitorId.current) {
    prevMonitorId.current = monitorId;
    setSelectedCheck(null);
    setView("main");
    setCheckPage(0);
    setTab("overview");
  }

  const runCheck = useMutation({
    ...orpc.monitors.runCheck.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checksOpts.queryKey });
      toast.success("Check completed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to run check");
    },
  });

  const toggle = useMutation({
    ...orpc.monitors.update.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: monitorOpts.queryKey });
      toast.success("Monitor updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update");
    },
  });

  const del = useMutation({
    ...orpc.monitors.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Monitor deleted");
      qc.invalidateQueries();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete");
    },
  });

  const isOpen = monitorId !== null;
  const [tab, setTab] = useState<"overview" | "checks" | "settings">("overview");

  return (
    <div
      className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
        isOpen ? "w-[520px] opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="relative flex h-full w-[520px] flex-col border-l bg-background/95 backdrop-blur-sm overflow-hidden">
        {!monitor ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-5" />
          </div>
        ) : (
          <>
            {/* Header — Railway-style: big name, metadata below */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`size-3 shrink-0 rounded-full mt-1 ${
                    !monitor.active ? "bg-muted-foreground"
                    : (monitor as any).lastStatus === "up" ? "bg-emerald-500"
                    : (monitor as any).lastStatus === "down" ? "bg-red-500"
                    : "bg-muted-foreground"
                  }`} />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold truncate">{monitor.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono truncate max-w-[280px]">
                        {monitor.type === "http" ? monitor.url : monitor.type === "ping" ? monitor.host : `${monitor.host}:${monitor.port}`}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 hover:text-foreground"
                        onClick={() => {
                          const target = monitor.type === "http" ? monitor.url : monitor.type === "ping" ? monitor.host : `${monitor.host}:${monitor.port}`;
                          if (target) navigator.clipboard.writeText(target);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                      >
                        {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setView("edit")}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Metadata pills — Railway style */}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono">
                  {monitor.type.toUpperCase()}
                </Badge>
                <span className="font-mono">{monitor.interval}s</span>
                <span>
                  {((monitor.regions as string[]) ?? []).map((r) => r.toUpperCase()).join(" · ")}
                </span>
                {(monitor as any).lastLatency != null && (
                  <span className="font-mono">{(monitor as any).lastLatency}ms</span>
                )}
                <Badge variant={monitor.active ? "default" : "secondary"} className="text-[10px] px-2 py-0.5 ml-auto">
                  {monitor.active ? "Active" : "Paused"}
                </Badge>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mt-4 border-b -mx-6 px-6">
                {(["overview", "checks", "settings"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`pb-2.5 text-sm transition-colors border-b-2 -mb-px ${
                      tab === t
                        ? "border-foreground text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "overview" ? "Overview" : t === "checks" ? "Checks" : "Settings"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              {tab === "overview" && (
                <div className="flex flex-col">
                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={runCheck.isPending}
                      onClick={() => runCheck.mutate({ monitorId: monitor.id })}
                    >
                      {runCheck.isPending ? "Checking..." : "Run check"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggle.mutate({ id: monitor.id, active: !monitor.active })
                      }
                    >
                      {monitor.active ? "Pause" : "Resume"}
                    </Button>
                  </div>

                  {/* Recent checks */}
                  <div className="flex flex-col border-t">
                    <div className="flex items-center justify-between px-6 py-3">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent checks</span>
                      {checks?.length ? (
                        <button type="button" onClick={() => setTab("checks")} className="text-[11px] text-muted-foreground hover:text-foreground">
                          View all
                        </button>
                      ) : null}
                    </div>
                    {checks?.length ? (
                      <div className="divide-y border-t">
                        {checks.slice(0, 6).map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => setSelectedCheck(c)}
                            className="flex w-full items-center justify-between px-6 py-2.5 text-xs transition-colors hover:bg-accent/30"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`size-2 rounded-full ${c.status === "up" ? "bg-emerald-500" : c.status === "degraded" ? "bg-yellow-500" : "bg-red-500"}`} />
                              <span className="font-mono">{c.latency}ms</span>
                              {c.statusCode && <span className="text-muted-foreground">{c.statusCode}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span>{c.region?.toUpperCase() ?? "—"}</span>
                              <span>{new Date(c.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-6 pb-4 text-xs text-muted-foreground">No checks yet.</p>
                    )}
                  </div>

                  {/* Dependencies */}
                  <div className="border-t px-6 py-4">
                    <MonitorDependencies monitorId={monitor.id} />
                  </div>
                </div>
              )}

              {tab === "checks" && (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between px-6 py-3 border-b">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">All checks</span>
                    {checksTotal > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {checkPage * 50 + 1}–{Math.min((checkPage + 1) * 50, checksTotal)} of {checksTotal}
                      </span>
                    )}
                  </div>
                  {checks?.length ? (
                    <div className="divide-y">
                      {checks.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedCheck(c)}
                          className="flex w-full items-center justify-between px-6 py-2.5 text-xs transition-colors hover:bg-accent/30"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`size-2 rounded-full ${c.status === "up" ? "bg-emerald-500" : c.status === "degraded" ? "bg-yellow-500" : "bg-red-500"}`} />
                            <span className="font-mono">{c.latency}ms</span>
                            {c.statusCode && <span className="text-muted-foreground">{c.statusCode}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{c.region?.toUpperCase() ?? "—"}</span>
                            <span>{new Date(c.checkedAt).toLocaleString()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-6 py-8 text-center text-xs text-muted-foreground">No checks yet.</p>
                  )}
                  {(checkPage > 0 || checksHasMore) && (
                    <div className="flex items-center justify-end gap-2 px-6 py-3 border-t">
                      <Button variant="outline" size="sm" className="text-xs" disabled={checkPage === 0} onClick={() => setCheckPage((p) => p - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" disabled={!checksHasMore} onClick={() => setCheckPage((p) => p + 1)}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {tab === "settings" && (
                <div className="flex flex-col p-6 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView("edit")}
                  >
                    Edit monitor
                  </Button>
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setView("confirmDelete")}
                    >
                      Delete monitor
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Check detail overlay */}
        <div
          className={`absolute inset-0 flex flex-col bg-card transition-transform duration-200 ease-out ${
            selectedCheck ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedCheck && (
            <>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedCheck(null)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-medium">Check details</span>
              </div>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="rounded-lg border">
                  <div className="flex items-center justify-between border-b px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge
                      variant={
                        selectedCheck.status === "up"
                          ? "default"
                          : selectedCheck.status === "degraded"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {selectedCheck.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-b px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Status code</span>
                    <span className="text-xs font-medium font-mono">{selectedCheck.statusCode ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Latency</span>
                    <span className="text-xs font-medium font-mono">{selectedCheck.latency}ms</span>
                  </div>
                  <div className="flex items-center justify-between border-b px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Region</span>
                    <span className="text-xs font-medium">{selectedCheck.region?.toUpperCase() ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Time</span>
                    <span className="text-xs font-medium">{new Date(selectedCheck.checkedAt).toLocaleString()}</span>
                  </div>
                  {selectedCheck.message && (
                    <div className="flex items-center justify-between border-t px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">Message</span>
                      <span className="text-xs font-medium">{selectedCheck.message}</span>
                    </div>
                  )}
                </div>
                {selectedCheck.responseHeaders && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium">Response headers</span>
                    <div className="rounded-lg border">
                      {Object.entries(
                        selectedCheck.responseHeaders as Record<string, string>,
                      ).map(([key, value], i, arr) => (
                        <div
                          key={key}
                          className={`flex gap-3 px-3 py-2 text-[11px] ${i < arr.length - 1 ? "border-b" : ""}`}
                        >
                          <span className="shrink-0 font-mono font-medium text-muted-foreground">{key}</span>
                          <span className="font-mono break-all text-right ml-auto">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCheck.responseBody && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium">Response body</span>
                    <pre className="rounded-lg border bg-muted/50 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all max-h-64">
                      {formatBody(selectedCheck.responseBody)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Edit overlay */}
        <div
          className={`absolute inset-0 flex flex-col bg-card transition-transform duration-200 ease-out ${
            view === "edit" ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {monitor && view === "edit" && (
            <EditMonitorOverlay
              monitor={monitor}
              onBack={() => setView("main")}
              onSuccess={() => {
                qc.invalidateQueries({ queryKey: monitorOpts.queryKey });
                qc.invalidateQueries();
                setView("main");
              }}
            />
          )}
        </div>

        {/* Confirm delete overlay */}
        <div
          className={`absolute inset-0 flex flex-col bg-card transition-transform duration-200 ease-out ${
            view === "confirmDelete" ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {monitor && view === "confirmDelete" && (
            <>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-medium">Confirm delete</span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Delete "{monitor.name}"?</span>
                  <span className="text-xs text-muted-foreground">
                    This will permanently delete this monitor and all its check history. This action cannot be undone.
                  </span>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setView("main")}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={del.isPending}
                    onClick={() => del.mutate({ id: monitor.id })}
                  >
                    {del.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditMonitorOverlay({
  monitor,
  onBack,
  onSuccess,
}: {
  monitor: {
    id: string;
    name: string;
    type: string;
    url: string | null;
    method: string | null;
    host: string | null;
    port: number | null;
    interval: number;
    timeout: number;
    regions: unknown;
    headers: unknown;
    body: string | null;
    rules: unknown;
    autoIncidents: boolean;
  };
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url ?? "");
  const [method, setMethod] = useState(monitor.method ?? "GET");
  const [host, setHost] = useState(monitor.host ?? "");
  const [port, setPort] = useState(monitor.port?.toString() ?? "");
  const [interval, setInterval_] = useState(monitor.interval.toString());
  const [timeout, setTimeout_] = useState(monitor.timeout.toString());
  const [regions, setRegions] = useState<string[]>((monitor.regions as string[]) ?? []);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    Object.entries((monitor.headers as Record<string, string>) ?? {}).map(([key, value]) => ({ key, value })),
  );
  const [body, setBody] = useState(monitor.body ?? "");
  const [rules, setRules] = useState<{ type: string; operator: string; value: string }[]>(
    (monitor.rules as { type: string; operator: string; value: string }[]) ?? [],
  );
  const [autoIncidents, setAutoIncidents] = useState(monitor.autoIncidents);

  const update = useMutation({
    ...orpc.monitors.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      toast.success("Monitor updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update");
    },
  });

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">Edit monitor</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
        </div>
        {monitor.type === "http" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : monitor.type === "tcp" ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Host</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Port</Label>
              <Input type="number" value={port} onChange={(e) => setPort(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Host</Label>
            <Input value={host} onChange={(e) => setHost(e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {monitor.type === "http" && (
          <>
            {/* Headers */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Headers</Label>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setHeaders([...headers, { key: "", value: "" }])}
                >
                  + Add
                </button>
              </div>
              {headers.map((h, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    className="h-7 flex-1 text-xs"
                    placeholder="Key"
                    value={h.key}
                    onChange={(e) => {
                      const next = [...headers];
                      next[i] = { ...next[i], key: e.target.value };
                      setHeaders(next);
                    }}
                  />
                  <Input
                    className="h-7 flex-1 text-xs"
                    placeholder="Value"
                    value={h.value}
                    onChange={(e) => {
                      const next = [...headers];
                      next[i] = { ...next[i], value: e.target.value };
                      setHeaders(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-xs"
                    onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            {/* Request body */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Request body</Label>
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder='{"key":"value"}'
              />
            </div>
            {/* Rules */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rules</Label>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setRules([...rules, { type: "status", operator: "eq", value: "200" }])}
                >
                  + Add
                </button>
              </div>
              {rules.map((r, i) => (
                <div key={i} className="flex gap-1.5">
                  <Select
                    value={r.type}
                    onValueChange={(v) => {
                      const next = [...rules];
                      next[i] = { ...next[i], type: v };
                      setRules(next);
                    }}
                  >
                    <SelectTrigger className="h-7 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="header">Header</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={r.operator}
                    onValueChange={(v) => {
                      const next = [...rules];
                      next[i] = { ...next[i], operator: v };
                      setRules(next);
                    }}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">equals</SelectItem>
                      <SelectItem value="neq">not eq</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-7 flex-1 text-xs"
                    placeholder={r.type === "status" ? "200" : "value"}
                    value={r.value}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i] = { ...next[i], value: e.target.value };
                      setRules(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-xs"
                    onClick={() => setRules(rules.filter((_, j) => j !== i))}
                  >
                    ×
                  </Button>
                </div>
              ))}
              {rules.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No rules — defaults to 2xx check.</p>
              )}
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Interval (s)</Label>
            <Input type="number" value={interval} onChange={(e) => setInterval_(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Timeout (s)</Label>
            <Input type="number" value={timeout} onChange={(e) => setTimeout_(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={autoIncidents} onCheckedChange={setAutoIncidents} />
          <Label className="text-xs">Auto-create incidents</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Regions</Label>
          <div className="flex gap-3">
            {REGIONS.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={regions.includes(r.id)}
                  onCheckedChange={(checked) =>
                    setRegions((prev) =>
                      checked ? [...prev, r.id] : prev.filter((x) => x !== r.id),
                    )
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-auto flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onBack}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={!name || update.isPending}
            onClick={() =>
              update.mutate({
                id: monitor.id,
                name,
                interval: Number(interval),
                timeout: Number(timeout),
                regions,
                autoIncidents,
                ...(monitor.type === "http"
                  ? {
                      url,
                      method,
                      headers: headers.length ? Object.fromEntries(headers.map((h) => [h.key, h.value])) : undefined,
                      body: body || undefined,
                      rules: rules.length ? rules : undefined,
                    }
                  : monitor.type === "tcp"
                    ? { host, port: Number(port) }
                    : { host }),
              })
            }
          >
            {update.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function MonitorDependencies({ monitorId }: { monitorId: string }) {
  const { isPro } = useSubscription();
  const qc = useQueryClient();
  const depsOpts = orpc.dependencies.listForMonitor.queryOptions({ input: monitorId && isPro ? { monitorId } : skipToken });
  const { data: deps } = useQuery(depsOpts);
  const { data: services } = useQuery(
    orpc.dependencies.listExternalServices.queryOptions({ input: isPro ? undefined : skipToken }),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const addDep = useMutation({
    ...orpc.dependencies.add.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: depsOpts.queryKey });
      setAddOpen(false);
      setSelectedServiceId("");
      setSearchQuery("");
      toast.success("Dependency added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add dependency");
    },
  });

  const removeDep = useMutation({
    ...orpc.dependencies.remove.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: depsOpts.queryKey });
      toast.success("Dependency removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove dependency");
    },
  });

  const existingServiceIds = new Set(deps?.map((d) => d.externalServiceId) ?? []);
  const filteredServices = services?.filter(
    (s) =>
      !existingServiceIds.has(s.id) &&
      (searchQuery === "" || s.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const DEP_COLORS: Record<string, string> = {
    operational: "bg-emerald-500",
    degraded_performance: "bg-yellow-500",
    partial_outage: "bg-orange-500",
    major_outage: "bg-red-500",
    maintenance: "bg-blue-500",
  };

  if (!isPro) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dependencies</span>
          <ProBadge />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Link external services your monitor depends on. Upgrade to Pro to use dependencies.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dependencies</span>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs">+ Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add dependency</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {filteredServices?.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">No services found.</p>
                )}
                {filteredServices?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors ${selectedServiceId === s.id ? "bg-accent" : ""}`}
                    onClick={() => setSelectedServiceId(s.id)}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded border bg-background">
                      {s.logoUrl ? (
                        <img src={s.logoUrl} alt={s.name} className="size-4 rounded" />
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground">{s.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{s.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{s.category}</span>
                    </div>
                    <span className={`size-2 rounded-full ${DEP_COLORS[s.currentStatus ?? ""] ?? "bg-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                disabled={!selectedServiceId || addDep.isPending}
                onClick={() => addDep.mutate({ monitorId, externalServiceId: selectedServiceId })}
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {deps && deps.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {deps.map((dep) => (
            <div key={dep.id} className="flex items-center gap-3 px-3 py-2">
              <span className={`size-2 shrink-0 rounded-full ${DEP_COLORS[dep.externalService.currentStatus ?? ""] ?? "bg-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{dep.externalService.name}</span>
                {dep.externalComponent && (
                  <span className="text-xs text-muted-foreground"> / {dep.externalComponent.name}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{dep.externalService.category}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => removeDep.mutate({ id: dep.id })}
                disabled={removeDep.isPending}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          No dependencies — link external services this monitor depends on.
        </p>
      )}
    </div>
  );
}

function CreateMonitorDialog({ organizationId, monitorCount }: { organizationId: string; monitorCount: number }) {
  const { isPro } = useSubscription();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"http" | "tcp" | "ping">("http");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [interval, setInterval_] = useState(isPro ? "60" : "600");
  const [regions, setRegions] = useState<string[]>(["eu"]);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [body, setBody] = useState("");
  const [rules, setRules] = useState<{ type: string; operator: string; value: string }[]>([]);
  const [autoIncidents, setAutoIncidents] = useState(false);

  const create = useMutation({
    ...orpc.monitors.create.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: orpc.monitors.list.queryOptions({
          input: { organizationId },
        }).queryKey,
      });
      setOpen(false);
      setName("");
      setUrl("");
      setHost("");
      setPort("");
      toast.success("Monitor created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create monitor");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New monitor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create monitor</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "http" | "tcp" | "ping")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="tcp">TCP</SelectItem>
                <SelectItem value="ping" disabled={!isPro}>
                  <span className="flex items-center gap-1.5">Ping{!isPro && <ProBadge />}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "http" ? (
            <div className="flex flex-col gap-1.5">
              <Label>URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          ) : type === "tcp" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label>Host</Label>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="example.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="443"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Host</Label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="example.com"
              />
            </div>
          )}
          {type === "http" && (
            <>
              <HeadersEditor headers={headers} onChange={setHeaders} />
              <div className="flex flex-col gap-1.5">
                <Label>Request body</Label>
                <Input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key":"value"}'
                />
              </div>
              <RulesEditor rules={rules} onChange={setRules} />
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Check interval</Label>
            <Select value={interval} onValueChange={setInterval_}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isPro && <SelectItem value="10">10 seconds</SelectItem>}
                {isPro && <SelectItem value="30">30 seconds</SelectItem>}
                {isPro && <SelectItem value="60">1 minute</SelectItem>}
                {isPro && <SelectItem value="300">5 minutes</SelectItem>}
                <SelectItem value="600">10 minutes</SelectItem>
                <SelectItem value="1800">30 minutes</SelectItem>
                <SelectItem value="3600">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoIncidents} onCheckedChange={setAutoIncidents} disabled={!isPro} />
            <Label className="flex items-center gap-1.5">Auto-create incidents on downtime{!isPro && <ProBadge />}</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Regions</Label>
            <div className="flex gap-3">
              {REGIONS.map((r) => {
                const isProRegion = r.id === "us" || r.id === "asia";
                return (
                  <label key={r.id} className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={regions.includes(r.id)}
                      disabled={isProRegion && !isPro}
                      onCheckedChange={(checked) =>
                        setRegions((prev) =>
                          checked
                            ? [...prev, r.id]
                            : prev.filter((x) => x !== r.id),
                        )
                      }
                    />
                    {r.label}
                    {isProRegion && !isPro && <ProBadge />}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!name || create.isPending || (monitorCount >= 1 && !isPro)}
            onClick={() =>
              create.mutate({
                organizationId,
                name,
                type,
                interval: Number(interval),
                regions,
                autoIncidents,
                ...(type === "http"
                  ? {
                      url,
                      headers: headers.length ? Object.fromEntries(headers.map((h) => [h.key, h.value])) : undefined,
                      body: body || undefined,
                      rules: rules.length ? rules : undefined,
                    }
                  : type === "tcp"
                    ? { host, port: Number(port) }
                    : { host }),
              })
            }
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HeadersEditor({
  headers,
  onChange,
}: {
  headers: { key: string; value: string }[];
  onChange: (h: { key: string; value: string }[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Headers</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onChange([...headers, { key: "", value: "" }])}
        >
          + Add
        </Button>
      </div>
      {headers.map((h, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            className="flex-1"
            placeholder="Key"
            value={h.key}
            onChange={(e) => {
              const next = [...headers];
              next[i] = { ...next[i], key: e.target.value };
              onChange(next);
            }}
          />
          <Input
            className="flex-1"
            placeholder="Value"
            value={h.value}
            onChange={(e) => {
              const next = [...headers];
              next[i] = { ...next[i], value: e.target.value };
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={() => onChange(headers.filter((_, j) => j !== i))}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}

function RulesEditor({
  rules,
  onChange,
}: {
  rules: { type: string; operator: string; value: string }[];
  onChange: (r: { type: string; operator: string; value: string }[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Rules</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onChange([...rules, { type: "status", operator: "eq", value: "200" }])}
        >
          + Add
        </Button>
      </div>
      {rules.map((r, i) => (
        <div key={i} className="flex gap-1.5">
          <Select
            value={r.type}
            onValueChange={(v) => {
              const next = [...rules];
              next[i] = { ...next[i], type: v };
              onChange(next);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="header">Header</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={r.operator}
            onValueChange={(v) => {
              const next = [...rules];
              next[i] = { ...next[i], operator: v };
              onChange(next);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eq">equals</SelectItem>
              <SelectItem value="neq">not equals</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="flex-1"
            placeholder={r.type === "status" ? "200" : "content-type: application/json"}
            value={r.value}
            onChange={(e) => {
              const next = [...rules];
              next[i] = { ...next[i], value: e.target.value };
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={() => onChange(rules.filter((_, j) => j !== i))}
          >
            ×
          </Button>
        </div>
      ))}
      {rules.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No rules — defaults to checking response is 2xx.</p>
      )}
    </div>
  );
}
