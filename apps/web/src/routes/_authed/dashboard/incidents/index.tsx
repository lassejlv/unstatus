import { createFileRoute } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { X, AlertTriangle } from "lucide-react";
import { INCIDENT_STATUSES, getIncidentStatusColor } from "@/lib/constants";

export const Route = createFileRoute("/_authed/dashboard/incidents/")({
  component: IncidentsPage,
});

function IncidentsPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const monitorsQuery = orpc.monitors.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const incidentsQuery = orpc.incidents.listByOrg.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });

  const { data: monitors, isLoading: monitorsLoading } = useQuery(monitorsQuery);
  const { data: incidents, isLoading: incidentsLoading } = useQuery(incidentsQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      return true;
    });
  }, [incidents, statusFilter, severityFilter]);

  if (monitorsLoading || incidentsLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
        
        {/* Filters skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        
        {/* Incidents table skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-4 min-h-0">
      {/* Main content */}
      <div className="flex flex-1 flex-col gap-4 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Incidents</h1>
          {monitors?.length ? (
            <CreateIncidentDialog monitors={monitors} orgId={orgId!} />
          ) : null}
        </div>
        {(incidents?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {["all", "investigating", "identified", "monitoring", "resolved"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex gap-1">
              {["all", "maintenance", "minor", "degraded", "major", "critical"].map((s) => (
                <Button
                  key={s}
                  variant={severityFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setSeverityFilter(s)}
                >
                  {s === "all" ? "All severity" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}
        {filteredIncidents.length ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Monitor</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((i) => (
                  <TableRow
                    key={i.id}
                    className={`cursor-pointer ${selectedId === i.id ? "bg-accent" : ""}`}
                    onClick={() => setSelectedId(selectedId === i.id ? null : i.id)}
                  >
                    <TableCell className="font-medium">{i.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.monitors?.length > 0
                        ? i.monitors.map((m) => m.monitor.name).join(", ")
                        : i.monitor?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={i.severity === "critical" || i.severity === "major" ? "destructive" : "outline"}
                      >
                        {i.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.status === "resolved" ? "secondary" : "destructive"}>
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(i.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.resolvedAt ? new Date(i.resolvedAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : incidents?.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No incidents match your filters.
          </div>
        ) : (
          <Empty>
            <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/50 mx-auto mb-3">
              <AlertTriangle className="size-5 text-muted-foreground" />
            </div>
            <EmptyHeader>
              <EmptyTitle>No incidents</EmptyTitle>
              <EmptyDescription>
                {monitors?.length
                  ? "No incidents have been reported yet. That's a good thing!"
                  : "Create a monitor first to start reporting incidents."}
              </EmptyDescription>
            </EmptyHeader>
            {monitors?.length ? (
              <CreateIncidentDialog monitors={monitors} orgId={orgId!} />
            ) : null}
          </Empty>
        )}
      </div>

      {/* Sidecar panel */}
      <IncidentSidecar
        incidentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function IncidentSidecar({
  incidentId,
  onClose,
}: {
  incidentId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const opts = orpc.incidents.get.queryOptions({
    input: incidentId ? { id: incidentId } : skipToken,
  });
  const { data: incident } = useQuery(opts);

  const invalidate = () => qc.invalidateQueries({ queryKey: opts.queryKey });

  const del = useMutation({
    ...orpc.incidents.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Incident deleted");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete");
    },
  });

  const isOpen = incidentId !== null;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-hidden transition-transform duration-300 ease-out md:relative md:inset-auto md:z-auto md:w-auto md:max-w-none md:shrink-0 md:transition-all ${
          isOpen ? "translate-x-0 md:w-[440px] md:opacity-100" : "translate-x-full md:w-0 md:translate-x-0 md:opacity-0"
        }`}
      >
        <div className="flex h-full w-full flex-col border-l bg-card md:w-[440px] md:rounded-xl md:border md:shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium truncate">
            {incident?.title ?? "Loading..."}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {!incident ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-5" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {/* Info */}
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant={incident.status === "resolved" ? "secondary" : "destructive"}>
                  {incident.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Severity</span>
                <Badge variant="outline">{incident.severity}</Badge>
              </div>
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Started</span>
                <span className="text-xs font-medium">
                  {new Date(incident.startedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Resolved</span>
                <span className="text-xs font-medium">
                  {incident.resolvedAt
                    ? new Date(incident.resolvedAt).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>

            {/* Post update */}
            {incident.status !== "resolved" && (
              <PostUpdateForm
                incidentId={incident.id}
                currentStatus={incident.status}
                onSuccess={invalidate}
              />
            )}

            {/* Timeline */}
            {incident.updates.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium">Timeline</span>
                <div className="flex flex-col">
                  {incident.updates.map((u, i) => (
                    <div key={u.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < incident.updates.length - 1 && (
                        <div className="absolute left-[5px] top-3 bottom-0 w-px bg-border" />
                      )}
                      <div className={`relative z-10 mt-0.5 size-2.5 shrink-0 rounded-full border-2 ${getIncidentStatusColor(u.status)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">
                            {u.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{u.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger zone */}
            <div className="mt-auto pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => del.mutate({ id: incident.id })}
              >
                Delete incident
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function PostUpdateForm({
  incidentId,
  currentStatus,
  onSuccess,
}: {
  incidentId: string;
  currentStatus: string;
  onSuccess: () => void;
}) {
  const nextStatus = INCIDENT_STATUSES[Math.min(INCIDENT_STATUSES.indexOf(currentStatus as typeof INCIDENT_STATUSES[number]) + 1, INCIDENT_STATUSES.length - 1)];
  const [status, setStatus] = useState<typeof INCIDENT_STATUSES[number]>(nextStatus);
  const [message, setMessage] = useState("");

  const update = useMutation({
    ...orpc.incidents.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      setMessage("");
      toast.success("Update posted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to post update");
    },
  });

  return (
    <div className="rounded-lg border p-3">
      <span className="text-xs font-medium">Post update</span>
      <div className="flex flex-col gap-2.5 mt-2.5">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof INCIDENT_STATUSES[number])}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INCIDENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the current situation..."
          className="min-h-[60px] text-xs"
        />
        <Button
          size="sm"
          className="self-end h-7 text-xs"
          disabled={!message || update.isPending}
          onClick={() => update.mutate({ id: incidentId, status, message })}
        >
          Post
        </Button>
      </div>
    </div>
  );
}

function CreateIncidentDialog({
  monitors,
  orgId,
}: {
  monitors: Array<{ id: string; name: string }>;
  orgId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"maintenance" | "minor" | "degraded" | "major" | "critical">("minor");
  const [message, setMessage] = useState("");

  const toggleMonitor = (id: string) => {
    setSelectedMonitors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const create = useMutation({
    ...orpc.incidents.create.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: orpc.incidents.listByOrg.queryOptions({
          input: { organizationId: orgId },
        }).queryKey,
      });
      setOpen(false);
      setTitle("");
      setMessage("");
      toast.success("Incident reported");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to report incident");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Report incident</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report incident</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Affected Monitors</Label>
            <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
              {monitors.map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 cursor-pointer">
                  <Checkbox
                    checked={selectedMonitors.has(m.id)}
                    onCheckedChange={() => toggleMonitor(m.id)}
                  />
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
            {selectedMonitors.size > 0 && (
              <span className="text-xs text-muted-foreground">{selectedMonitors.size} selected</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="API degradation"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Severity</Label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as typeof severity)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the incident..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!title || !message || selectedMonitors.size === 0 || create.isPending}
            onClick={() =>
              create.mutate({ monitorIds: [...selectedMonitors], title, severity, message })
            }
          >
            Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
