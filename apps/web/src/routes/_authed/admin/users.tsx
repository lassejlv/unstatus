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

export const Route = createFileRoute("/_authed/admin/users")({
  component: AdminUsersPage,
});

const PAGE_SIZE = 25;

function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const listOpts = orpc.admin.listUsers.queryOptions({
    input: { search: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  });
  const { data, isLoading } = useQuery(listOpts);

  const { data: userDetail } = useQuery({
    ...orpc.admin.getUser.queryOptions({ input: { userId: expandedUserId! } }),
    enabled: !!expandedUserId,
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => client.admin.deleteUser({ userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listOpts.queryKey });
      setExpandedUserId(null);
      toast.success("User deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader
        title="Users"
        description={`${data?.total ?? 0} total users`}
      />

      <SearchInput
        value={search}
        onValueChange={(v) => { setSearch(v); setPage(0); }}
        placeholder="Search by name or email..."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Orgs</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((user) => (
                <>
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.name}
                        {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{user.orgCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
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
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {user.name} ({user.email}) and all their owned organizations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser.mutate(user.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedUserId === user.id && userDetail && (
                    <TableRow key={`${user.id}-detail`}>
                      <TableCell colSpan={5} className="bg-muted/20 p-4">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Organizations</p>
                        {userDetail.organizations.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No organizations</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {userDetail.organizations.map((org) => (
                              <div key={org.id} className="flex items-center gap-3 text-xs">
                                <span className="font-medium">{org.name}</span>
                                <Badge variant="outline">{org.role}</Badge>
                                <span className="text-muted-foreground">{org.monitorCount} monitors</span>
                                {org.subscriptionActive && (
                                  <Badge variant="secondary">{org.subscriptionPlanName}</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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
