import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

const REGIONS = [
  { id: "eu", label: "Europe" },
  { id: "us", label: "US" },
  { id: "asia", label: "Asia" },
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
  const { data: monitors } = useQuery(monitorsQuery);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium">Monitors</h1>
        {activeOrg && <CreateMonitorDialog organizationId={activeOrg.id} />}
      </div>
      {monitors?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Regions</TableHead>
              <TableHead>Interval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monitors.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link
                    to="/dashboard/monitors/$monitorId"
                    params={{ monitorId: m.id }}
                    className="font-medium hover:underline"
                  >
                    {m.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{m.type.toUpperCase()}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.type === "http" ? m.url : `${m.host}:${m.port}`}
                </TableCell>
                <TableCell>
                  <Badge variant={m.active ? "default" : "secondary"}>
                    {m.active ? "Active" : "Paused"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {((m.regions as string[]) ?? [])
                    .map((r) => r.toUpperCase())
                    .join(", ") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.interval}s
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No monitors</EmptyTitle>
            <EmptyDescription>
              Create your first monitor to start tracking uptime.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

function CreateMonitorDialog({ organizationId }: { organizationId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"http" | "tcp">("http");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
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
              onValueChange={(v) => setType(v as "http" | "tcp")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="tcp">TCP</SelectItem>
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
          ) : (
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
          <div className="flex items-center gap-2">
            <Switch checked={autoIncidents} onCheckedChange={setAutoIncidents} />
            <Label>Auto-create incidents on downtime</Label>
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
            disabled={!name || create.isPending}
            onClick={() =>
              create.mutate({
                organizationId,
                name,
                type,
                regions,
                autoIncidents,
                ...(type === "http"
                  ? {
                      url,
                      headers: headers.length ? Object.fromEntries(headers.map((h) => [h.key, h.value])) : undefined,
                      body: body || undefined,
                      rules: rules.length ? rules : undefined,
                    }
                  : { host, port: Number(port) }),
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
