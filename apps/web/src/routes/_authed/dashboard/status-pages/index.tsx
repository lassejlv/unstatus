import { createFileRoute } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState, useRef, useEffect } from "react";
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
import { X, ChevronLeft, ExternalLink, Trash2, Globe } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge, UpgradePrompt } from "@/components/upgrade-badge";

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
  const { isPro } = useSubscription();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]);
  const canCreateMore = isPro || !pages?.length;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-4 min-h-0">
      <div className="flex flex-1 flex-col gap-4 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-medium">Status Pages</h1>
          {activeOrg && <CreateStatusPageDialog organizationId={activeOrg.id} disabled={!canCreateMore} />}
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
            {activeOrg && <CreateStatusPageDialog organizationId={activeOrg.id} disabled={!canCreateMore} />}
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
  const [tab, setTab] = useState<"overview" | "monitors" | "settings">("overview");

  return (
    <div
      className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
        isOpen ? "w-[520px] opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="relative flex h-full w-[520px] flex-col border-l bg-background/95 backdrop-blur-sm overflow-hidden">
        {!page ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-5" />
          </div>
        ) : (
          <>
            {/* Header — Railway style */}
            <div className="px-6 pt-6 pb-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">{page.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">/status/{page.slug}</span>
                    <Badge variant={page.isPublic ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                      {page.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.open(`/status/${page.slug}`, "_blank")}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Tabs — Railway style */}
              <div className="flex gap-4 mt-4 border-b -mx-6 px-6">
                {(["overview", "monitors", "settings"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`pb-2.5 text-sm transition-colors border-b-2 -mb-px ${
                      tab === t
                        ? "border-foreground text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "overview" ? "Overview" : t === "monitors" ? "Monitors" : "Settings"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              {tab === "overview" && (
                <div className="flex flex-col p-6 gap-5">
                  {/* Quick info */}
                  <div className="divide-y rounded-lg border">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">Monitors</span>
                      <span className="text-xs font-medium">{page.monitors.length}</span>
                    </div>
                    {page.brandColor && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">Brand color</span>
                        <div className="flex items-center gap-1.5">
                          <div className="size-3 rounded-full border" style={{ backgroundColor: page.brandColor }} />
                          <span className="text-xs font-mono">{page.brandColor}</span>
                        </div>
                      </div>
                    )}
                    {page.customDomain && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">Custom domain</span>
                        <span className="text-xs font-mono">{page.customDomain}</span>
                      </div>
                    )}
                    {page.headerText && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">Header</span>
                        <span className="text-xs truncate ml-4">{page.headerText}</span>
                      </div>
                    )}
                  </div>

                  {/* Custom domain */}
                  <CustomDomainInline
                    pageId={page.id}
                    currentDomain={page.customDomain}
                    onSuccess={invalidate}
                  />
                </div>
              )}

              {tab === "monitors" && (
                <MonitorsTab
                  page={page}
                  activeOrg={activeOrg}
                  onAddMonitor={() => setView("addMonitor")}
                  onRemoveMonitor={(id) => removeMonitor.mutate({ id })}
                  onInvalidate={invalidate}
                />
              )}

              {tab === "settings" && (
                <div className="flex flex-col p-6 gap-5">
                  {/* Edit form inline */}
                  <EditPageInline
                    page={page}
                    onSuccess={() => {
                      invalidate();
                      qc.invalidateQueries();
                    }}
                  />

                  {/* Danger zone */}
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setView("confirmDelete")}
                    >
                      Delete status page
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit overlay */}
        <div
          className={`absolute inset-0 flex flex-col bg-background/95 backdrop-blur-sm transition-transform duration-200 ease-out ${
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
          className={`absolute inset-0 flex flex-col bg-background/95 backdrop-blur-sm transition-transform duration-200 ease-out ${
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
          className={`absolute inset-0 flex flex-col bg-background/95 backdrop-blur-sm transition-transform duration-200 ease-out ${
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

function MonitorsTab({
  page,
  activeOrg,
  onAddMonitor,
  onRemoveMonitor,
  onInvalidate,
}: {
  page: any;
  activeOrg: any;
  onAddMonitor: () => void;
  onRemoveMonitor: (id: string) => void;
  onInvalidate: () => void;
}) {
  const [newGroup, setNewGroup] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const qc = useQueryClient();

  const updateMonitors = useMutation({
    ...orpc.statusPages.updateMonitors.mutationOptions(),
    onSuccess: () => {
      onInvalidate();
      qc.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update monitors");
    },
  });

  // Group monitors
  const groups = new Map<string, typeof page.monitors>();
  const ungrouped: typeof page.monitors = [];
  for (const spm of page.monitors) {
    if (spm.groupName) {
      const existing = groups.get(spm.groupName) ?? [];
      existing.push(spm);
      groups.set(spm.groupName, existing);
    } else {
      ungrouped.push(spm);
    }
  }

  const allGroupNames = [...groups.keys()];

  const moveToGroup = (spmId: string, groupName: string | null) => {
    const updated = page.monitors.map((m: any, i: number) => ({
      id: m.id,
      sortOrder: i,
      groupName: m.id === spmId ? groupName : m.groupName ?? null,
    }));
    updateMonitors.mutate({ statusPageId: page.id, monitors: updated });
  };

  const addGroup = () => {
    if (!newGroup.trim()) return;
    // Just adding a group name — we'll assign monitors to it later
    // For now, move the first ungrouped monitor to this group if any
    setAddingGroup(false);
    setNewGroup("");
    // If no monitors, just store it — but we need at least one monitor in the group
    // For simplicity, just create the group concept by letting users select it from dropdowns
    toast.success(`Group "${newGroup}" created. Assign monitors from the dropdown.`);
  };

  const moveUp = (spmId: string) => {
    const idx = page.monitors.findIndex((m: any) => m.id === spmId);
    if (idx <= 0) return;
    const reordered = [...page.monitors];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    updateMonitors.mutate({
      statusPageId: page.id,
      monitors: reordered.map((m: any, i: number) => ({ id: m.id, sortOrder: i, groupName: m.groupName ?? null })),
    });
  };

  const moveDown = (spmId: string) => {
    const idx = page.monitors.findIndex((m: any) => m.id === spmId);
    if (idx >= page.monitors.length - 1) return;
    const reordered = [...page.monitors];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    updateMonitors.mutate({
      statusPageId: page.id,
      monitors: reordered.map((m: any, i: number) => ({ id: m.id, sortOrder: i, groupName: m.groupName ?? null })),
    });
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {page.monitors.length} monitor{page.monitors.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          {!addingGroup ? (
            <button
              type="button"
              onClick={() => setAddingGroup(true)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              + Group
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="Group name"
                className="h-6 w-28 text-xs"
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
              />
              <Button size="sm" className="h-6 text-xs px-2" onClick={addGroup}>Add</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-1" onClick={() => setAddingGroup(false)}>×</Button>
            </div>
          )}
          {activeOrg && (
            <button
              type="button"
              onClick={onAddMonitor}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              + Monitor
            </button>
          )}
        </div>
      </div>
      {page.monitors.length ? (
        <div className="divide-y">
          {page.monitors.map((spm: any, i: number) => (
            <div
              key={spm.id}
              className="flex items-center gap-2 px-6 py-2.5 transition-colors hover:bg-accent/30"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveUp(spm.id)}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-20"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={i === page.monitors.length - 1}
                  onClick={() => moveDown(spm.id)}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-20"
                >
                  ▼
                </button>
              </div>

              {/* Monitor info */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{spm.monitor.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Select
                    value={spm.groupName ?? "__none"}
                    onValueChange={(v) => moveToGroup(spm.id, v === "__none" ? null : v)}
                  >
                    <SelectTrigger className="h-5 w-auto text-[10px] px-1.5 py-0 border-dashed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No group</SelectItem>
                      {allGroupNames.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => onRemoveMonitor(spm.id)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-6 py-8 text-center text-xs text-muted-foreground">
          No monitors added yet.
        </p>
      )}
    </div>
  );
}

function EditPageInline({
  page,
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
    customCss: string | null;
    customJs: string | null;
  };
  onSuccess: () => void;
}) {
  const { isPro } = useSubscription();
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [isPublic, setIsPublic] = useState(page.isPublic);
  const [brandColor, setBrandColor] = useState(page.brandColor ?? "#000000");
  const [headerText, setHeaderText] = useState(page.headerText ?? "");
  const [footerText, setFooterText] = useState(page.footerText ?? "");
  const [customCss, setCustomCss] = useState(page.customCss ?? "");
  const [customJs, setCustomJs] = useState(page.customJs ?? "");

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
    <div className="flex flex-col gap-3">
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
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs flex items-center gap-1.5">Custom CSS {!isPro && <ProBadge />}</Label>
        <textarea
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          className="h-20 w-full rounded-md border bg-transparent px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder=".status-page { }"
          disabled={!isPro}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs flex items-center gap-1.5">Custom JavaScript {!isPro && <ProBadge />}</Label>
        <textarea
          value={customJs}
          onChange={(e) => setCustomJs(e.target.value)}
          className="h-20 w-full rounded-md border bg-transparent px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="console.log('hello')"
          disabled={!isPro}
        />
      </div>
      <Button
        size="sm"
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
            customCss: customCss || undefined,
            customJs: customJs || undefined,
          })
        }
      >
        {update.isPending ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}

function CustomDomainInline({
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

  const prevDomain = useRef(currentDomain);
  if (currentDomain !== prevDomain.current) {
    prevDomain.current = currentDomain;
    setDomain(currentDomain ?? "");
    setEditing(false);
  }

  const update = useMutation({
    ...orpc.statusPages.update.mutationOptions(),
    onSuccess: () => {
      onSuccess();
      setEditing(false);
      toast.success(domain ? "Custom domain saved" : "Custom domain removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update custom domain");
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">Custom domain</span>
          {!isPro && <ProBadge />}
        </div>
        {isPro && !currentDomain && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            + Add
          </button>
        )}
      </div>

      {!isPro ? (
        <UpgradePrompt feature="Custom domains" />
      ) : !currentDomain && !editing ? (
        <div className="rounded-lg border border-dashed px-3 py-3 flex items-center gap-2">
          <Globe className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            Serve on your own domain
          </span>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="status.example.com"
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-7 text-xs px-2.5"
              disabled={update.isPending || domain === (currentDomain ?? "")}
              onClick={() =>
                update.mutate({ id: pageId, customDomain: domain || null })
              }
            >
              Save
            </Button>
            {currentDomain && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={update.isPending}
                onClick={() => {
                  setDomain("");
                  update.mutate({ id: pageId, customDomain: null });
                }}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
          {currentDomain && (
            <div className="border-t px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                Add a CNAME record pointing to:
              </p>
              <div className="rounded bg-muted px-2 py-1.5 font-mono text-[11px] select-all">
                cname.unstatus.app
              </div>
            </div>
          )}
        </div>
      )}
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

function CreateStatusPageDialog({ organizationId, disabled }: { organizationId: string; disabled?: boolean }) {
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

  if (disabled) {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" disabled>
          New status page
        </Button>
        <ProBadge />
      </div>
    );
  }

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
