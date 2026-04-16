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
  const { data } = useQuery(listOpts);

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
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} total users</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Orgs</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((user) => (
              <>
                <tr key={user.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {user.name}
                      {user.isAdmin && <Badge variant="secondary" className="">Admin</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-2.5">{user.orgCount}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
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
                  </td>
                </tr>
                {expandedUserId === user.id && userDetail && (
                  <tr key={`${user.id}-detail`}>
                    <td colSpan={5} className="border-b bg-muted/20 px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Organizations</p>
                      {userDetail.organizations.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No organizations</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {userDetail.organizations.map((org) => (
                            <div key={org.id} className="flex items-center gap-3 text-xs">
                              <span className="font-medium">{org.name}</span>
                              <Badge variant="outline" className="">{org.role}</Badge>
                              <span className="text-muted-foreground">{org.monitorCount} monitors</span>
                              {org.subscriptionActive && (
                                <Badge variant="secondary" className="">{org.subscriptionPlanName}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
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
