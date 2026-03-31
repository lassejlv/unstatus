import { createFileRoute, Link } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge, UpgradePrompt } from "@/components/upgrade-badge";

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

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: pageOpts.queryKey });

  const del = useMutation({
    ...orpc.statusPages.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Status page deleted");
      window.history.back();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete status page");
    },
  });

  const removeMonitor = useMutation({
    ...orpc.statusPages.removeMonitor.mutationOptions(),
    onSuccess: () => {
      invalidate();
      toast.success("Monitor removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove monitor");
    },
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
            onClick={() => window.open(`/status/${page.slug}`, "_blank")}
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
        <p className="mt-1 text-xs text-muted-foreground">
          /status/{page.slug}
        </p>
      </div>

      {/* Custom domain section */}
      <CustomDomainSection
        pageId={page.id}
        currentDomain={page.customDomain}
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
  showResponseTimes: boolean;
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
  const [showResponseTimes, setShowResponseTimes] = useState(page.showResponseTimes);

  useEffect(() => {
    if (open) {
      setName(page.name);
      setSlug(page.slug);
      setIsPublic(page.isPublic);
      setBrandColor(page.brandColor ?? "#000000");
      setHeaderText(page.headerText ?? "");
      setFooterText(page.footerText ?? "");
      setShowResponseTimes(page.showResponseTimes);
    }
  }, [open, page]);

  const update = useMutation({
    ...orpc.statusPages.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      setOpen(false);
      toast.success("Status page updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status page");
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
          <div className="flex items-center gap-2">
            <Switch checked={showResponseTimes} onCheckedChange={setShowResponseTimes} />
            <Label>Show response times</Label>
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
                showResponseTimes,
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

function CustomDomainSection({
  pageId,
  currentDomain,
  onSuccess,
}: {
  pageId: string;
  currentDomain: string | null;
  onSuccess: () => void;
}) {
  const { isPro } = useSubscription();
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDomain(currentDomain ?? "");
    setEditing(false);
  }, [currentDomain]);

  const update = useMutation({
    ...orpc.statusPages.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      setEditing(false);
      toast.success(
        domain ? "Custom domain saved" : "Custom domain removed",
      );
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update custom domain");
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-xs font-medium">Custom domain</h2>
        {!isPro && <ProBadge />}
      </div>

      {!isPro ? (
        <UpgradePrompt feature="Custom domains" />
      ) : !currentDomain && !editing ? (
        <div className="rounded-md border border-dashed p-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Serve this status page on your own domain
          </p>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Add domain
          </Button>
        </div>
      ) : (
        <div className="rounded-md border p-4 flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex flex-col gap-1.5">
              <Label className="text-xs">Domain</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="status.example.com"
              />
            </div>
            <Button
              size="sm"
              disabled={update.isPending || domain === (currentDomain ?? "")}
              onClick={() =>
                update.mutate({
                  id: pageId,
                  customDomain: domain || null,
                })
              }
            >
              {update.isPending ? "Saving..." : "Save"}
            </Button>
            {currentDomain && (
              <Button
                variant="outline"
                size="sm"
                disabled={update.isPending}
                onClick={() => {
                  setDomain("");
                  update.mutate({ id: pageId, customDomain: null });
                }}
              >
                Remove
              </Button>
            )}
          </div>

          {currentDomain && (
            <>
              <div className="border-t pt-3">
                <p className="text-xs font-medium mb-2">DNS Configuration</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Point your domain to our proxy server. SSL is provisioned
                  automatically on the first request.
                </p>
                <div className="rounded bg-muted p-3 font-mono text-xs space-y-1">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-12">Type</span>
                    <span>CNAME</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-12">Name</span>
                    <span>{currentDomain}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-12">Value</span>
                    <span className="select-all">cname.unstatus.app</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
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
      toast.success("Monitor added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add monitor");
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
