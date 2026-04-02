import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/orpc/client";
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

type SubscriberRow = {
  id: string;
  email: string;
  verified: boolean;
  statusPageName: string;
};

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
  const queryKey = ["subscribers", orgId] as const;
  const { data } = useQuery({
    queryKey,
    queryFn: () => client.subscribers.list({ organizationId: orgId }),
  });
  const subscribers = (data ?? []) as SubscriberRow[];

  const deleteMut = useMutation<{ success: boolean }, Error, { id: string }>({
    mutationFn: ({ id }) => client.subscribers.delete({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Subscriber removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove");
    },
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
                  deleteMut.mutate({ id: sub.id })
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
