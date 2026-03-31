import { createFileRoute } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { X, ChevronLeft, Pencil, ExternalLink, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/status-pages/")({
  component: StatusPagesPage,
});

function StatusPagesPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const pagesQuery = orpc.statusPages.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const { data: pages, isLoading } = useQuery(pagesQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-medium">Status Pages</h1>
          {activeOrg && <CreateStatusPageDialog organizationId={activeOrg.id} />}
        </div>
        {pages?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                className={`flex flex-col gap-2.5 rounded-lg border bg-card p-3.5 text-left transition-colors hover:border-foreground/20 ${
                  selectedId === p.id ? "border-foreground/30 bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <Badge
                    variant={p.isPublic ? "default" : "secondary"}
                    className="shrink-0 ml-2"
                  >
                    {p.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  /status/{p.slug}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{p.monitors.length} monitor{p.monitors.length !== 1 ? "s" : ""}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No status pages</EmptyTitle>
              <EmptyDescription>
                Create a status page to share your uptime with users.
              </EmptyDescription>
            </EmptyHeader>
            {activeOrg && <CreateStatusPageDialog organizationId={activeOrg.id} />}
          </Empty>
        )}
      </div>

      <StatusPageSidecar
        pageId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function StatusPageSidecar({
  pageId,
  onClose,
}: {
  pageId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { activeOrg } = useOrg();
  const pageOpts = orpc.statusPages.get.queryOptions({
    input: pageId ? { id: pageId } : skipToken,
  });
  const { data: page } = useQuery(pageOpts);
  const [view, setView] = useState<"main" | "edit" | "confirmDelete" | "addMonitor">("main");

  const prevPageId = useRef(pageId);
  if (pageId !== prevPageId.current) {
    prevPageId.current = pageId;
    setView("main");
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: pageOpts.queryKey });

  const del = useMutation({
    ...orpc.statusPages.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Status page deleted");
      qc.invalidateQueries();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete");
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

  const isOpen = pageId !== null;

  return (
    <div
      className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
        isOpen ? "w-[380px] opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="relative flex h-full w-[380px] flex-col rounded-lg border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium truncate">
            {page?.name ?? "Loading..."}
          </span>
          <div className="flex items-center gap-1">
            {page && (
              <>
                <button
                  type="button"
                  onClick={() => window.open(`/status/${page.slug}`, "_blank")}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("edit")}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {!page ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-5" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {/* Info */}
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Visibility</span>
                <Badge variant={page.isPublic ? "default" : "secondary"}>
                  {page.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Slug</span>
                <span className="text-xs font-mono">/status/{page.slug}</span>
              </div>
              {page.brandColor && (
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Brand color</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="size-3 rounded-full border"
                      style={{ backgroundColor: page.brandColor }}
                    />
                    <span className="text-xs font-mono">{page.brandColor}</span>
                  </div>
                </div>
              )}
              {page.headerText && (
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Header</span>
                  <span className="text-xs truncate ml-4">{page.headerText}</span>
                </div>
              )}
              {page.footerText && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Footer</span>
                  <span className="text-xs truncate ml-4">{page.footerText}</span>
                </div>
              )}
            </div>

            {/* Monitors */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Monitors</span>
                {activeOrg && (
                  <button
                    type="button"
                    onClick={() => setView("addMonitor")}
                    className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    + Add
                  </button>
                )}
              </div>
              {page.monitors.length ? (
                <div className="rounded-lg border">
                  {page.monitors.map((spm, i) => (
                    <div
                      key={spm.id}
                      className={`flex items-center justify-between px-3 py-2 text-xs ${
                        i < page.monitors.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{spm.monitor.name}</span>
                        {spm.displayName && (
                          <span className="text-[10px] text-muted-foreground">as "{spm.displayName}"</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMonitor.mutate({ id: spm.id })}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No monitors added yet.</p>
              )}
            </div>

            {/* Danger zone */}
            <div className="mt-auto pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setView("confirmDelete")}
              >
                Delete status page
              </Button>
            </div>
          </div>
        )}

        {/* Edit overlay */}
        <div
          className={`absolute inset-0 flex flex-col bg-card transition-transform duration-200 ease-out ${
            view === "edit" ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {page && view === "edit" && (
            <EditPageOverlay
              page={page}
              onBack={() => setView("main")}
              onSuccess={() => {
                invalidate();
                qc.invalidateQueries();
                setView("main");
              }}
            />
          )}
        </div>

        {/* Add monitor overlay */}
        <div
          className={`absolute inset-0 flex flex-col bg-card transition-transform duration-200 ease-out ${
            view === "addMonitor" ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {page && activeOrg && view === "addMonitor" && (
            <AddMonitorOverlay
              statusPageId={page.id}
              organizationId={activeOrg.id}
              existingMonitorIds={page.monitors.map((m) => m.monitorId)}
              onBack={() => setView("main")}
              onSuccess={() => {
                invalidate();
                setView("main");
              }}
            />
          )}
        </div>

        {/* Confirm delete overlay */}
        <div
          className={`absolute inset-0 flex flex-col bg-card transition-transform duration-200 ease-out ${
            view === "confirmDelete" ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {page && view === "confirmDelete" && (
            <>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-medium">Confirm delete</span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Delete "{page.name}"?</span>
                  <span className="text-xs text-muted-foreground">
                    This will permanently remove this status page. Your monitors and incidents will not be affected.
                  </span>
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setView("main")}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={del.isPending}
                    onClick={() => del.mutate({ id: page.id })}
                  >
                    {del.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditPageOverlay({
  page,
  onBack,
  onSuccess,
}: {
  page: {
    id: string;
    name: string;
    slug: string;
    isPublic: boolean;
    brandColor: string | null;
    headerText: string | null;
    footerText: string | null;
  };
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [isPublic, setIsPublic] = useState(page.isPublic);
  const [brandColor, setBrandColor] = useState(page.brandColor ?? "#000000");
  const [headerText, setHeaderText] = useState(page.headerText ?? "");
  const [footerText, setFooterText] = useState(page.footerText ?? "");

  const update = useMutation({
    ...orpc.statusPages.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      toast.success("Status page updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update");
    },
  });

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">Edit status page</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {/* Form */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          <Label className="text-xs">Public</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Brand color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-8 w-8 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder="#000000"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Header text</Label>
          <Input
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            className="h-8 text-xs"
            placeholder="Status of our services"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Footer text</Label>
          <Input
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            className="h-8 text-xs"
            placeholder="Powered by Unstatus"
          />
        </div>

        {/* Live preview */}
        <div className="flex flex-col gap-1.5 mt-1">
          <Label className="text-xs">Preview</Label>
          <div className="rounded-lg border bg-background overflow-hidden">
            <div className="p-4 flex flex-col items-center gap-2 text-center">
              <div
                className="h-1 w-10 rounded-full"
                style={{ backgroundColor: brandColor }}
              />
              <span className="text-xs font-semibold">{name || "Untitled"}</span>
              {headerText && (
                <span className="text-[10px] text-muted-foreground">{headerText}</span>
              )}
              <div className="w-full rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-medium text-emerald-600">
                All Systems Operational
              </div>
              <div className="flex w-full flex-col gap-1 mt-1">
                <div className="rounded border px-2 py-1.5 text-left">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium">API</span>
                  </div>
                  <div className="mt-1 flex gap-px">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="h-3 flex-1 rounded-[1px] bg-emerald-500" />
                    ))}
                  </div>
                </div>
                <div className="rounded border px-2 py-1.5 text-left">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium">Website</span>
                  </div>
                  <div className="mt-1 flex gap-px">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="h-3 flex-1 rounded-[1px] bg-emerald-500" />
                    ))}
                  </div>
                </div>
              </div>
              {footerText && (
                <span className="text-[9px] text-muted-foreground mt-1">{footerText}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onBack}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
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
            {update.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}

function AddMonitorOverlay({
  statusPageId,
  organizationId,
  existingMonitorIds,
  onBack,
  onSuccess,
}: {
  statusPageId: string;
  organizationId: string;
  existingMonitorIds: string[];
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [monitorId, setMonitorId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const { data: monitors } = useQuery(
    orpc.monitors.list.queryOptions({ input: { organizationId } }),
  );
  const available = monitors?.filter((m) => !existingMonitorIds.includes(m.id));

  const add = useMutation({
    ...orpc.statusPages.addMonitor.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      toast.success("Monitor added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add monitor");
    },
  });

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">Add monitor</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Monitor</Label>
          <Select value={monitorId} onValueChange={setMonitorId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select a monitor" />
            </SelectTrigger>
            <SelectContent>
              {available?.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Display name (optional)</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-8 text-xs"
            placeholder="Override name on status page"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Sort order</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="mt-auto flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onBack}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
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
            {add.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
    </>
  );
}

function CreateStatusPageDialog({ organizationId }: { organizationId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const create = useMutation({
    ...orpc.statusPages.create.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: orpc.statusPages.list.queryOptions({
          input: { organizationId },
        }).queryKey,
      });
      setOpen(false);
      setName("");
      setSlug("");
      toast.success("Status page created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create status page");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New status page</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create status page</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              placeholder="My Status Page"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-status-page"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!name || !slug || create.isPending}
            onClick={() => create.mutate({ organizationId, name, slug })}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
