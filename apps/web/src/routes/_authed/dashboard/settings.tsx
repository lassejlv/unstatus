import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useOrg } from "@/components/org-context";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/orpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge } from "@/components/upgrade-badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import { Settings, Users, Bell, CreditCard, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { activeOrg } = useOrg();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization, members, and preferences.
        </p>
      </div>

      {activeOrg && (
        <Tabs defaultValue="general" orientation="vertical" className="flex-row gap-8">
          <TabsList variant="line" className="w-44 shrink-0 flex-col items-stretch">
            <TabsTrigger value="general" className="justify-start">
              <Settings className="size-3.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="justify-start">
              <Users className="size-3.5" />
              Members
            </TabsTrigger>
            <TabsTrigger value="notifications" className="justify-start">
              <Bell className="size-3.5" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="billing" className="justify-start">
              <CreditCard className="size-3.5" />
              Billing
            </TabsTrigger>
            <Separator className="my-2" />
            <TabsTrigger value="organizations" className="justify-start">
              <Building2 className="size-3.5" />
              Organizations
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-w-0">
            <TabsContent value="general" className="flex flex-col gap-6">
              <OrgDetails orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="members" className="flex flex-col gap-6">
              <MembersSection orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="notifications" className="flex flex-col gap-6">
              <NotificationsSection orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="billing" className="flex flex-col gap-6">
              <BillingSection orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="organizations" className="flex flex-col gap-6">
              <OrgSection />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}

function OrgDetails({ orgId }: { orgId: string }) {
  const { data: org } = authClient.useActiveOrganization();
  const { setActiveOrg } = useOrg();
  const [name, setName] = useState(org?.name ?? "");
  const [slug, setSlug] = useState(org?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setSlug(org.slug);
    }
  }, [org?.name, org?.slug]);

  if (!org) return null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Manage your organization name and URL slug.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button
            size="sm"
            disabled={saving || (!name && !slug)}
            onClick={async () => {
              setSaving(true);
              await authClient.organization.update({
                data: { name, slug },
                organizationId: orgId,
              });
              setSaving(false);
              toast.success("Organization updated");
            }}
          >
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader className="border-b">
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete this organization and all its data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Delete organization</span>
              <span className="text-xs text-muted-foreground">
                This will delete all monitors, status pages, and data. This
                action cannot be undone.
              </span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {org.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the organization, all its
                    monitors, status pages, incidents, and notification channels.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deleting}
                    onClick={async (e) => {
                      e.preventDefault();
                      setDeleting(true);
                      try {
                        await authClient.organization.delete({
                          organizationId: orgId,
                        });
                        toast.success("Organization deleted");
                        setActiveOrg(null);
                      } catch (err: any) {
                        toast.error(
                          err.message || "Failed to delete organization",
                        );
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    {deleting ? "Deleting..." : "Delete organization"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MembersSection({ orgId }: { orgId: string }) {
  const { data: activeOrgData } = authClient.useActiveOrganization();
  const members = (activeOrgData as any)?.members ?? [];

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Manage who has access to this organization.
        </CardDescription>
        <CardAction>
          <InviteMemberDialog orgId={orgId} />
        </CardAction>
      </CardHeader>
      {members.length > 0 ? (
        <CardContent className="p-0">
          {members.map((m: any, i: number) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-4 py-3 ${i < members.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{m.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {m.user.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{m.role}</Badge>
                {m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() =>
                      authClient.organization.removeMember({
                        memberIdOrEmail: m.id,
                      })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      ) : (
        <CardContent className="py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No members yet. Invite someone to get started.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function InviteMemberDialog({ orgId }: { orgId: string }) {
  const { isPro } = useSubscription();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Invite member {!isPro && <ProBadge />}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as typeof role)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!email || loading}
            onClick={async () => {
              setLoading(true);
              await authClient.organization.inviteMember({
                email,
                role,
                organizationId: orgId,
              });
              setLoading(false);
              setOpen(false);
              setEmail("");
            }}
          >
            Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotificationsSection({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const queryOpts = orpc.notifications.list.queryOptions({
    input: { organizationId: orgId },
  });
  const { data: channels } = useQuery(queryOpts);

  const deleteMut = useMutation({
    ...orpc.notifications.delete.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryOpts.queryKey });
      toast.success("Channel deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const toggleMut = useMutation({
    ...orpc.notifications.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryOpts.queryKey }),
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  const testMut = useMutation({
    ...orpc.notifications.test.mutationOptions(),
    onSuccess: () => toast.success("Test notification sent"),
    onError: (err) => toast.error(err.message || "Test failed"),
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

  const queryOpts = orpc.notifications.list.queryOptions({
    input: { organizationId: orgId },
  });

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
                qc.invalidateQueries({ queryKey: queryOpts.queryKey });
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

function BillingSection({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);
  const { data: subscription } = useQuery(
    orpc.billing.getSubscription.queryOptions({
      input: { organizationId: orgId },
    }),
  );

  const isActive = subscription?.subscriptionActive ?? false;
  const planName = subscription?.subscriptionPlanName ?? "Free";

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Manage your subscription and billing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {isActive ? planName : "Free"}
              </span>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Free"}
              </Badge>
            </div>
            {isActive && (
              <span className="text-xs text-muted-foreground">
                {subscription?.cancelAtPeriodEnd
                  ? "Cancels at end of billing period"
                  : "$15/month"}
              </span>
            )}
            {!isActive && (
              <span className="text-xs text-muted-foreground">
                Upgrade to unlock all features
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await authClient.customer.portal();
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Manage subscription
              </Button>
            )}
            {!isActive && (
              <Button
                size="sm"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await authClient.checkoutEmbed({
                      slug: "pro",
                      referenceId: orgId,
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrgSection() {
  const { data: orgs } = authClient.useListOrganizations();
  const { setActiveOrg, activeOrg } = useOrg();

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Organizations</CardTitle>
        <CardDescription>
          Switch between or create new organizations.
        </CardDescription>
        <CardAction>
          <CreateOrgDialog />
        </CardAction>
      </CardHeader>
      {orgs?.length ? (
        <CardContent className="p-0">
          {orgs.map((org, i) => (
            <div
              key={org.id}
              className={`flex items-center justify-between px-4 py-3 ${i < orgs.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{org.name}</span>
                {org.id === activeOrg?.id && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </div>
              {org.id !== activeOrg?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveOrg(org.id)}
                >
                  Switch
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

function CreateOrgDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          New organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                );
              }}
              placeholder="My Team"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-team"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!name || !slug || loading}
            onClick={async () => {
              setLoading(true);
              await authClient.organization.create({ name, slug });
              setLoading(false);
              setOpen(false);
              setName("");
              setSlug("");
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
