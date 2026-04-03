import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/use-subscription";
import { useCustomer, useListPlans } from "autumn-js/react";
import { Check, ArrowRight, CreditCard, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { activeOrg } = useOrg();

  if (!activeOrg) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription, payment method, and invoices.
        </p>
      </div>

      <CurrentPlanCard />
      <PaymentMethodCard />
      <InvoicesCard />
    </div>
  );
}

// --- Current Plan ---

function CurrentPlanCard() {
  const { isPro, customer } = useSubscription();
  const { updateSubscription, attach } = useCustomer();
  const [loading, setLoading] = useState(false);

  const activeSub = customer?.subscriptions?.find(
    (s) => s.status === "active" && !s.autoEnable,
  );
  const isCanceling = activeSub?.canceledAt != null;
  const periodEnd = activeSub?.currentPeriodEnd
    ? new Date(activeSub.currentPeriodEnd).toLocaleDateString()
    : null;
  const planName = activeSub?.plan?.name ?? (isPro ? "Pro" : "Free");

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-semibold">{planName}</span>
              {isCanceling ? (
                <Badge variant="secondary">Canceling</Badge>
              ) : (
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Active" : "Free plan"}
                </Badge>
              )}
            </div>
            {isPro && activeSub?.plan?.price ? (
              <span className="text-sm text-muted-foreground">
                {activeSub.plan.price.display?.primaryText ?? `€${activeSub.plan.price.amount}`}
                {" "}
                {activeSub.plan.price.display?.secondaryText ?? `/ ${activeSub.plan.price.interval}`}
              </span>
            ) : !isPro ? (
              <span className="text-sm text-muted-foreground">
                Upgrade to unlock all features
              </span>
            ) : null}
          </div>

          {!isPro && (
            <UpgradePlanDialog attach={attach} />
          )}
          {isPro && activeSub && (
            <UpgradePlanDialog attach={attach} currentPlanId={activeSub.planId} />
          )}
        </div>

        {isPro && activeSub && (
          <div className="mt-5 grid grid-cols-3 gap-4 rounded-lg border p-4">
            {periodEnd && (
              <div>
                <span className="text-xs text-muted-foreground">
                  {isCanceling ? "Access until" : "Next billing"}
                </span>
                <p className="mt-0.5 text-sm font-medium">{periodEnd}</p>
              </div>
            )}
            {activeSub.trialEndsAt && (
              <div>
                <span className="text-xs text-muted-foreground">Trial ends</span>
                <p className="mt-0.5 text-sm font-medium">
                  {new Date(activeSub.trialEndsAt).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Started</span>
              <p className="mt-0.5 text-sm font-medium">
                {new Date(activeSub.startedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Cancel / reactivate */}
        {isPro && activeSub && (
          <div className="mt-4 flex items-center justify-between">
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
                        Your {planName} subscription will continue and you will be billed at the next billing cycle on {periodEnd}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Nevermind</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await updateSubscription({ planId: activeSub.planId, cancelAction: "uncancel" });
                            toast.success("Subscription reactivated");
                          } finally { setLoading(false); }
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
                <span />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={loading}>
                      Cancel subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your {planName} plan will remain active until {periodEnd}. After that, you'll lose access to paid features.
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
                            await updateSubscription({ planId: activeSub.planId, cancelAction: "cancel_end_of_cycle" });
                            toast.success("Subscription will cancel at end of billing period");
                          } finally { setLoading(false); }
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
        )}
      </CardContent>
    </Card>
  );
}

// --- Plan Comparison ---

function PlanComparisonCard() {
  const { data: plans } = useListPlans();
  const { customer } = useSubscription();
  const { attach } = useCustomer();

  const allPlans = plans?.filter((p) => !p.addOn) ?? [];
  const activePlanId = customer?.subscriptions?.find(
    (s) => s.status === "active" && !s.autoEnable,
  )?.planId;

  if (allPlans.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Plans</CardTitle>
        <CardDescription>Compare available plans and features.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`grid divide-x ${allPlans.length >= 3 ? "grid-cols-3" : allPlans.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {/* Free column */}
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Free</span>
              {!activePlanId && <Badge variant="default">Current</Badge>}
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">€0</p>
            <p className="mt-1 text-xs text-muted-foreground">Forever free</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Check className="size-3 text-muted-foreground" /> 5 monitors</div>
              <div className="flex items-center gap-1.5"><Check className="size-3 text-muted-foreground" /> 1 status page</div>
              <div className="flex items-center gap-1.5"><Check className="size-3 text-muted-foreground" /> Email notifications</div>
              <div className="flex items-center gap-1.5"><Check className="size-3 text-muted-foreground" /> 1 region</div>
            </div>
          </div>

          {/* Paid plan columns */}
          {allPlans
            .filter((p) => !p.autoEnable)
            .map((plan) => {
              const isCurrent = plan.id === activePlanId;
              const eligibility = plan.customerEligibility;
              return (
                <div key={plan.id} className={`p-5 ${isCurrent ? "bg-accent/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{plan.name}</span>
                    {isCurrent && <Badge variant="default">Current</Badge>}
                  </div>
                  <p className="mt-1 text-2xl font-bold font-mono">
                    {plan.price?.display?.primaryText ?? `€${plan.price?.amount ?? 0}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.price?.display?.secondaryText ?? `/ ${plan.price?.interval ?? "month"}`}
                  </p>

                  {!isCurrent && (
                    <Button
                      size="sm"
                      className="mt-3 w-full gap-1 text-xs"
                      onClick={() => attach({ planId: plan.id })}
                    >
                      {eligibility?.attachAction === "upgrade" ? "Upgrade" : eligibility?.attachAction === "downgrade" ? "Downgrade" : "Get started"}
                      <ArrowRight className="size-3" />
                    </Button>
                  )}

                  {plan.items.length > 0 && (
                    <div className="mt-4 space-y-2 text-xs">
                      {plan.items.map((item) => (
                        <div key={item.featureId} className="flex items-center gap-1.5">
                          <Check className="size-3 text-emerald-500" />
                          <span>
                            {item.display?.primaryText
                              ?? (item.unlimited
                                ? `Unlimited ${item.feature?.display?.plural ?? item.feature?.name ?? item.featureId}`
                                : item.feature?.name ?? item.featureId)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Features / Usage ---

function FeaturesCard() {
  const { customer } = useSubscription();

  const flags = customer?.flags ? Object.values(customer.flags) : [];
  const balances = customer?.balances ? Object.values(customer.balances) : [];

  if (flags.length === 0 && balances.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Your features</CardTitle>
        <CardDescription>Features included in your current plan.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {/* Boolean flags */}
        {flags.map((flag: any) => (
          <div key={flag.featureId} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-sm">{flag.feature?.name ?? flag.featureId}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">Included</Badge>
          </div>
        ))}

        {/* Metered balances */}
        {balances.map((bal: any) => {
          const pct = bal.unlimited ? 100 : bal.granted > 0 ? Math.round((bal.remaining / bal.granted) * 100) : 0;
          return (
            <div key={bal.featureId} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{bal.feature?.name ?? bal.featureId}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {bal.unlimited ? "Unlimited" : `${bal.remaining} / ${bal.granted}`}
                </span>
              </div>
              {!bal.unlimited && bal.granted > 0 && (
                <Progress value={pct} className="mt-2 h-1.5" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// --- Payment Method ---

function PaymentMethodCard() {
  const { customer } = useSubscription();
  const { setupPayment, openCustomerPortal } = useCustomer();
  const [loading, setLoading] = useState(false);

  const pm = customer?.paymentMethod as Record<string, any> | null | undefined;
  const card = pm?.card ?? pm;
  const cardBrand = card?.brand as string | undefined;
  const cardLast4 = card?.last4 as string | undefined;
  const cardExpMonth = card?.exp_month as number | undefined;
  const cardExpYear = card?.exp_year as number | undefined;
  const hasCard = Boolean(cardLast4);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Payment method</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {hasCard ? (
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                <CreditCard className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {cardBrand && <span className="text-sm font-medium capitalize">{cardBrand}</span>}
                  <span className="text-sm text-muted-foreground font-mono">•••• {cardLast4}</span>
                </div>
                {cardExpMonth && cardExpYear && (
                  <span className="text-xs text-muted-foreground">
                    Expires {String(cardExpMonth).padStart(2, "0")}/{cardExpYear}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try { await setupPayment(); } finally { setLoading(false); }
              }}
            >
              Update
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-muted-foreground">No payment method on file</span>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try { await setupPayment(); } finally { setLoading(false); }
              }}
            >
              Add payment method
            </Button>
          </div>
        )}

        {/* Stripe portal link */}
        <div className="border-t px-5 py-3">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try { await openCustomerPortal(); } finally { setLoading(false); }
            }}
          >
            Open Stripe billing portal <ExternalLink className="size-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Invoices ---

function InvoicesCard() {
  const { customer } = useSubscription();
  const invoices = customer?.invoices;

  if (!invoices || invoices.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {invoices.map((inv) => (
          <div
            key={inv.stripeId}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {new Date(inv.createdAt).toLocaleDateString()}
              </span>
              <Badge
                variant={inv.status === "paid" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {inv.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium font-mono">
                €{inv.total.toFixed(2)} {inv.currency.toUpperCase()}
              </span>
              {inv.hostedInvoiceUrl && (
                <a
                  href={inv.hostedInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// --- Upgrade Plan Dialog ---

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
          <DialogTitle>{currentPlanId ? "Change plan" : "Choose a plan"}</DialogTitle>
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
                } finally { setLoading(false); }
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
