import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/orpc/client";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, ChevronLeft, ChevronRight, Trash2, Eye } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/organizations")({
  component: AdminOrganizationsPage,
});

const PAGE_SIZE = 25;

function AdminOrganizationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  const listOpts = orpc.admin.listOrganizations.queryOptions({
    input: { search: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  });
  const { data } = useQuery(listOpts);

  const { data: orgDetail } = useQuery({
    ...orpc.admin.getOrganization.queryOptions({ input: { organizationId: expandedOrgId! } }),
    enabled: !!expandedOrgId,
  });

  const deleteOrg = useMutation({
    mutationFn: (organizationId: string) => client.admin.deleteOrganization({ organizationId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listOpts.queryKey });
      setExpandedOrgId(null);
      toast.success("Organization deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  function planLabel(item: { subscriptionActive: boolean; subscriptionPlanName: string | null }) {
    if (!item.subscriptionActive) return "Free";
    return item.subscriptionPlanName ?? "Pro";
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} total organizations</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name or slug..."
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Slug</th>
              <th className="px-4 py-2 text-left font-medium">Plan</th>
              <th className="px-4 py-2 text-left font-medium">Members</th>
              <th className="px-4 py-2 text-left font-medium">Monitors</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((org) => (
              <>
                <tr key={org.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{org.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{org.slug}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={org.subscriptionActive ? "default" : "secondary"} className="">
                      {planLabel(org)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">{org.memberCount}</td>
                  <td className="px-4 py-2.5">{org.monitorCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete organization?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{org.name}" and all its monitors, incidents, and status pages.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteOrg.mutate(org.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
                {expandedOrgId === org.id && orgDetail && (
                  <tr key={`${org.id}-detail`}>
                    <td colSpan={6} className="border-b bg-muted/20 px-4 py-3">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Members</p>
                          <div className="flex flex-col gap-1">
                            {orgDetail.members.map((m) => (
                              <div key={m.id} className="flex items-center gap-2 text-xs">
                                <span>{m.user.name}</span>
                                <span className="text-muted-foreground">{m.user.email}</span>
                                <Badge variant="outline" className="">{m.role}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Monitors</p>
                          {orgDetail.monitors.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No monitors</p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {orgDetail.monitors.map((m) => (
                                <div key={m.id} className="flex items-center gap-2 text-xs">
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      m.lastStatus === "up" ? "bg-emerald-500" :
                                      m.lastStatus === "down" ? "bg-red-500" :
                                      m.lastStatus === "degraded" ? "bg-yellow-500" : "bg-muted-foreground"
                                    }`}
                                  />
                                  <span className="font-medium">{m.name}</span>
                                  <Badge variant="outline" className="">{m.type}</Badge>
                                  {m.lastLatency != null && (
                                    <span className="text-muted-foreground">{m.lastLatency}ms</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
