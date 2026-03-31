import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useOrg } from "@/components/org-context";
import { useState } from "react";
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

export const Route = createFileRoute("/_authed/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { activeOrg } = useOrg();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Org details */}
      {activeOrg && <OrgDetails orgId={activeOrg.id} />}

      {/* Members */}
      {activeOrg && <MembersSection orgId={activeOrg.id} />}

      {/* Notifications */}
      {activeOrg && <NotificationsSection orgId={activeOrg.id} />}

      {/* Billing */}
      {activeOrg && <BillingSection orgId={activeOrg.id} />}

      {/* Organizations */}
      <OrgSection />
    </div>
  );
}

function OrgDetails({ orgId }: { orgId: string }) {
  const { data: org } = authClient.useActiveOrganization();
  const [name, setName] = useState(org?.name ?? "");
  const [slug, setSlug] = useState(org?.slug ?? "");
  const [saving, setSaving] = useState(false);

  if (!org) return null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Organization</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your organization name and URL slug.
        </p>
      </div>
      <div className="flex flex-col gap-4 p-4">
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
      </div>
      <div className="flex items-center justify-end border-t bg-muted/30 px-4 py-3">
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
          }}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}

function MembersSection({ orgId }: { orgId: string }) {
  const { data: activeOrgData } = authClient.useActiveOrganization();
  const members = (activeOrgData as any)?.members ?? [];

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Members</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage who has access to this organization.
          </p>
        </div>
        <InviteMemberDialog orgId={orgId} />
      </div>
      {members.length > 0 ? (
        <div>
          {members.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-4 py-3 ${i < members.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{m.user.name}</span>
                <span className="text-xs text-muted-foreground">{m.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{m.role}</Badge>
                {m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() =>
                      authClient.organization.removeMember({ memberIdOrEmail: m.id })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">No members yet. Invite someone to get started.</p>
        </div>
      )}
    </div>
  );
}

function InviteMemberDialog({ orgId }: { orgId: string }) {
  const { isPro } = useSubscription();
  // TODO: Check member count against free-tier limit (3 members) and gate invites for non-Pro orgs
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
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
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
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Notifications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure channels to receive alerts via Discord or email.
          </p>
        </div>
        <AddNotificationDialog orgId={orgId} />
      </div>
      {channels?.length ? (
        <div>
          {channels.map((ch, i) => (
            <div
              key={ch.id}
              className={`flex items-center justify-between px-4 py-3 ${i < channels.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ch.name}</span>
                  <Badge variant="outline">{ch.type === "discord" ? "Discord" : "Email"}</Badge>
                  {!ch.enabled && <Badge variant="secondary">Disabled</Badge>}
                </div>
                <span className="text-[11px] text-muted-foreground font-mono truncate max-w-xs">
                  {ch.type === "discord"
                    ? ch.webhookUrl?.replace(/\/webhooks\/\d+\/.*/, "/webhooks/***")
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
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No notification channels configured. Add a Discord webhook or email to receive alerts.
          </p>
        </div>
      )}
    </div>
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
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discord" disabled={!isPro}>Discord {!isPro && " "}{!isPro && <ProBadge />}</SelectItem>
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
                  ...(type === "discord" ? { webhookUrl } : { recipientEmail }),
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
    orpc.billing.getSubscription.queryOptions({ input: { organizationId: orgId } }),
  );

  const isActive = subscription?.subscriptionActive ?? false;
  const planName = subscription?.subscriptionPlanName ?? "Free";

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Billing</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your subscription and billing.
        </p>
      </div>
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{isActive ? planName : "Free"}</span>
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
                  await authClient.checkout({
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
    </div>
  );
}

function OrgSection() {
  const { data: orgs } = authClient.useListOrganizations();
  const { setActiveOrg, activeOrg } = useOrg();

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Organizations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch between or create new organizations.
          </p>
        </div>
        <CreateOrgDialog />
      </div>
      {orgs?.length ? (
        <div>
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
        </div>
      ) : null}
    </div>
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
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
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
