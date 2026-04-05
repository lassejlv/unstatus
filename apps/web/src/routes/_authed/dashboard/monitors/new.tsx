import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ChevronLeft } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge } from "@/components/upgrade-badge";
import { PLAN_LIMITS } from "@/lib/plans";

const REGIONS = [
  { id: "eu", label: "\u{1F1EA}\u{1F1FA} Europe" },
  { id: "us", label: "\u{1F1FA}\u{1F1F8} US" },
  { id: "asia", label: "\u{1F1F8}\u{1F1EC} Singapore" },
] as const;

const STEPS = [
  { id: 0, label: "Basics" },
  { id: 1, label: "Request" },
  { id: 2, label: "Rules" },
  { id: 3, label: "Settings" },
] as const;

export const Route = createFileRoute("/_authed/dashboard/monitors/new")({
  component: NewMonitorPage,
});

function NewMonitorPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const { tier } = useSubscription();
  const limits = PLAN_LIMITS[tier];
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [type, setType] = useState<"http" | "tcp" | "ping" | "redis" | "postgres">("http");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [method, setMethod] = useState("GET");
  const [interval, setInterval_] = useState(tier !== "free" ? "60" : "600");
  const [regions, setRegions] = useState<string[]>(["eu"]);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [body, setBody] = useState("");
  const [rules, setRules] = useState<{ type: string; operator: string; value: string }[]>([]);
  const [intervalSelect, setIntervalSelect] = useState(interval);
  const [autoIncidents, setAutoIncidents] = useState(false);

  const create = useMutation({
    ...orpc.monitors.create.mutationOptions(),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({
          queryKey: orpc.monitors.list.queryOptions({
            input: { organizationId: orgId },
          }).queryKey,
        });
      }
      toast.success("Monitor created");
      navigate({ to: "/dashboard/monitors" });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create monitor");
    },
  });

  const canAdvance =
    step === 0 ? !!name :
    step === 1 ? (type === "http" || type === "redis" || type === "postgres" ? !!url : !!host) :
    true;

  const isLastStep = step === STEPS.length - 1;

  function handleNext() {
    if (isLastStep) {
      create.mutate({
        organizationId: orgId!,
        name,
        type,
        interval: Number(interval),
        regions,
        autoIncidents,
        ...(type === "http"
          ? {
              url,
              method,
              headers: headers.length ? Object.fromEntries(headers.map((h) => [h.key, h.value])) : undefined,
              body: body || undefined,
              rules: rules.length ? rules : undefined,
            }
          : type === "tcp"
            ? { host, port: Number(port) }
            : type === "redis" || type === "postgres"
              ? { url, body: body || undefined }
              : { host }),
      });
    } else {
      setStep(step + 1);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link to="/dashboard/monitors" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-medium">New monitor</h1>
      </div>

      {/* Stepper */}
      <nav className="flex border-b">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { if (i < step) setStep(i); }}
            className={`relative flex-1 pb-2.5 text-center text-xs font-medium transition-colors ${
              i <= step ? "text-foreground" : "text-muted-foreground"
            } ${i < step ? "cursor-pointer" : ""}`}
          >
            {s.label}
            {i === step && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        ))}
      </nav>

      {/* Step content */}
      <div className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My API"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as typeof type)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="ping" disabled={!limits.pingMonitor}>
                    <span className="flex items-center gap-1.5">Ping{!limits.pingMonitor && <ProBadge label="Scale" />}</span>
                  </SelectItem>
                  <SelectItem value="redis" disabled={!limits.redisMonitor}>
                    <span className="flex items-center gap-1.5">Redis{!limits.redisMonitor && <ProBadge label="Scale" />}</span>
                  </SelectItem>
                  <SelectItem value="postgres" disabled={!limits.postgresMonitor}>
                    <span className="flex items-center gap-1.5">PostgreSQL{!limits.postgresMonitor && <ProBadge label="Scale" />}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            {type === "http" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>URL</Label>
                  <div className="flex gap-2">
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="HEAD">HEAD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="flex-1"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      autoFocus
                    />
                  </div>
                </div>
                <HeadersEditor headers={headers} onChange={setHeaders} />
                <div className="flex flex-col gap-1.5">
                  <Label>Request body</Label>
                  <Input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='{"key":"value"}'
                  />
                </div>
              </>
            ) : type === "tcp" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Host</Label>
                  <Input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="example.com"
                    autoFocus
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
            ) : type === "redis" || type === "postgres" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Connection URL</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={type === "redis" ? "redis://user:pass@host:6379" : "postgresql://user:pass@host:5432/dbname"}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{type === "redis" ? "Command" : "Query"} (optional)</Label>
                  <Input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={type === "redis" ? "PING" : "SELECT 1"}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label>Host</Label>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="example.com"
                  autoFocus
                />
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <RulesEditor rules={rules} onChange={setRules} type={type} />
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Check interval</Label>
              <Select
                value={intervalSelect}
                onValueChange={(v) => {
                  setIntervalSelect(v);
                  if (v !== "custom") setInterval_(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {limits.minInterval <= 10 && <SelectItem value="10">10 seconds</SelectItem>}
                  {limits.minInterval <= 30 && <SelectItem value="30">30 seconds</SelectItem>}
                  {limits.minInterval <= 60 && <SelectItem value="60">1 minute</SelectItem>}
                  {limits.minInterval <= 300 && <SelectItem value="300">5 minutes</SelectItem>}
                  <SelectItem value="600">10 minutes</SelectItem>
                  <SelectItem value="1800">30 minutes</SelectItem>
                  <SelectItem value="3600">1 hour</SelectItem>
                  {tier !== "free" && <SelectItem value="custom">Custom</SelectItem>}
                </SelectContent>
              </Select>
              {intervalSelect === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={limits.minInterval}
                    className="flex-1"
                    value={interval}
                    onChange={(e) => setInterval_(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">seconds</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={autoIncidents} onCheckedChange={setAutoIncidents} disabled={!limits.autoIncidents} />
              <Label className="flex items-center gap-1.5">Auto-create incidents on downtime{!limits.autoIncidents && <ProBadge label="Scale" />}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Regions</Label>
              <div className="flex gap-3">
                {REGIONS.map((r) => {
                  const isExtraRegion = r.id === "us" || r.id === "asia";
                  return (
                    <label key={r.id} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={regions.includes(r.id)}
                        disabled={isExtraRegion && !limits.multiRegion}
                        onCheckedChange={(checked) =>
                          setRegions((prev) =>
                            checked
                              ? [...prev, r.id]
                              : prev.filter((x) => x !== r.id),
                          )
                        }
                      />
                      {r.label}
                      {isExtraRegion && !limits.multiRegion && <ProBadge label="Scale" />}
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {step === 0 ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/monitors">Cancel</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button
          size="sm"
          disabled={!canAdvance || !orgId || (isLastStep && create.isPending)}
          onClick={handleNext}
        >
          {isLastStep ? (create.isPending ? "Creating..." : "Create") : "Next"}
        </Button>
      </div>
    </div>
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

function parseJsonBodyValue(value: string) {
  const idx = value.indexOf(":");
  if (idx === -1) return { path: value, expected: "" };
  return { path: value.slice(0, idx), expected: value.slice(idx + 1) };
}

function RulesEditor({
  rules,
  onChange,
  type: monitorType,
}: {
  rules: { type: string; operator: string; value: string }[];
  onChange: (r: { type: string; operator: string; value: string }[]) => void;
  type: "http" | "tcp" | "ping";
}) {
  function update(i: number, patch: Partial<{ type: string; operator: string; value: string }>) {
    const next = [...rules];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  const ruleTypes = monitorType === "http"
    ? [
        { value: "status", label: "Status code" },
        { value: "header", label: "Response header" },
        { value: "json_body", label: "JSON body field" },
      ]
    : [];

  const operators = [
    { value: "eq", label: "equals" },
    { value: "neq", label: "does not equal" },
    { value: "contains", label: "contains" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {rules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No rules yet. By default, any 2xx response is considered healthy.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([{ type: "status", operator: "eq", value: "200" }])}
          >
            Add a rule
          </Button>
        </div>
      ) : (
        <>
          {rules.map((r, i) => {
            const parsed = r.type === "json_body" ? parseJsonBodyValue(r.value) : null;

            return (
              <div key={i} className="relative flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
                <button
                  type="button"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xs"
                  onClick={() => onChange(rules.filter((_, j) => j !== i))}
                >
                  ×
                </button>

                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Rule {i + 1}
                </span>

                {/* "Check that..." sentence builder */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground shrink-0">Check that</span>
                    <Select value={r.type} onValueChange={(v) => update(i, { type: v, value: "" })}>
                      <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ruleTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {r.type === "json_body" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground shrink-0">at path</span>
                      <Input
                        className="h-7 flex-1 text-xs font-mono"
                        placeholder="data.status"
                        value={parsed?.path ?? ""}
                        onChange={(e) => update(i, { value: `${e.target.value}:${parsed?.expected ?? ""}` })}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Select value={r.operator} onValueChange={(v) => update(i, { operator: v })}>
                      <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {r.type === "json_body" ? (
                      <Input
                        className="h-7 flex-1 text-xs font-mono"
                        placeholder="active"
                        value={parsed?.expected ?? ""}
                        onChange={(e) => update(i, { value: `${parsed?.path ?? ""}:${e.target.value}` })}
                      />
                    ) : r.type === "header" ? (
                      <Input
                        className="h-7 flex-1 text-xs font-mono"
                        placeholder="content-type: application/json"
                        value={r.value}
                        onChange={(e) => update(i, { value: e.target.value })}
                      />
                    ) : (
                      <Input
                        className="h-7 flex-1 text-xs font-mono"
                        placeholder="200"
                        value={r.value}
                        onChange={(e) => update(i, { value: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onChange([...rules, { type: "status", operator: "eq", value: "200" }])}
          >
            Add another rule
          </Button>
        </>
      )}
    </div>
  );
}
