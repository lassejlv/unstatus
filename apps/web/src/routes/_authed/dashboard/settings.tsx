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
import { useCustomer, useListPlans } from "autumn-js/react";
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
import { Settings, Users, CreditCard, Building2 } from "lucide-react";

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
  const { data: members, isLoading: membersLoading } = authClient.useListMembers({ query: { organizationId: orgId } });
  const currentMember = userId
    ? members?.data?.find((m: any) => m.userId === userId)
    : null;
  const isOwner = membersLoading ? true : currentMember?.role === "owner";
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

function BillingSection({ orgId: _orgId }: { orgId: string }) {
  const { isPro, customer } = useSubscription();
  const { attach, updateSubscription, setupPayment, openCustomerPortal } = useCustomer();
  const [loading, setLoading] = useState(false);

  const activeSub = customer?.subscriptions?.find(
    (s) => s.status === "active" && !s.autoEnable,
  );
  const isCanceling = activeSub?.canceledAt != null;
  const periodEnd = activeSub?.currentPeriodEnd
    ? new Date(activeSub.currentPeriodEnd).toLocaleDateString()
    : null;

  // paymentMethod shape varies — try nested .card first, then top-level fields
  const pm = customer?.paymentMethod as Record<string, any> | null | undefined;
  const card = pm?.card ?? pm;
  const cardBrand = card?.brand as string | undefined;
  const cardLast4 = card?.last4 as string | undefined;
  const cardExpMonth = card?.exp_month as number | undefined;
  const cardExpYear = card?.exp_year as number | undefined;
  const hasCard = Boolean(cardLast4);

  const recentInvoices = customer?.invoices?.slice(0, 5);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Manage your subscription and billing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Current plan */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {activeSub?.plan?.name ?? (isPro ? "Pro" : "Free")}
              </span>
              {isCanceling ? (
                <Badge variant="secondary">Canceling</Badge>
              ) : (
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Active" : "Free"}
                </Badge>
              )}
            </div>
            {isPro && activeSub?.plan?.price ? (
              <span className="text-xs text-muted-foreground">
                {activeSub.plan.price.display?.primaryText ?? `$${activeSub.plan.price.amount}`}
                {" "}
                {activeSub.plan.price.display?.secondaryText ?? `/ ${activeSub.plan.price.interval}`}
              </span>
            ) : !isPro ? (
              <span className="text-xs text-muted-foreground">
                Upgrade to unlock all features
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {!isPro && <UpgradePlanDialog attach={attach} />}
            {isPro && activeSub && <UpgradePlanDialog attach={attach} currentPlanId={activeSub.planId} />}
          </div>
        </div>

        {/* Subscription details */}
        {isPro && activeSub && (
          <>
            <div className="rounded-lg border divide-y text-sm">
              {periodEnd && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-muted-foreground">
                    {isCanceling ? "Access until" : "Next billing date"}
                  </span>
                  <span className="font-medium">{periodEnd}</span>
                </div>
              )}
              {activeSub.trialEndsAt && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-muted-foreground">Trial ends</span>
                  <span className="font-medium">
                    {new Date(activeSub.trialEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-muted-foreground">Started</span>
                <span className="font-medium">
                  {new Date(activeSub.startedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Cancel / reactivate */}
            <div className="flex items-center justify-between">
              {isCanceling ? (
                <>
                  <span className="text-xs text-muted-foreground">
                    Your subscription will end on {periodEnd}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loading}>
                        Reactivate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reactivate subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your {activeSub.plan?.name ?? "Pro"} subscription will continue and you will be billed at the next billing cycle on {periodEnd}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Nevermind</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={loading}
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await updateSubscription({
                                planId: activeSub.planId,
                                cancelAction: "uncancel",
                              });
                              toast.success("Subscription reactivated");
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Reactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={loading}
                      >
                        Cancel subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your {activeSub.plan?.name ?? "Pro"} plan will remain active until {periodEnd}. After that, you'll lose access to Pro features including unlimited monitors, custom domains, and all regions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={loading}
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await updateSubscription({
                                planId: activeSub.planId,
                                cancelAction: "cancel_end_of_cycle",
                              });
                              toast.success("Subscription will cancel at end of billing period");
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Cancel subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </>
        )}

        {/* Payment method */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Payment method
          </span>
          <div className="mt-2 rounded-lg border text-sm">
            {hasCard ? (
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {cardBrand && <span className="font-medium capitalize">{cardBrand}</span>}
                  <span className="text-muted-foreground font-mono">
                    **** {cardLast4}
                  </span>
                  {cardExpMonth && cardExpYear && (
                    <span className="text-xs text-muted-foreground">
                      {String(cardExpMonth).padStart(2, "0")}/{cardExpYear}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await setupPayment();
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Update
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-muted-foreground">No payment method on file</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await setupPayment();
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Add payment method
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recent invoices */}
        {recentInvoices && recentInvoices.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Invoices
            </span>
            <div className="mt-2 rounded-lg border divide-y text-sm">
              {recentInvoices.map((inv) => (
                <div
                  key={inv.stripeId}
                  className="flex items-center justify-between px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono">
                      ${inv.total.toFixed(2)} {inv.currency.toUpperCase()}
                    </span>
                    {inv.hostedInvoiceUrl && (
                      <a
                        href={inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stripe portal link */}
        {isPro && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await openCustomerPortal();
                } finally {
                  setLoading(false);
                }
              }}
            >
              Open Stripe billing portal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpgradePlanDialog({
  attach,
  currentPlanId,
}: {
  attach: (params: { planId: string }) => Promise<any>;
  currentPlanId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: plans } = useListPlans();

  const availablePlans = plans?.filter((p) => !p.addOn && !p.autoEnable && p.id !== currentPlanId) ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          {currentPlanId ? "Change plan" : "Upgrade"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentPlanId ? "Change plan" : "Choose a plan"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {availablePlans.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No other plans available.
            </p>
          )}
          {availablePlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              disabled={loading}
              className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 disabled:opacity-50"
              onClick={async () => {
                setLoading(true);
                try {
                  await attach({ planId: plan.id });
                  setOpen(false);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{plan.name}</span>
                {plan.description && (
                  <span className="text-xs text-muted-foreground">{plan.description}</span>
                )}
                {plan.items.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {plan.items.slice(0, 4).map((item) => (
                      <Badge key={item.featureId} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {item.feature?.name ?? item.featureId}
                      </Badge>
                    ))}
                    {plan.items.length > 4 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        +{plan.items.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                {plan.price ? (
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-semibold font-mono">
                      {plan.price.display?.primaryText ?? `€${plan.price.amount}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {plan.price.display?.secondaryText ?? `/ ${plan.price.interval}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-medium">Free</span>
                )}
              </div>
            </button>
          ))}
        </div>
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
