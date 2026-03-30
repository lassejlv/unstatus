import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export const Route = createFileRoute("/_authed/dashboard/incidents/")({
  component: IncidentsPage,
});

function IncidentsPage() {
  const { activeOrg } = useOrg();
  const navigate = useNavigate();
  const orgId = activeOrg?.id;
  const monitorsQuery = orpc.monitors.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const incidentsQuery = orpc.incidents.listByOrg.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });

  const { data: monitors } = useQuery(monitorsQuery);
  const { data: incidents } = useQuery(incidentsQuery);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium">Incidents</h1>
        {monitors?.length ? (
          <CreateIncidentDialog monitors={monitors} orgId={orgId!} />
        ) : null}
      </div>
      {incidents?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Resolved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((i) => (
              <TableRow
                key={i.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/dashboard/incidents/$incidentId",
                    params: { incidentId: i.id },
                  })
                }
              >
                <TableCell className="font-medium">{i.title}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      i.status === "resolved" ? "secondary" : "destructive"
                    }
                  >
                    {i.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{i.severity}</Badge>
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
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No incidents</EmptyTitle>
            <EmptyDescription>
              No incidents have been reported yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
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
  const [monitorId, setMonitorId] = useState(monitors[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"minor" | "major" | "critical">(
    "minor",
  );
  const [message, setMessage] = useState("");

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
            <Label>Monitor</Label>
            <Select value={monitorId} onValueChange={setMonitorId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monitors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="minor">Minor</SelectItem>
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
            disabled={!title || !message || create.isPending}
            onClick={() =>
              create.mutate({ monitorId, title, severity, message })
            }
          >
            Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
