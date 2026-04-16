import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/orpc/client";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Search, ChevronLeft, ChevronRight, Trash2, Eye, X } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/monitors")({
  component: AdminMonitorsPage,
});

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<string, string> = {
  up: "bg-green-500",
  down: "bg-red-500",
  degraded: "bg-yellow-500",
};

function AdminMonitorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const [checksMonitorId, setChecksMonitorId] = useState<string | null>(null);
  const [checksPage, setChecksPage] = useState(0);

  const listOpts = orpc.admin.listAllMonitors.queryOptions({
    input: {
      search: search || undefined,
      status: statusFilter as "up" | "down" | "degraded" | undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
  });
  const { data } = useQuery(listOpts);

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Monitors</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} total monitors</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or URL..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["up", "down", "degraded"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(statusFilter === s ? undefined : s); setPage(0); }}
            >
              <span className={`size-1.5 rounded-full ${STATUS_COLORS[s]}`} />
              <span className="capitalize">{s}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Organization</th>
              <th className="px-4 py-2 text-left font-medium">Latency</th>
              <th className="px-4 py-2 text-left font-medium">Last Checked</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((monitor) => (
              <tr key={monitor.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <span className={`inline-block size-2 rounded-full ${STATUS_COLORS[monitor.lastStatus ?? ""] ?? "bg-gray-400"}`} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col">
                    <span className="font-medium">{monitor.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {monitor.url ?? monitor.host ?? ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-[10px]">{monitor.type}</Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{monitor.organization.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {monitor.lastLatency != null ? `${monitor.lastLatency}ms` : "-"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {monitor.lastCheckedAt
                    ? new Date(monitor.lastCheckedAt).toLocaleString()
                    : "Never"}
                </td>
                <td className="px-4 py-2.5 text-right">
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
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No monitors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-1.5 text-left font-medium">Status</th>
                  <th className="px-3 py-1.5 text-left font-medium">Code</th>
                  <th className="px-3 py-1.5 text-left font-medium">Latency</th>
                  <th className="px-3 py-1.5 text-left font-medium">Region</th>
                  <th className="px-3 py-1.5 text-left font-medium">Message</th>
                  <th className="px-3 py-1.5 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {checksData?.items.map((check) => (
                  <tr key={check.id} className="border-b">
                    <td className="px-3 py-1.5">
                      <span className={`inline-block size-1.5 rounded-full ${STATUS_COLORS[check.status] ?? "bg-gray-400"}`} />
                    </td>
                    <td className="px-3 py-1.5">{check.statusCode ?? "-"}</td>
                    <td className="px-3 py-1.5">{check.latency}ms</td>
                    <td className="px-3 py-1.5">{check.region ?? "-"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[200px]">
                      {check.message ?? "-"}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {new Date(check.checkedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {checksData && checksData.total > 20 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {checksData.total} total checks
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-6 text-xs" disabled={checksPage === 0} onClick={() => setChecksPage(checksPage - 1)}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs" disabled={(checksPage + 1) * 20 >= checksData.total} onClick={() => setChecksPage(checksPage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
