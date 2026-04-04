import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";

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
          Manage your subscription and billing.
        </p>
      </div>

      <CurrentPlanCard orgId={activeOrg.id} />
    </div>
  );
}

function CurrentPlanCard({ orgId }: { orgId: string }) {
  const { isPro, planName, cancelAtPeriodEnd } = useSubscription();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-semibold">{isPro ? (planName ?? "Pro") : "Free"}</span>
              {cancelAtPeriodEnd ? (
                <Badge variant="secondary">Canceling</Badge>
              ) : (
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Active" : "Free plan"}
                </Badge>
              )}
            </div>
            {isPro ? (
              <span className="text-sm text-muted-foreground">$10/month</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Upgrade to unlock all features
              </span>
            )}
          </div>

          {!isPro && (
            <Button
              size="sm"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await authClient.checkoutEmbed({ slug: "pro", referenceId: orgId });
                } finally {
                  setLoading(false);
                }
              }}
            >
              Upgrade to Pro
            </Button>
          )}
        </div>

        {isPro && (
          <div className="mt-5 flex items-center justify-between">
            {cancelAtPeriodEnd ? (
              <span className="text-xs text-muted-foreground">
                Your subscription will end at the current billing period
              </span>
            ) : (
              <span className="text-xs text-muted-foreground" />
            )}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
