import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { INCIDENT_STATUSES, getIncidentStatusColor } from "@/lib/constants";

export const Route = createFileRoute("/_authed/dashboard/incidents/$incidentId")({
  component: IncidentDetailPage,
});

function IncidentDetailPage() {
  const { incidentId } = Route.useParams();
  const qc = useQueryClient();
  const opts = orpc.incidents.get.queryOptions({ input: { id: incidentId } });
  const { data: incident } = useQuery(opts);

  const invalidate = () => qc.invalidateQueries({ queryKey: opts.queryKey });

  const del = useMutation({
    ...orpc.incidents.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Incident deleted");
      window.history.back();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete incident");
    },
  });

  if (!incident) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/incidents"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Incidents
        </Link>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => del.mutate({ id: incident.id })}
        >
          Delete
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">{incident.title}</h1>
          <Badge variant={incident.status === "resolved" ? "secondary" : "destructive"}>
            {incident.status}
          </Badge>
          <Badge variant="outline">{incident.severity}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Started {new Date(incident.startedAt).toLocaleString()}
          {incident.resolvedAt && ` · Resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
        </p>
      </div>

      {/* Post update form */}
      {incident.status !== "resolved" && (
        <PostUpdateForm incidentId={incident.id} currentStatus={incident.status} onSuccess={invalidate} />
      )}

      <Separator />

      {/* Timeline */}
      <div>
        <h2 className="mb-4 text-xs font-medium">Timeline</h2>
        <div className="relative flex flex-col gap-0">
          {incident.updates.map((u, i) => (
            <div key={u.id} className="relative flex gap-3 pb-6 last:pb-0">
              {/* Vertical line */}
              {i < incident.updates.length - 1 && (
                <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
              )}
              {/* Dot */}
              <div className={`relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${getIncidentStatusColor(u.status)}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">{u.status}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(u.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs">{u.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <div className="rounded-lg border p-4">
      <h2 className="mb-3 text-xs font-medium">Post update</h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof INCIDENT_STATUSES[number])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the current situation..."
          />
        </div>
        <Button
          size="sm"
          className="self-end"
          disabled={!message || update.isPending}
          onClick={() => update.mutate({ id: incidentId, status, message })}
        >
          Post update
        </Button>
      </div>
    </div>
  );
}
