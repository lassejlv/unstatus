import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

const REGIONS = [
  { id: "eu", label: "🇪🇺 Europe" },
  { id: "us", label: "🇺🇸 US" },
  { id: "asia", label: "🇸🇬 Singapore" },
] as const;

export const Route = createFileRoute("/_authed/dashboard/monitors/$monitorId")({
  component: MonitorDetailPage,
});

function MonitorDetailPage() {
  const { monitorId } = Route.useParams();
  const qc = useQueryClient();
  const monitorOpts = orpc.monitors.get.queryOptions({ input: { id: monitorId } });
  const checksOpts = orpc.monitors.checks.queryOptions({ input: { monitorId } });
  const { data: monitor } = useQuery(monitorOpts);
  const { data: checks } = useQuery(checksOpts);

  const invalidate = () => qc.invalidateQueries({ queryKey: monitorOpts.queryKey });

  const toggle = useMutation({
    ...orpc.monitors.update.mutationOptions(),
    onSuccess: () => {
      invalidate();
      toast.success("Monitor updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update monitor");
    },
  });

  const del = useMutation({
    ...orpc.monitors.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Monitor deleted");
      window.history.back();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete monitor");
    },
  });

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

  const [selectedCheck, setSelectedCheck] = useState<NonNullable<typeof checks>[0] | null>(null);

  if (!monitor) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/monitors"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Monitors
        </Link>
        <div className="flex gap-2">
          <EditMonitorDialog monitor={monitor} onSuccess={invalidate} />
          <Button
            variant="outline"
            size="sm"
            disabled={runCheck.isPending}
            onClick={() => runCheck.mutate({ monitorId: monitor.id })}
          >
            {runCheck.isPending ? "Checking…" : "Run check"}
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete monitor?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{monitor.name}" and all its check history, incidents, and status page links. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => del.mutate({ id: monitor.id })}
                >
                  Delete monitor
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium">{monitor.name}</h1>
        <Badge variant="outline">{monitor.type.toUpperCase()}</Badge>
        <Badge variant={monitor.active ? "default" : "secondary"}>
          {monitor.active ? "Active" : "Paused"}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        {monitor.type === "http"
          ? `${monitor.method} ${monitor.url}`
          : monitor.type === "ping"
            ? `ping ${monitor.host}`
            : `${monitor.host}:${monitor.port}`}
        {" · "}
        {monitor.interval}s interval · {monitor.timeout}s timeout
      </p>

      {/* Dependencies */}
      <MonitorDependencies monitorId={monitor.id} />

      <h2 className="text-xs font-medium">Check history</h2>
      {checks?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Status Code</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => setSelectedCheck(c)}
              >
                <TableCell>
                  <Badge
                    variant={
                      c.status === "up"
                        ? "default"
                        : c.status === "degraded"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell>{c.latency}ms</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.statusCode ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.region ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(c.checkedAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-xs text-muted-foreground">No checks yet.</p>
      )}

      <Sheet open={!!selectedCheck} onOpenChange={(open) => !open && setSelectedCheck(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedCheck && (
            <>
              <SheetHeader>
                <SheetTitle>Check details</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 pt-4">
                {/* Summary */}
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

                {/* Response headers */}
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

                {/* Response body */}
                {selectedCheck.responseBody && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium">Response body</span>
                    <pre className="rounded-lg border bg-muted/50 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all max-h-96">
                      {formatBody(selectedCheck.responseBody)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

type MonitorData = {
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

function EditMonitorDialog({
  monitor,
  onSuccess,
}: {
  monitor: MonitorData;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url ?? "");
  const [method, setMethod] = useState(monitor.method ?? "GET");
  const [host, setHost] = useState(monitor.host ?? "");
  const [port, setPort] = useState(monitor.port?.toString() ?? "");
  const [interval, setInterval_] = useState(monitor.interval.toString());
  const [timeout, setTimeout_] = useState(monitor.timeout.toString());
  const [regions, setRegions] = useState<string[]>(
    (monitor.regions as string[]) ?? [],
  );
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    Object.entries((monitor.headers as Record<string, string>) ?? {}).map(([key, value]) => ({ key, value })),
  );
  const [body, setBody] = useState(monitor.body ?? "");
  const [rules, setRules] = useState<{ type: string; operator: string; value: string }[]>(
    (monitor.rules as { type: string; operator: string; value: string }[]) ?? [],
  );
  const [autoIncidents, setAutoIncidents] = useState(monitor.autoIncidents);

  useEffect(() => {
    if (open) {
      setName(monitor.name);
      setUrl(monitor.url ?? "");
      setMethod(monitor.method ?? "GET");
      setHost(monitor.host ?? "");
      setPort(monitor.port?.toString() ?? "");
      setInterval_(monitor.interval.toString());
      setTimeout_(monitor.timeout.toString());
      setRegions((monitor.regions as string[]) ?? []);
      setHeaders(Object.entries((monitor.headers as Record<string, string>) ?? {}).map(([key, value]) => ({ key, value })));
      setBody(monitor.body ?? "");
      setRules((monitor.rules as { type: string; operator: string; value: string }[]) ?? []);
      setAutoIncidents(monitor.autoIncidents);
    }
  }, [open, monitor]);

  const update = useMutation({
    ...orpc.monitors.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      setOpen(false);
      toast.success("Monitor updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update monitor");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit monitor</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {monitor.type === "http" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map(
                      (m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : monitor.type === "tcp" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label>Host</Label>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Host</Label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>
          )}
          {monitor.type === "http" && (
            <>
              <HeadersEditor headers={headers} onChange={setHeaders} />
              <div className="flex flex-col gap-1.5">
                <Label>Request body</Label>
                <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"key":"value"}' />
              </div>
              <RulesEditor rules={rules} onChange={setRules} />
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={autoIncidents} onCheckedChange={setAutoIncidents} />
            <Label>Auto-create incidents on downtime</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Interval (s)</Label>
              <Input
                type="number"
                value={interval}
                onChange={(e) => setInterval_(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Timeout (s)</Label>
              <Input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout_(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Regions</Label>
            <div className="flex gap-3">
              {REGIONS.map((r) => (
                <label key={r.id} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={regions.includes(r.id)}
                    onCheckedChange={(checked) =>
                      setRegions((prev) =>
                        checked
                          ? [...prev, r.id]
                          : prev.filter((x) => x !== r.id),
                      )
                    }
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
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
            Save
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
        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onChange([...headers, { key: "", value: "" }])}>+ Add</Button>
      </div>
      {headers.map((h, i) => (
        <div key={i} className="flex gap-1.5">
          <Input className="flex-1" placeholder="Key" value={h.key} onChange={(e) => { const next = [...headers]; next[i] = { ...next[i], key: e.target.value }; onChange(next); }} />
          <Input className="flex-1" placeholder="Value" value={h.value} onChange={(e) => { const next = [...headers]; next[i] = { ...next[i], value: e.target.value }; onChange(next); }} />
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => onChange(headers.filter((_, j) => j !== i))}>×</Button>
        </div>
      ))}
    </div>
  );
}

function MonitorDependencies({ monitorId }: { monitorId: string }) {
  const qc = useQueryClient();
  const depsOpts = orpc.dependencies.listForMonitor.queryOptions({ input: { monitorId } });
  const { data: deps } = useQuery(depsOpts);
  const { data: services } = useQuery(
    orpc.dependencies.listExternalServices.queryOptions({ input: undefined }),
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

  const STATUS_COLORS: Record<string, string> = {
    operational: "bg-emerald-500",
    degraded_performance: "bg-yellow-500",
    partial_outage: "bg-orange-500",
    major_outage: "bg-red-500",
    maintenance: "bg-blue-500",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium">Dependencies</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              + Add
            </Button>
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
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors ${
                      selectedServiceId === s.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedServiceId(s.id)}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded border bg-background">
                      {s.logoUrl ? (
                        <img src={s.logoUrl} alt={s.name} className="size-4 rounded" />
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {s.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{s.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{s.category}</span>
                    </div>
                    <span
                      className={`size-2 rounded-full ${
                        STATUS_COLORS[s.currentStatus ?? ""] ?? "bg-muted-foreground"
                      }`}
                    />
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
                onClick={() =>
                  addDep.mutate({
                    monitorId,
                    externalServiceId: selectedServiceId,
                  })
                }
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {deps && deps.length > 0 ? (
        <div className="rounded-lg border divide-y">
          {deps.map((dep) => (
            <div key={dep.id} className="flex items-center gap-3 px-3 py-2">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  STATUS_COLORS[dep.externalService.currentStatus ?? ""] ?? "bg-muted-foreground"
                }`}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{dep.externalService.name}</span>
                {dep.externalComponent && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    / {dep.externalComponent.name}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {dep.externalService.category}
              </span>
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
        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onChange([...rules, { type: "status", operator: "eq", value: "200" }])}>+ Add</Button>
      </div>
      {rules.map((r, i) => (
        <div key={i} className="flex gap-1.5">
          <Select value={r.type} onValueChange={(v) => { const next = [...rules]; next[i] = { ...next[i], type: v }; onChange(next); }}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="header">Header</SelectItem>
            </SelectContent>
          </Select>
          <Select value={r.operator} onValueChange={(v) => { const next = [...rules]; next[i] = { ...next[i], operator: v }; onChange(next); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eq">equals</SelectItem>
              <SelectItem value="neq">not equals</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
            </SelectContent>
          </Select>
          <Input className="flex-1" placeholder={r.type === "status" ? "200" : "content-type: application/json"} value={r.value} onChange={(e) => { const next = [...rules]; next[i] = { ...next[i], value: e.target.value }; onChange(next); }} />
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => onChange(rules.filter((_, j) => j !== i))}>×</Button>
        </div>
      ))}
      {rules.length === 0 && <p className="text-[11px] text-muted-foreground">No rules — defaults to checking response is 2xx.</p>}
    </div>
  );
}
