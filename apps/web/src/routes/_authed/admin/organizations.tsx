import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/orpc/client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { StatusDot } from "@/components/ui/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Trash2, Eye } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/organizations")({
  component: AdminOrganizationsPage,
});

const PAGE_SIZE = 25;

type PlanFilter = "all" | "free" | "paid";

function AdminOrganizationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [page, setPage] = useState(0);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  const listOpts = orpc.admin.listOrganizations.queryOptions({
    input: { search: search || undefined, plan: planFilter, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  });
  const { data, isLoading } = useQuery(listOpts);

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
      <PageHeader
        title="Organizations"
        description={`${data?.total ?? 0} total organizations`}
      />

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onValueChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Search by name or slug..."
          className="flex-1"
        />
        <div className="flex gap-1">
          {(["all", "paid", "free"] as const).map((plan) => (
            <Button
              key={plan}
              variant={planFilter === plan ? "default" : "outline"}
              size="sm"
              onClick={() => { setPlanFilter(plan); setPage(0); }}
            >
              <span className="capitalize">{plan === "all" ? "All" : plan === "paid" ? "Paid" : "Free"}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Monitors</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No organizations found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((org) => (
                <>
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{org.slug}</TableCell>
                    <TableCell>
                      <Badge variant={org.subscriptionActive ? "default" : "secondary"}>
                        {planLabel(org)}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.memberCount}</TableCell>
                    <TableCell>{org.monitorCount}</TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                  {expandedOrgId === org.id && orgDetail && (
                    <TableRow key={`${org.id}-detail`}>
                      <TableCell colSpan={6} className="bg-muted/20 p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Members</p>
                            <div className="flex flex-col gap-1">
                              {orgDetail.members.map((m) => (
                                <div key={m.id} className="flex items-center gap-2 text-xs">
                                  <span>{m.user.name}</span>
                                  <span className="text-muted-foreground">{m.user.email}</span>
                                  <Badge variant="outline">{m.role}</Badge>
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
                                    <StatusDot
                                      status={m.lastStatus as "up" | "down" | "degraded" | undefined}
                                      size="xs"
                                    />
                                    <span className="font-medium">{m.name}</span>
                                    <Badge variant="outline">{m.type}</Badge>
                                    {m.lastLatency != null && (
                                      <span className="text-muted-foreground">{m.lastLatency}ms</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={data?.total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
