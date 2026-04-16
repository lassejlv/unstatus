import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/orpc/client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { StatusDot } from "@/components/ui/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Trash2, Eye, X } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/monitors")({
  component: AdminMonitorsPage,
});

const PAGE_SIZE = 25;

type ActiveFilter = "all" | "active" | "paused";

function AdminMonitorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(0);
  const [checksMonitorId, setChecksMonitorId] = useState<string | null>(null);
  const [checksPage, setChecksPage] = useState(0);

  const listOpts = orpc.admin.listAllMonitors.queryOptions({
    input: {
      search: search || undefined,
      status: statusFilter as "up" | "down" | "degraded" | undefined,
      activeState: activeFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
  });
  const { data, isLoading } = useQuery(listOpts);

  const { data: checksData } = useQuery({
    ...orpc.admin.getMonitorChecks.queryOptions({
      input: { monitorId: checksMonitorId!, limit: 20, offset: checksPage * 20 },
    }),
    enabled: !!checksMonitorId,
  });

  const deleteMonitor = useMutation({
    mutationFn: (monitorId: string) => client.admin.deleteMonitor({ monitorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listOpts.queryKey });
      toast.success("Monitor deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const checksTotalPages = checksData ? Math.ceil(checksData.total / 20) : 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="Monitors"
        description={`${data?.total ?? 0} total monitors`}
      />

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onValueChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Search by name or URL..."
          className="flex-1"
        />
        <div className="flex gap-1">
          {(["up", "down", "degraded"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(statusFilter === s ? undefined : s); setPage(0); }}
            >
              <StatusDot status={s} size="xs" />
              <span className="capitalize">{s}</span>
            </Button>
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-1">
          {(["all", "active", "paused"] as const).map((state) => (
            <Button
              key={state}
              variant={activeFilter === state ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveFilter(state); setPage(0); }}
            >
              <span className="capitalize">{state}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Last Checked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="size-5 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No monitors found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((monitor) => (
                <TableRow key={monitor.id} className={!monitor.active ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusDot
                        status={monitor.active ? (monitor.lastStatus as "up" | "down" | "degraded") : "paused"}
                        size="sm"
                      />
                      {!monitor.active && <span className="text-xs text-muted-foreground">(paused)</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{monitor.name}</span>
                      <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {monitor.url ?? monitor.host ?? ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{monitor.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{monitor.organization.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {monitor.lastLatency != null ? `${monitor.lastLatency}ms` : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {monitor.lastCheckedAt
                      ? new Date(monitor.lastCheckedAt).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => { setChecksMonitorId(monitor.id); setChecksPage(0); }}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete monitor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{monitor.name}" from {monitor.organization.name} and all its check history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMonitor.mutate(monitor.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={data?.total}
        pageSize={PAGE_SIZE}
      />

      {/* Check history panel */}
      {checksMonitorId && (
        <div className="rounded-md border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Check History</h2>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setChecksMonitorId(null)}>
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Latency</TableHead>
                  <TableHead className="text-xs">Region</TableHead>
                  <TableHead className="text-xs">Message</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checksData?.items.map((check) => (
                  <TableRow key={check.id}>
                    <TableCell className="py-1.5">
                      <StatusDot status={check.status as "up" | "down" | "degraded"} size="xs" />
                    </TableCell>
                    <TableCell className="py-1.5 text-xs">{check.statusCode ?? "-"}</TableCell>
                    <TableCell className="py-1.5 text-xs">{check.latency}ms</TableCell>
                    <TableCell className="py-1.5 text-xs">{check.region ?? "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate py-1.5 text-xs text-muted-foreground">
                      {check.message ?? "-"}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs text-muted-foreground">
                      {new Date(check.checkedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={checksPage}
            totalPages={checksTotalPages}
            onPageChange={setChecksPage}
            totalItems={checksData?.total}
            pageSize={20}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}
