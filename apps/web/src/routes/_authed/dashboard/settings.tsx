import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useOrg } from "@/components/org-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import { Settings, Users, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/settings")({
  component: SettingsPage,
});



const MAX_ORGANIZATIONS = 3;

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
  const { activeOrg } = useOrg();
  const { data: session } = authClient.useSession();
  const [name, setName] = useState(activeOrg?.name ?? "");
  const [slug, setSlug] = useState(activeOrg?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name);
      setSlug(activeOrg.slug);
    }
  }, [activeOrg?.name, activeOrg?.slug]);

  if (!activeOrg) return <Spinner className="mx-auto my-8 size-5" />;

  const org = activeOrg;
  const userId = session?.user.id;
  const { data: members } = authClient.useListMembers({ query: { organizationId: orgId } });
  const memberList = Array.isArray(members) ? members : (members as any)?.data ?? [];
  const currentMember = userId
    ? memberList.find((m: any) => m.userId === userId)
    : null;
  const isOwner = currentMember ? currentMember.role === "owner" : true;
  const isPersonalOrg = Boolean(
    userId
    && org.name === "Personal"
    && org.slug.endsWith(`-personal-${userId.slice(0, 8)}`),
  );
  const canDeleteOrg = isOwner && !isPersonalOrg;
  const deleteDisabledReason =
    isPersonalOrg
      ? "Your personal organization cannot be deleted."
      : !isOwner
        ? "Only organization owners can delete an organization."
        : null;

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
              {deleteDisabledReason && (
                <span className="text-xs text-muted-foreground">
                  {deleteDisabledReason}
                </span>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={!canDeleteOrg || deleting}>
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
                        window.location.href = "/dashboard?tab=overview";
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


function OrgSection() {
  const { data: orgs } = authClient.useListOrganizations();
  const { setActiveOrg, activeOrg } = useOrg();
  const orgCount = orgs?.length ?? 0;
  const canCreateOrg = orgCount < MAX_ORGANIZATIONS;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Organizations</CardTitle>
        <CardDescription>
          Switch between or create new organizations.
        </CardDescription>
        <CardAction>
          <CreateOrgDialog disabled={!canCreateOrg} />
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
      <CardContent className="border-t py-3">
        <p className="text-xs text-muted-foreground">
          {orgCount} / {MAX_ORGANIZATIONS} organizations used.
        </p>
      </CardContent>
    </Card>
  );
}

function CreateOrgDialog({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
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
            disabled={!name || !slug || loading || disabled}
            onClick={async () => {
              setLoading(true);
              try {
                await authClient.organization.create({ name, slug });
                setOpen(false);
                setName("");
                setSlug("");
              } catch (err: any) {
                toast.error(err.message || "Failed to create organization");
              } finally {
                setLoading(false);
              }
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
