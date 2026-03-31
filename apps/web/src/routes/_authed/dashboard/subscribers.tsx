import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authed/dashboard/subscribers")({
  component: SubscribersPage,
});

function SubscribersPage() {
  const { activeOrg } = useOrg();

  if (!activeOrg) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Subscribers</h1>
        <p className="text-sm text-muted-foreground">
          People subscribed to status updates on your status pages.
        </p>
      </div>

      <SubscribersList orgId={activeOrg.id} />
    </div>
  );
}

function SubscribersList({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const queryOpts = orpc.subscribers.list.queryOptions({
    input: { organizationId: orgId },
  });
  const { data: subscribers } = useQuery(queryOpts);

  const deleteMut = useMutation({
    ...orpc.subscribers.delete.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryOpts.queryKey });
      toast.success("Subscriber removed");
    },
    onError: (err) => toast.error(err.message || "Failed to remove"),
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>All subscribers</CardTitle>
        <CardDescription>
          {subscribers?.length
            ? `${subscribers.length} subscriber${subscribers.length === 1 ? "" : "s"} across your status pages.`
            : "Subscribers are added when users sign up on your status pages."}
        </CardDescription>
      </CardHeader>
      {subscribers?.length ? (
        <CardContent className="p-0">
          {subscribers.map((sub, i) => (
            <div
              key={sub.id}
              className={`flex items-center justify-between px-4 py-3 ${i < subscribers.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{sub.email}</span>
                  <Badge variant={sub.verified ? "default" : "secondary"}>
                    {sub.verified ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {sub.statusPageName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() =>
                  deleteMut.mutate({ id: sub.id, organizationId: orgId })
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      ) : (
        <CardContent className="py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No subscribers yet. Subscribers are added when users sign up on your
            status pages.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
