import { createFileRoute } from "@tanstack/react-router";
import {
  skipToken,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { X, ChevronLeft, ExternalLink, Trash2, Globe, GripVertical, Plus, Pencil } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge, UpgradePrompt } from "@/components/upgrade-badge";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const { tier } = useSubscription();
  const maxPages = PLAN_LIMITS[tier].statusPages;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]);
  const canCreateMore = !pages || pages.length < maxPages;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
        
        {/* Pages list skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
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
              existingMonitorIds={page.monitors.map((m: any) => m.monitorId)}
              groupNames={[...new Set(page.monitors.map((m: any) => m.groupName).filter(Boolean))]}
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

// ── Drag-and-drop monitor grouping ──────────────────────────────────────────

const UNGROUPED_ID = "__ungrouped";

interface MonitorItem {
  id: string;
  monitorId: string;
  sortOrder: number;
  groupName: string | null;
  displayName: string | null;
  monitor: { name: string; id: string };
}

function SortableMonitorItem({
  spm,
  onRemove,
}: {
  spm: MonitorItem;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spm.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border transition-colors hover:border-foreground/20 group"
    >
      <button
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate">{spm.displayName || spm.monitor.name}</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(spm.id)}
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

function MonitorDragOverlay({ spm }: { spm: MonitorItem }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-foreground/20 shadow-lg">
      <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-sm truncate">{spm.displayName || spm.monitor.name}</span>
    </div>
  );
}

function DroppableGroup({
  groupId,
  groupName,
  monitors,
  onRemoveMonitor,
  onRenameGroup,
  onDeleteGroup,
  isUngrouped,
}: {
  groupId: string;
  groupName: string;
  monitors: MonitorItem[];
  onRemoveMonitor: (id: string) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  onDeleteGroup?: (name: string) => void;
  isUngrouped?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(groupName);
  const { setNodeRef, isOver } = useDroppable({
    id: groupId,
    data: { type: "group", groupName: isUngrouped ? null : groupName },
  });

  const handleRename = () => {
    if (!editName.trim() || editName === groupName) {
      setEditing(false);
      setEditName(groupName);
      return;
    }
    onRenameGroup?.(groupName, editName.trim());
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border transition-colors ${
        isOver ? "border-foreground/30 bg-accent/50" : "border-border"
      }`}
    >
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        {isUngrouped ? (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-medium text-muted-foreground">Ungrouped</span>
            {monitors.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60">{monitors.length}</span>
            )}
          </div>
        ) : editing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-6 text-xs flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") { setEditing(false); setEditName(groupName); }
              }}
              onBlur={handleRename}
            />
          </div>
        ) : (
          <>
            <span className="text-xs font-medium">{groupName}</span>
            {monitors.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60">{monitors.length}</span>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => { setEditing(true); setEditName(groupName); }}
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteGroup?.(groupName)}
                className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Monitor list */}
      <div className="p-2 flex flex-col gap-1 min-h-[40px]">
        <SortableContext
          items={monitors.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          {monitors.length === 0 ? (
            <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
              Drag monitors here
            </div>
          ) : (
            monitors.map((spm) => (
              <SortableMonitorItem
                key={spm.id}
                spm={spm}
                onRemove={onRemoveMonitor}
              />
            ))
          )}
        </SortableContext>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  // Track empty groups that haven't been persisted yet (no monitors assigned)
  const [emptyGroups, setEmptyGroups] = useState<string[]>([]);
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

  // Build group structure: ordered list of group names + ungrouped
  const monitors: MonitorItem[] = page.monitors;

  // Groups that have monitors assigned (from DB)
  const dbGroupOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const spm of monitors) {
      if (spm.groupName && !seen.has(spm.groupName)) {
        seen.add(spm.groupName);
        order.push(spm.groupName);
      }
    }
    return order;
  }, [monitors]);

  // Merge DB groups + local empty groups (deduped)
  const groupOrder = useMemo(() => {
    const all = [...dbGroupOrder];
    for (const g of emptyGroups) {
      if (!all.includes(g)) all.push(g);
    }
    return all;
  }, [dbGroupOrder, emptyGroups]);

  // Clean up emptyGroups that now have monitors (became real)
  useEffect(() => {
    setEmptyGroups((prev) => prev.filter((g) => !dbGroupOrder.includes(g)));
  }, [dbGroupOrder]);

  const hasGroups = groupOrder.length > 0;

  const grouped = useMemo(() => {
    const map = new Map<string, MonitorItem[]>();
    map.set(UNGROUPED_ID, []);
    for (const g of groupOrder) map.set(g, []);
    for (const spm of monitors) {
      const key = spm.groupName ?? UNGROUPED_ID;
      const arr = map.get(key) ?? [];
      arr.push(spm);
      map.set(key, arr);
    }
    return map;
  }, [monitors, groupOrder]);

  const activeMonitor = useMemo(
    () => monitors.find((m) => m.id === activeId) ?? null,
    [monitors, activeId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Find which group a monitor belongs to
  const findGroupOfMonitor = useCallback(
    (monitorId: string): string => {
      for (const [groupKey, items] of grouped) {
        if (items.some((m) => m.id === monitorId)) return groupKey;
      }
      return UNGROUPED_ID;
    },
    [grouped],
  );

  const persistOrder = useCallback(
    (allMonitors: MonitorItem[]) => {
      updateMonitors.mutate({
        statusPageId: page.id,
        monitors: allMonitors.map((m, i) => ({
          id: m.id,
          sortOrder: i,
          groupName: m.groupName ?? null,
        })),
      });
    },
    [page.id, updateMonitors],
  );

  // Flatten the grouped structure back into a sorted array
  const flattenGroups = useCallback(
    (groupedMap: Map<string, MonitorItem[]>): MonitorItem[] => {
      const result: MonitorItem[] = [];
      // Ungrouped first
      const ungrouped = groupedMap.get(UNGROUPED_ID) ?? [];
      result.push(...ungrouped);
      // Then each group in order
      for (const g of groupOrder) {
        const items = groupedMap.get(g) ?? [];
        result.push(...items);
      }
      return result;
    },
    [groupOrder],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeMonitorId = active.id as string;
    const overId = over.id as string;

    // Determine target group
    let targetGroup: string;
    const overData = over.data.current;
    if (overData?.type === "group") {
      // Dropped on a group container
      targetGroup = overData.groupName === null ? UNGROUPED_ID : overData.groupName;
    } else {
      // Dropped on another monitor — find its group
      targetGroup = findGroupOfMonitor(overId);
    }

    const sourceGroup = findGroupOfMonitor(activeMonitorId);

    // Clone grouped map
    const newGrouped = new Map<string, MonitorItem[]>();
    for (const [key, items] of grouped) {
      newGrouped.set(key, [...items]);
    }

    // Remove from source
    const sourceItems = newGrouped.get(sourceGroup) ?? [];
    const activeIdx = sourceItems.findIndex((m) => m.id === activeMonitorId);
    if (activeIdx === -1) return;
    const [movedItem] = sourceItems.splice(activeIdx, 1);

    // Update groupName
    const newGroupName = targetGroup === UNGROUPED_ID ? null : targetGroup;
    const updatedItem = { ...movedItem, groupName: newGroupName };

    // Insert into target
    const targetItems = newGrouped.get(targetGroup) ?? [];
    if (sourceGroup === targetGroup) {
      // Reorder within same group
      const overIdx = targetItems.findIndex((m) => m.id === overId);
      if (overIdx !== -1) {
        targetItems.splice(overIdx, 0, updatedItem);
      } else {
        targetItems.push(updatedItem);
      }
    } else {
      // Moved to different group
      if (overData?.type === "group") {
        // Dropped on group header — add at end
        targetItems.push(updatedItem);
      } else {
        const overIdx = targetItems.findIndex((m) => m.id === overId);
        if (overIdx !== -1) {
          targetItems.splice(overIdx, 0, updatedItem);
        } else {
          targetItems.push(updatedItem);
        }
      }
    }

    newGrouped.set(sourceGroup, sourceItems);
    newGrouped.set(targetGroup, targetItems);

    persistOrder(flattenGroups(newGrouped));
  };

  const addGroup = () => {
    const name = newGroup.trim();
    if (!name) return;
    if (groupOrder.includes(name)) {
      toast.error("Group already exists");
      return;
    }
    // Create an empty group in local state — drag monitors into it later
    setEmptyGroups((prev) => [...prev, name]);
    setAddingGroup(false);
    setNewGroup("");
  };

  const renameGroup = (oldName: string, newName: string) => {
    if (groupOrder.includes(newName)) {
      toast.error("Group already exists");
      return;
    }
    // If it's a local empty group, just rename in state
    if (emptyGroups.includes(oldName)) {
      setEmptyGroups((prev) => prev.map((g) => (g === oldName ? newName : g)));
      return;
    }
    const allMonitors = monitors.map((m, i) => ({
      id: m.id,
      sortOrder: i,
      groupName: m.groupName === oldName ? newName : (m.groupName ?? null),
    }));
    updateMonitors.mutate({ statusPageId: page.id, monitors: allMonitors });
  };

  const deleteGroup = (name: string) => {
    // If it's a local empty group, just remove from state
    if (emptyGroups.includes(name)) {
      setEmptyGroups((prev) => prev.filter((g) => g !== name));
      return;
    }
    // Move all monitors from the group to ungrouped
    const allMonitors = monitors.map((m, i) => ({
      id: m.id,
      sortOrder: i,
      groupName: m.groupName === name ? null : (m.groupName ?? null),
    }));
    updateMonitors.mutate({ statusPageId: page.id, monitors: allMonitors });
    toast.success(`Group "${name}" removed`);
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
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3" />
              Group
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="Group name"
                className="h-6 w-28 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addGroup();
                  if (e.key === "Escape") { setAddingGroup(false); setNewGroup(""); }
                }}
              />
              <Button size="sm" className="h-6 text-xs px-2" onClick={addGroup}>Add</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-1" onClick={() => { setAddingGroup(false); setNewGroup(""); }}>
                <X className="size-3" />
              </Button>
            </div>
          )}
          {activeOrg && (
            <button
              type="button"
              onClick={onAddMonitor}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3" />
              Monitor
            </button>
          )}
        </div>
      </div>

      {page.monitors.length === 0 && !hasGroups ? (
        <p className="px-6 py-8 text-center text-xs text-muted-foreground">
          No monitors added yet.
        </p>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {hasGroups ? (
              <>
                {/* Ungrouped monitors — always visible when groups exist */}
                <DroppableGroup
                  groupId={UNGROUPED_ID}
                  groupName="Ungrouped"
                  monitors={grouped.get(UNGROUPED_ID) ?? []}
                  onRemoveMonitor={onRemoveMonitor}
                  isUngrouped
                />

                {/* Named groups */}
                {groupOrder.map((gName) => (
                  <DroppableGroup
                    key={gName}
                    groupId={`group:${gName}`}
                    groupName={gName}
                    monitors={grouped.get(gName) ?? []}
                    onRemoveMonitor={onRemoveMonitor}
                    onRenameGroup={renameGroup}
                    onDeleteGroup={deleteGroup}
                  />
                ))}
              </>
            ) : (
              /* No groups — flat sortable list */
              <SortableContext
                items={monitors.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1">
                  {monitors.map((spm) => (
                    <SortableMonitorItem
                      key={spm.id}
                      spm={spm}
                      onRemove={onRemoveMonitor}
                    />
                  ))}
                </div>
              </SortableContext>
            )}

            <DragOverlay>
              {activeMonitor ? <MonitorDragOverlay spm={activeMonitor} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
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
  const { tier: editTier } = useSubscription();
  const editLimits = PLAN_LIMITS[editTier];
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
        <Label className="text-xs flex items-center gap-1.5">Custom CSS {!editLimits.customCss && <ProBadge label="Scale" />}</Label>
        <textarea
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          className="h-20 w-full rounded-md border bg-transparent px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder=".status-page { }"
          disabled={!editLimits.customCss}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs flex items-center gap-1.5">Custom JavaScript {!editLimits.customJs && <ProBadge label="Scale" />}</Label>
        <textarea
          value={customJs}
          onChange={(e) => setCustomJs(e.target.value)}
          className="h-20 w-full rounded-md border bg-transparent px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="console.log('hello')"
          disabled={!editLimits.customJs}
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
  const { tier: domainTier } = useSubscription();
  const hasCustomDomain = PLAN_LIMITS[domainTier].customDomain;
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
          {!hasCustomDomain && <ProBadge label="Hobby" />}
        </div>
        {hasCustomDomain && !currentDomain && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            + Add
          </button>
        )}
      </div>

      {!hasCustomDomain ? (
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
  groupNames,
  onBack,
  onSuccess,
}: {
  statusPageId: string;
  organizationId: string;
  existingMonitorIds: string[];
  groupNames: string[];
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [monitorId, setMonitorId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [groupName, setGroupName] = useState<string>("__none");

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
        {groupNames.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Group (optional)</Label>
            <Select value={groupName} onValueChange={setGroupName}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No group</SelectItem>
                {groupNames.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
                groupName: groupName === "__none" ? undefined : groupName,
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
