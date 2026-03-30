import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authed/dashboard/monitors/$monitorId")({
  component: MonitorDetailPage,
});

function MonitorDetailPage() {
  const { monitorId } = Route.useParams();
  const qc = useQueryClient();
  const { data: monitor } = useQuery(
    orpc.monitors.get.queryOptions({ input: { id: monitorId } }),
  );
  const { data: checks } = useQuery(
    orpc.monitors.checks.queryOptions({ input: { monitorId } }),
  );

  const toggle = useMutation({
    ...orpc.monitors.update.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: orpc.monitors.get.queryOptions({
          input: { id: monitorId },
        }).queryKey,
      });
    },
  });

  const del = useMutation({
    ...orpc.monitors.delete.mutationOptions(),
    onSuccess: () => {
      window.history.back();
    },
  });

  if (!monitor) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/monitors"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Monitors
          </Link>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toggle.mutate({ id: monitor.id, active: !monitor.active })
            }
          >
            {monitor.active ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => del.mutate({ id: monitor.id })}
          >
            Delete
          </Button>
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
          : `${monitor.host}:${monitor.port}`}
        {" · "}
        {monitor.interval}s interval · {monitor.timeout}s timeout
      </p>

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
              <TableRow key={c.id}>
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
    </div>
  );
}
