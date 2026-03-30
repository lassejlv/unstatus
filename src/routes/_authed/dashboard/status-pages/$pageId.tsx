import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authed/dashboard/status-pages/$pageId")(
  {
    component: StatusPageDetailPage,
  },
);

function StatusPageDetailPage() {
  const { pageId } = Route.useParams();
  const qc = useQueryClient();
  const { activeOrg } = useOrg();
  const pageOpts = orpc.statusPages.get.queryOptions({
    input: { id: pageId },
  });
  const { data: page } = useQuery(pageOpts);
  const customDomainStatusOpts = orpc.statusPages.getCustomDomainStatus.queryOptions(
    {
      input: { pageId },
    },
  );
  const { data: customDomainStatus } = useQuery(customDomainStatusOpts);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: pageOpts.queryKey });
    void qc.invalidateQueries({ queryKey: customDomainStatusOpts.queryKey });
  };

  const del = useMutation({
    ...orpc.statusPages.delete.mutationOptions(),
    onSuccess: () => window.history.back(),
  });

  const removeMonitor = useMutation({
    ...orpc.statusPages.removeMonitor.mutationOptions(),
    onSuccess: invalidate,
  });

  if (!page) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/status-pages"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Status Pages
        </Link>
        <div className="flex gap-2">
          <EditPageDialog page={page} onSuccess={invalidate} />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                page.customDomain
                  ? `https://${page.customDomain}`
                  : `/status/${page.slug}`,
                "_blank",
              )
            }
          >
            View
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => del.mutate({ id: page.id })}
          >
            Delete
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">{page.name}</h1>
          <Badge variant={page.isPublic ? "default" : "secondary"}>
            {page.isPublic ? "Public" : "Private"}
          </Badge>
        </div>
        <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
          <p>/status/{page.slug}</p>
          {page.customDomain ? <p>{page.customDomain}</p> : null}
        </div>
      </div>

      <CustomDomainCard
        page={page}
        status={customDomainStatus}
        onSuccess={invalidate}
      />

      {/* Monitors section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium">Monitors</h2>
          {activeOrg && (
            <AddMonitorDialog
              statusPageId={page.id}
              organizationId={activeOrg.id}
              existingMonitorIds={page.monitors.map((m) => m.monitorId)}
              onSuccess={invalidate}
            />
          )}
        </div>
        {page.monitors.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Monitor</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Order</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.monitors.map((spm) => (
                <TableRow key={spm.id}>
                  <TableCell className="font-medium">
                    {spm.monitor.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {spm.displayName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {spm.sortOrder}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMonitor.mutate({ id: spm.id })}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-xs text-muted-foreground">
            No monitors added yet. Add monitors to show on this status page.
          </p>
        )}
      </div>
    </div>
  );
}

type PageData = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  isPublic: boolean;
  brandColor: string | null;
  headerText: string | null;
  footerText: string | null;
};

type CustomDomainStatusData = {
  providerConfigured: boolean;
  cnameTarget: string | null;
  hostname: string | null;
  cloudflare: {
    id: string;
    hostname: string;
    status: string;
    sslStatus: string | null;
    verificationErrors: string[];
    ownershipVerification: {
      type: string | null;
      name: string | null;
      value: string | null;
    } | null;
    ownershipVerificationHttp: {
      url: string | null;
      body: string | null;
    } | null;
    validationRecords: Array<{
      status: string | null;
      txtName: string | null;
      txtValue: string | null;
      httpUrl: string | null;
      httpBody: string | null;
      emails: string[];
    }>;
  } | null;
};

function EditPageDialog({
  page,
  onSuccess,
}: {
  page: PageData;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [isPublic, setIsPublic] = useState(page.isPublic);
  const [brandColor, setBrandColor] = useState(page.brandColor ?? "#000000");
  const [headerText, setHeaderText] = useState(page.headerText ?? "");
  const [footerText, setFooterText] = useState(page.footerText ?? "");

  useEffect(() => {
    if (open) {
      setName(page.name);
      setSlug(page.slug);
      setIsPublic(page.isPublic);
      setBrandColor(page.brandColor ?? "#000000");
      setHeaderText(page.headerText ?? "");
      setFooterText(page.footerText ?? "");
    }
  }, [open, page]);

  const update = useMutation({
    ...orpc.statusPages.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      setOpen(false);
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
          <DialogTitle>Edit status page</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label>Public</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Brand color</Label>
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#000000"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Header text</Label>
            <Input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Footer text</Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!name || !slug || update.isPending}
            onClick={() =>
              update.mutate({
                id: page.id,
                name,
                slug,
                isPublic,
                brandColor,
                headerText: headerText || undefined,
                footerText: footerText || undefined,
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

function CustomDomainCard({
  page,
  status,
  onSuccess,
}: {
  page: PageData;
  status: CustomDomainStatusData | undefined;
  onSuccess: () => void;
}) {
  const [hostname, setHostname] = useState(page.customDomain ?? "");

  useEffect(() => {
    setHostname(page.customDomain ?? "");
  }, [page.customDomain]);

  const connect = useMutation({
    ...orpc.statusPages.connectCustomDomain.mutationOptions(),
    onSuccess: () => {
      onSuccess();
    },
  });

  const remove = useMutation({
    ...orpc.statusPages.removeCustomDomain.mutationOptions(),
    onSuccess: () => {
      setHostname("");
      onSuccess();
    },
  });

  const currentHostname = status?.hostname ?? page.customDomain;
  const viewUrl = currentHostname ? `https://${currentHostname}` : null;
  const domainStatus = getCustomDomainStatusMeta(status?.cloudflare ?? null);
  const errorMessage =
    connect.error instanceof Error
      ? connect.error.message
      : remove.error instanceof Error
        ? remove.error.message
        : null;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Custom domain</h2>
          <p className="text-xs text-muted-foreground">
            Let customers visit this page on a subdomain like
            {" "}
            <span className="font-medium text-foreground">status.example.com</span>.
          </p>
        </div>
        <Badge variant={domainStatus.variant}>{domainStatus.label}</Badge>
      </div>

      {currentHostname ? (
        <div className="mt-4 rounded-md border bg-muted/20 p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-foreground">
                {currentHostname}
              </p>
              <CopyButton value={currentHostname} />
            </div>
            <p className="text-xs text-muted-foreground">
              {domainStatus.description}
            </p>
            {status?.cloudflare ? (
              <p className="text-xs text-muted-foreground">
                Cloudflare hostname: {status.cloudflare.status}
                {" · "}
                SSL: {status.cloudflare.sslStatus ?? "pending"}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Hostname</Label>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="status.example.com"
              disabled={!status?.providerConfigured || !page.isPublic}
            />
            <Button
              disabled={
                !hostname ||
                !status?.providerConfigured ||
                !page.isPublic ||
                connect.isPending
              }
              onClick={() =>
                connect.mutate({
                  pageId: page.id,
                  hostname,
                })
              }
            >
              {connect.isPending ? "Connecting…" : "Connect domain"}
            </Button>
          </div>
        </div>

        {!page.isPublic ? (
          <p className="text-xs text-muted-foreground">
            Make the page public before connecting a custom domain.
          </p>
        ) : null}

        {!status?.providerConfigured ? (
          <p className="text-xs text-muted-foreground">
            Cloudflare custom domains are not configured in the environment yet.
          </p>
        ) : null}

        {status?.providerConfigured && (currentHostname || hostname) ? (
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium">Setup checklist</p>
            <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4 text-xs text-muted-foreground">
              <li>Connect the hostname in Unstatus.</li>
              <li>Add the DNS records shown below at your DNS provider.</li>
              <li>Wait for DNS to propagate, then click refresh status.</li>
            </ol>
          </div>
        ) : null}

        {status?.cnameTarget ? (
          <DnsRecordCard
            title="Routing record"
            description="Add this CNAME so traffic reaches your status page through Cloudflare."
            fields={[
              { label: "Type", value: "CNAME", copyable: false },
              {
                label: "Name",
                value: currentHostname || hostname || "status.example.com",
              },
              {
                label: "Target",
                value: status.cnameTarget,
              },
            ]}
          />
        ) : null}

        {currentHostname ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium">Actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onSuccess}>
                  Refresh status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!viewUrl}
                  onClick={() => viewUrl && window.open(viewUrl, "_blank")}
                >
                  View live
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!currentHostname || remove.isPending}
                  onClick={() => remove.mutate({ pageId: page.id })}
                >
                  {remove.isPending ? "Removing…" : "Remove domain"}
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium">Current state</p>
              <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Friendly status</span>
                  <Badge variant={domainStatus.variant}>{domainStatus.label}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Cloudflare hostname</span>
                  <span>{status?.cloudflare?.status ?? "missing"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>SSL</span>
                  <span>{status?.cloudflare?.sslStatus ?? "pending"}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {status?.cloudflare?.ownershipVerification ? (
          <DnsRecordCard
            title="Ownership verification"
            description="If Cloudflare asks for ownership verification, add this record exactly as shown."
            fields={[
              {
                label: "Type",
                value: status.cloudflare.ownershipVerification.type,
                copyable: false,
              },
              {
                label: "Name",
                value: status.cloudflare.ownershipVerification.name,
              },
              {
                label: "Value",
                value: status.cloudflare.ownershipVerification.value,
              },
            ]}
          />
        ) : null}

        {status?.cloudflare?.ownershipVerificationHttp ? (
          <DnsRecordCard
            title="HTTP ownership verification"
            description="If HTTP verification is required, serve this exact response on the shown URL."
            fields={[
              {
                label: "URL",
                value: status.cloudflare.ownershipVerificationHttp.url,
              },
              {
                label: "Body",
                value: status.cloudflare.ownershipVerificationHttp.body,
              },
            ]}
          />
        ) : null}

        {status?.cloudflare?.validationRecords.length ? (
          <div className="rounded-md border p-3">
            <p className="text-xs font-medium">Certificate validation records</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add these if your DNS provider or Cloudflare asks for certificate validation.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {status.cloudflare.validationRecords.map((record, index) => (
                <DnsRecordCard
                  key={`${record.txtName ?? record.httpUrl ?? index}`}
                  title={`Validation record ${index + 1}`}
                  fields={[
                    {
                      label: "Status",
                      value: record.status,
                      copyable: false,
                    },
                    { label: "TXT name", value: record.txtName },
                    { label: "TXT value", value: record.txtValue },
                    { label: "HTTP URL", value: record.httpUrl },
                    { label: "HTTP body", value: record.httpBody },
                    {
                      label: "Emails",
                      value: record.emails.length ? record.emails.join(", ") : null,
                    },
                  ]}
                />
              ))}
            </div>
          </div>
        ) : null}

        {status?.cloudflare?.verificationErrors.length ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive">
              Cloudflare verification errors
            </p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
              {status.cloudflare.verificationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="text-xs text-destructive">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

type RecordField = {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
};

function DnsRecordCard({
  title,
  description,
  fields,
}: {
  title: string;
  description?: string;
  fields: RecordField[];
}) {
  const visibleFields = fields.filter((field) => field.value);
  if (!visibleFields.length) return null;

  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-medium">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {visibleFields.map((field) => (
          <RecordFieldRow
            key={`${title}-${field.label}`}
            label={field.label}
            value={field.value}
            copyable={field.copyable}
          />
        ))}
      </div>
    </div>
  );
}

function RecordFieldRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <div className="min-w-0 flex-1 text-xs">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-1 break-all text-muted-foreground">{value}</p>
      </div>
      {copyable === false ? null : <CopyButton value={value} />}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
          }
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function getCustomDomainStatusMeta(
  cloudflare: CustomDomainStatusData["cloudflare"],
): {
  label: string;
  description: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (!cloudflare) {
    return {
      label: "Not connected",
      description:
        "Connect a hostname, add the records below, and then refresh once DNS has propagated.",
      variant: "secondary",
    };
  }

  if (cloudflare.verificationErrors.length > 0) {
    return {
      label: "Needs attention",
      description:
        "Cloudflare reported a validation problem. Review the errors and confirm the DNS records match exactly.",
      variant: "destructive",
    };
  }

  if (cloudflare.status === "blocked") {
    return {
      label: "Blocked",
      description:
        "Cloudflare will not activate this hostname right now. You may need to contact Cloudflare support.",
      variant: "destructive",
    };
  }

  if (cloudflare.status === "moved") {
    return {
      label: "DNS moved",
      description:
        "The hostname is no longer pointing at your Cloudflare SaaS target. Update the DNS records and refresh.",
      variant: "destructive",
    };
  }

  if (cloudflare.status === "active" && cloudflare.sslStatus === "active") {
    return {
      label: "Active",
      description: "The custom domain is live and serving this status page.",
      variant: "default",
    };
  }

  if (cloudflare.sslStatus === "pending_deployment") {
    return {
      label: "Deploying certificate",
      description:
        "Cloudflare has issued the certificate and is deploying it across the edge network.",
      variant: "outline",
    };
  }

  if (cloudflare.sslStatus === "pending_issuance") {
    return {
      label: "Issuing certificate",
      description:
        "Ownership is verified and Cloudflare is now issuing the SSL certificate.",
      variant: "outline",
    };
  }

  if (cloudflare.sslStatus === "pending_validation") {
    return {
      label: "Pending validation",
      description:
        "Cloudflare can see the hostname and is validating the ownership or certificate records.",
      variant: "outline",
    };
  }

  if (cloudflare.status === "pending") {
    return {
      label: "Pending DNS",
      description:
        "Add the DNS records below and refresh after they propagate.",
      variant: "secondary",
    };
  }

  return {
    label: "In progress",
    description:
      "The custom domain is connected, but Cloudflare has not finished activating it yet.",
    variant: "outline",
  };
}

function AddMonitorDialog({
  statusPageId,
  organizationId,
  existingMonitorIds,
  onSuccess,
}: {
  statusPageId: string;
  organizationId: string;
  existingMonitorIds: string[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [monitorId, setMonitorId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const { data: monitors } = useQuery(
    orpc.monitors.list.queryOptions({
      input: { organizationId },
    }),
  );

  const available = monitors?.filter((m) => !existingMonitorIds.includes(m.id));

  const add = useMutation({
    ...orpc.statusPages.addMonitor.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      setOpen(false);
      setMonitorId("");
      setDisplayName("");
      setSortOrder("0");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add monitor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add monitor to status page</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Monitor</Label>
            <Select value={monitorId} onValueChange={setMonitorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a monitor" />
              </SelectTrigger>
              <SelectContent>
                {available?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Display name (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Override name on status page"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!monitorId || add.isPending}
            onClick={() =>
              add.mutate({
                statusPageId,
                monitorId,
                displayName: displayName || undefined,
                sortOrder: Number(sortOrder),
              })
            }
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
