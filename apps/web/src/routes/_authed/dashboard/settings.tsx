import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useOrg } from "@/components/org-context";
import { useState } from "react";
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
    <div className="rounded-lg border">
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
  const { data } = authClient.useListOrganizationMembers({ query: { organizationId: orgId } });
  const members = data ?? [];

  return (
    <div className="rounded-lg border">
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
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Invite member</Button>
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

function OrgSection() {
  const { data: orgs } = authClient.useListOrganizations();
  const { setActiveOrg, activeOrg } = useOrg();

  return (
    <div className="rounded-lg border">
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
