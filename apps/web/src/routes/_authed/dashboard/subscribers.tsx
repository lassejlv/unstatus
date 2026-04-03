import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/orpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Subscribers</h1>
          <p className="text-sm text-muted-foreground">
            People subscribed to status updates on your status pages.
          </p>
        </div>
        <AddSubscriberDialog orgId={activeOrg.id} />
      </div>

      <SubscribersList orgId={activeOrg.id} />
    </div>
  );
}

function AddSubscriberDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [statusPageId, setStatusPageId] = useState("");
  const qc = useQueryClient();

  const { data: statusPages } = useQuery(
    orpc.statusPages.list.queryOptions({ input: { organizationId: orgId } }),
  );

  const addMut = useMutation({
    mutationFn: () =>
      client.subscribers.add({
        organizationId: orgId,
        statusPageId,
        email,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscribers", orgId] });
      toast.success("Verification email sent");
      setOpen(false);
      setEmail("");
      setStatusPageId("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add subscriber");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add subscriber</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subscriber</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status page</Label>
            <Select value={statusPageId} onValueChange={setStatusPageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status page" />
              </SelectTrigger>
              <SelectContent>
                {statusPages?.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            A verification email will be sent. The subscriber needs to confirm before they receive updates.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!email || !statusPageId || addMut.isPending}
            onClick={() => addMut.mutate()}
          >
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            : "No subscribers yet."}
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
            No subscribers yet. Add one above or they can sign up on your status pages.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
