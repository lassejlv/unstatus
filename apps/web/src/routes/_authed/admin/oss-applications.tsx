import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { orpc, client } from "@/orpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Check, Eye, Github, X } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/oss-applications")({
  component: AdminOssApplicationsPage,
});

const PAGE_SIZE = 25;
type StatusFilter = "pending" | "approved" | "rejected" | "all";

function AdminOssApplicationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const listOpts = orpc.admin.listOssApplications.queryOptions({
    input: {
      search: search || undefined,
      status,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
  });
  const { data, isLoading } = useQuery(listOpts);

  const invalidateList = () =>
    qc.invalidateQueries({ queryKey: listOpts.queryKey });

  const approve = useMutation({
    mutationFn: (vars: { applicationId: string; reviewNotes?: string }) =>
      client.admin.approveOssApplication(vars),
    onSuccess: () => {
      invalidateList();
      toast.success("Application approved — discount created and email sent");
      setExpandedId(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to approve"),
  });

  const reject = useMutation({
    mutationFn: (vars: { applicationId: string; reviewNotes: string }) =>
      client.admin.rejectOssApplication(vars),
    onSuccess: () => {
      invalidateList();
      toast.success("Application rejected");
      setExpandedId(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to reject"),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="OSS Applications"
        description={`${data?.total ?? 0} ${status === "all" ? "total" : status}`}
      />

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            value={search}
            onValueChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Search by org, applicant, or repo..."
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as StatusFilter);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Organization</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Repo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-5 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No applications found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((app) => {
                const expanded = expandedId === app.id;
                const variant =
                  app.status === "approved"
                    ? "success"
                    : app.status === "rejected"
                      ? "destructive"
                      : "warning";
                return (
                  <>
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="truncate text-sm font-medium">
                          {app.organization.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {app.organization.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="truncate text-sm">{app.user.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {app.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={app.githubRepo}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Github className="size-3" />
                          <span className="max-w-[240px] truncate">
                            {app.githubRepo.replace(/^https?:\/\/github\.com\//, "")}
                          </span>
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{app.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setExpandedId(expanded ? null : app.id)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          {app.status === "pending" && (
                            <>
                              <ApproveButton
                                applicationId={app.id}
                                orgName={app.organization.name}
                                isPending={approve.isPending}
                                onApprove={(notes) =>
                                  approve.mutate({
                                    applicationId: app.id,
                                    reviewNotes: notes,
                                  })
                                }
                              />
                              <RejectButton
                                applicationId={app.id}
                                orgName={app.organization.name}
                                isPending={reject.isPending}
                                onReject={(notes) =>
                                  reject.mutate({
                                    applicationId: app.id,
                                    reviewNotes: notes,
                                  })
                                }
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow key={`${app.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/20 p-4">
                          <div className="flex flex-col gap-3 text-xs">
                            <div>
                              <p className="mb-1 font-medium text-muted-foreground">
                                Reason
                              </p>
                              <p className="whitespace-pre-wrap text-sm">
                                {app.reason}
                              </p>
                            </div>
                            {app.website && (
                              <div>
                                <p className="mb-1 font-medium text-muted-foreground">
                                  Website
                                </p>
                                <a
                                  href={app.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm hover:text-foreground underline"
                                >
                                  {app.website}
                                </a>
                              </div>
                            )}
                            {app.reviewNotes && (
                              <div>
                                <p className="mb-1 font-medium text-muted-foreground">
                                  Reviewer note
                                </p>
                                <p className="whitespace-pre-wrap text-sm">
                                  {app.reviewNotes}
                                </p>
                              </div>
                            )}
                            {app.discountCode && (
                              <div>
                                <p className="mb-1 font-medium text-muted-foreground">
                                  Discount
                                </p>
                                <p className="text-sm">
                                  <code className="rounded border bg-background px-1.5 py-0.5 font-mono">
                                    {app.discountCode}
                                  </code>
                                  {app.discountExpiresAt && (
                                    <span className="ml-2 text-muted-foreground">
                                      expires{" "}
                                      {new Date(
                                        app.discountExpiresAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
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

function ApproveButton({
  orgName,
  isPending,
  onApprove,
}: {
  applicationId: string;
  orgName: string;
  isPending: boolean;
  onApprove: (notes: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-emerald-600 hover:text-emerald-700"
        >
          <Check className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve OSS application?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a 100% off Scale-plan discount code (6 months, 1
            redemption, 30-day expiry) and email it to the applicant for{" "}
            <strong>{orgName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5 px-6">
          <label className="text-xs font-medium text-muted-foreground">
            Internal notes (optional)
          </label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Verified via GitHub traffic / maintainer activity"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNotes("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onApprove(notes.trim() || undefined);
            }}
          >
            {isPending ? "Approving..." : "Approve & send code"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RejectButton({
  orgName,
  isPending,
  onReject,
}: {
  applicationId: string;
  orgName: string;
  isPending: boolean;
  onReject: (notes: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const canSubmit = notes.trim().length > 0 && !isPending;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-destructive hover:text-destructive"
        >
          <X className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject OSS application?</AlertDialogTitle>
          <AlertDialogDescription>
            Reject the application for <strong>{orgName}</strong>. The applicant
            can see the reason below on their /oss page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5 px-6">
          <label className="text-xs font-medium text-muted-foreground">
            Reason (shown to applicant)
          </label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Project needs more activity / doesn't match OSS criteria"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNotes("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              onReject(notes.trim());
            }}
          >
            {isPending ? "Rejecting..." : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
