import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
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
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge } from "@/components/upgrade-badge";

export const Route = createFileRoute("/_authed/dashboard/notifications")({
  component: NotificationsPage,
});

type NotificationChannelRow = {
  id: string;
  name: string;
  type: string;
  webhookUrl: string | null;
  recipientEmail: string | null;
  enabled: boolean;
  onIncidentCreated: boolean;
  onIncidentResolved: boolean;
  onIncidentUpdated: boolean;
  onMonitorDown: boolean;
  onMonitorRecovered: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function NotificationsPage() {
  const { activeOrg } = useOrg();

  if (!activeOrg) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Configure channels to receive alerts when things go wrong.
        </p>
      </div>

      <NotificationsList orgId={activeOrg.id} />
    </div>
  );
}

function NotificationsList({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const queryKey = ["notifications", orgId] as const;
  const { data } = useQuery({
    queryKey,
    queryFn: () => client.notifications.list({ organizationId: orgId }),
  });
  const channels = (data ?? []) as NotificationChannelRow[];

  const deleteMut = useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => client.notifications.delete({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Channel deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete");
    },
  });

  const toggleMut = useMutation<
    NotificationChannelRow,
    Error,
    { id: string; enabled: boolean }
  >({
    mutationFn: ({ id, enabled }) => client.notifications.update({ id, enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err) => {
      toast.error(err.message || "Failed to update");
    },
  });

  const testMut = useMutation<{ success: boolean }, Error, { id: string }>({
    mutationFn: ({ id }) => client.notifications.test({ id }),
    onSuccess: () => {
      toast.success("Test notification sent");
    },
    onError: (err) => {
      toast.error(err.message || "Test failed");
    },
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Notification channels</CardTitle>
        <CardDescription>
          Configure channels to receive alerts via Discord or email.
        </CardDescription>
        <CardAction>
          <AddNotificationDialog orgId={orgId} />
        </CardAction>
      </CardHeader>
      {channels?.length ? (
        <CardContent className="p-0">
          {channels.map((ch, i) => (
            <div
              key={ch.id}
              className={`flex items-center justify-between px-4 py-3 ${i < channels.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ch.name}</span>
                  <Badge variant="outline">
                    {ch.type === "discord" ? "Discord" : "Email"}
                  </Badge>
                  {!ch.enabled && <Badge variant="secondary">Disabled</Badge>}
                </div>
                <span className="max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                  {ch.type === "discord"
                    ? ch.webhookUrl?.replace(
                        /\/webhooks\/\d+\/.*/,
                        "/webhooks/***",
                      )
                    : ch.recipientEmail}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={ch.enabled}
                  onCheckedChange={(enabled) =>
                    toggleMut.mutate({ id: ch.id, enabled })
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMut.mutate({ id: ch.id })}
                  disabled={testMut.isPending}
                >
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => deleteMut.mutate({ id: ch.id })}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      ) : (
        <CardContent className="py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No notification channels configured. Add a Discord webhook or email
            to receive alerts.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function AddNotificationDialog({ orgId }: { orgId: string }) {
  const { isPro } = useSubscription();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"discord" | "email">("discord");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const queryKey = ["notifications", orgId] as const;

  const isValid = name && (type === "discord" ? webhookUrl : recipientEmail);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add channel</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add notification channel</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alerts"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as typeof type)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discord" disabled={!isPro}>
                  Discord {!isPro && " "}
                  {!isPro && <ProBadge />}
                </SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "discord" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Webhook URL</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Recipient emails</Label>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="alerts@example.com, team@example.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Separate multiple emails with commas
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!isValid || loading}
            onClick={async () => {
              setLoading(true);
              try {
                await client.notifications.create({
                  organizationId: orgId,
                  name,
                  type,
                  ...(type === "discord"
                    ? { webhookUrl }
                    : { recipientEmail }),
                });
                qc.invalidateQueries({ queryKey });
                toast.success("Channel added");
                setOpen(false);
                setName("");
                setWebhookUrl("");
                setRecipientEmail("");
              } catch (err: any) {
                toast.error(err.message || "Failed to add channel");
              } finally {
                setLoading(false);
              }
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
