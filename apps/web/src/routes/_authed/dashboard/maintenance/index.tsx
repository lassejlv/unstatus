import { createFileRoute } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { X, Play, Square, Ban } from "lucide-react";

export const Route = createFileRoute(
  "/_authed/dashboard/maintenance/",
)({
  component: MaintenancePage,
});

type StatusFilter = "all" | "scheduled" | "in_progress" | "completed";

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  scheduled: { variant: "outline", label: "Scheduled" },
  in_progress: { variant: "default", label: "In Progress" },
  completed: { variant: "secondary", label: "Completed" },
  cancelled: { variant: "secondary", label: "Cancelled" },
};

function MaintenancePage() {
  const { activeOrg } = useOrg();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: windows, isLoading } = useQuery(
    orpc.maintenance.list.queryOptions({
      input: activeOrg ? { organizationId: activeOrg.id } : skipToken,
    }),
  );

  const { data: monitors } = useQuery(
    orpc.monitors.list.queryOptions({
      input: activeOrg ? { organizationId: activeOrg.id } : skipToken,
    }),
  );

  const filtered = windows?.filter((w: any) => {
    if (filter === "all") return true;
    return w.status === filter;
  }) ?? [];

  const selected = windows?.find((w: any) => w.id === selectedId) ?? null;

  const startMut = useMutation({
    ...orpc.maintenance.start.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries(); toast.success("Maintenance started"); },
    onError: (err: any) => toast.error(err.message),
  });

  const completeMut = useMutation({
    ...orpc.maintenance.complete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries(); toast.success("Maintenance completed"); },
    onError: (err: any) => toast.error(err.message),
  });

  const cancelMut = useMutation({
    ...orpc.maintenance.cancel.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries(); toast.success("Maintenance cancelled"); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    ...orpc.maintenance.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries(); setSelectedId(null); toast.success("Maintenance deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (!activeOrg) return null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Schedule maintenance windows to pause monitoring and notify users.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Schedule Maintenance</Button>
          </DialogTrigger>
          <CreateMaintenanceDialog
            organizationId={activeOrg.id}
            monitors={monitors ?? []}
            onSuccess={() => { qc.invalidateQueries(); setCreateOpen(false); }}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {(["all", "scheduled", "in_progress", "completed"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{filter === "all" ? "No maintenance windows" : `No ${filter.replace("_", " ")} maintenance`}</EmptyTitle>
            <EmptyDescription>
              {filter === "all"
                ? "Schedule your first maintenance window to let users know about planned downtime."
                : "No maintenance windows match this filter."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex gap-4">
          {/* Table */}
          <div className={`${selected ? "flex-1" : "w-full"} rounded-lg border`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monitors</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w: any) => (
                  <TableRow
                    key={w.id}
                    className={`cursor-pointer ${selectedId === w.id ? "bg-accent" : ""}`}
                    onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}
                  >
                    <TableCell className="font-medium">{w.title}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[w.status]?.variant ?? "outline"}>
                        {STATUS_BADGE[w.status]?.label ?? w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.monitors.length} monitor{w.monitors.length !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(w.scheduledStart).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(w.scheduledEnd).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Sidecar */}
          {selected && (
            <div className="w-80 shrink-0 rounded-lg border bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-sm font-medium truncate">{selected.title}</h3>
                <button type="button" onClick={() => setSelectedId(null)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="px-4 py-3 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={STATUS_BADGE[selected.status]?.variant ?? "outline"}>
                    {STATUS_BADGE[selected.status]?.label ?? selected.status}
                  </Badge>
                </div>
                {selected.description && (
                  <div>
                    <span className="text-muted-foreground text-xs">Description</span>
                    <p className="text-xs mt-0.5">{selected.description}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Start</span>
                  <span className="text-xs">{new Date(selected.scheduledStart).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled End</span>
                  <span className="text-xs">{new Date(selected.scheduledEnd).toLocaleString()}</span>
                </div>
                {selected.actualStart && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Start</span>
                    <span className="text-xs">{new Date(selected.actualStart).toLocaleString()}</span>
                  </div>
                )}
                {selected.actualEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual End</span>
                    <span className="text-xs">{new Date(selected.actualEnd).toLocaleString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Affected Monitors</span>
                  <div className="mt-1.5 space-y-1">
                    {selected.monitors.map((m: any) => (
                      <div key={m.id} className="text-xs px-2 py-1 rounded bg-accent/50">{m.monitor.name}</div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 pt-2 border-t">
                  {selected.status === "scheduled" && (
                    <>
                      <Button size="sm" className="w-full text-xs" onClick={() => startMut.mutate({ id: selected.id })} disabled={startMut.isPending}>
                        <Play className="size-3 mr-1.5" /> Start Now
                      </Button>
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => cancelMut.mutate({ id: selected.id })} disabled={cancelMut.isPending}>
                        <Ban className="size-3 mr-1.5" /> Cancel
                      </Button>
                      <Button size="sm" variant="destructive" className="w-full text-xs" onClick={() => deleteMut.mutate({ id: selected.id })} disabled={deleteMut.isPending}>
                        Delete
                      </Button>
                    </>
                  )}
                  {selected.status === "in_progress" && (
                    <Button size="sm" className="w-full text-xs" onClick={() => completeMut.mutate({ id: selected.id })} disabled={completeMut.isPending}>
                      <Square className="size-3 mr-1.5" /> Complete Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateMaintenanceDialog({
  organizationId,
  monitors,
  onSuccess,
}: {
  organizationId: string;
  monitors: any[];
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set());

  const createMut = useMutation({
    ...orpc.maintenance.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Maintenance scheduled");
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create maintenance"),
  });

  const toggleMonitor = (id: string) => {
    setSelectedMonitors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!title.trim() || !start || !end || selectedMonitors.size === 0) {
      toast.error("Fill in all fields and select at least one monitor");
      return;
    }
    createMut.mutate({
      organizationId,
      title: title.trim(),
      description: description.trim() || undefined,
      scheduledStart: new Date(start),
      scheduledEnd: new Date(end),
      monitorIds: [...selectedMonitors],
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Schedule Maintenance</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Database migration" className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Description (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Upgrading the database to v15..." className="h-8 text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Start</Label>
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">End</Label>
            <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Affected Monitors</Label>
          <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
            {monitors.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No monitors found.</p>
            ) : (
              monitors.map((m: any) => (
                <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent/50 cursor-pointer">
                  <Checkbox
                    checked={selectedMonitors.has(m.id)}
                    onCheckedChange={() => toggleMonitor(m.id)}
                  />
                  <span>{m.name}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{m.type}</Badge>
                </label>
              ))
            )}
          </div>
          {selectedMonitors.size > 0 && (
            <span className="text-[10px] text-muted-foreground">{selectedMonitors.size} selected</span>
          )}
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={handleCreate} disabled={createMut.isPending}>
          {createMut.isPending ? "Scheduling..." : "Schedule"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
