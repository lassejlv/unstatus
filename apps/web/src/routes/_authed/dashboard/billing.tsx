import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { authClient } from "@/lib/auth-client";
import { client } from "@/orpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/dashboard/billing")({
  component: BillingPage,
});

const PLAN_PRICES: Record<string, string> = {
  free: "$0/month",
  hobby: "$15/month",
  scale: "$49/month",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  hobby: "Hobby",
  scale: "Scale",
};

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

async function openScaleCheckout(orgId: string, theme: "light" | "dark") {
  const { url } = await client.billing.createScaleCheckout({
    organizationId: orgId,
    theme,
  });
  // Dynamic import to avoid SSR bundling issues with browser-only @polar-sh/checkout
  const { PolarEmbedCheckout } = await (new Function('return import("@polar-sh/checkout")')() as Promise<{ PolarEmbedCheckout: any }>);
  await PolarEmbedCheckout.create(url, { theme });
}

function CurrentPlanCard({ orgId }: { orgId: string }) {
  const { tier, planName, cancelAtPeriodEnd } = useSubscription();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const displayName = planName ?? PLAN_LABELS[tier];
  const price = PLAN_PRICES[tier];
  const checkoutTheme = theme === "dark" ? "dark" : "light" as const;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-semibold">{displayName}</span>
              {cancelAtPeriodEnd ? (
                <Badge variant="secondary">Canceling</Badge>
              ) : (
                <Badge variant={tier !== "free" ? "default" : "secondary"}>
                  {tier !== "free" ? "Active" : "Free plan"}
                </Badge>
              )}
            </div>
            {tier !== "free" ? (
              <span className="text-sm text-muted-foreground">{price}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Upgrade to unlock more features
              </span>
            )}
          </div>

          {tier === "free" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await authClient.checkoutEmbed({ slug: "hobby", referenceId: orgId, theme: checkoutTheme });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Upgrade to Hobby
              </Button>
              <Button
                size="sm"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await openScaleCheckout(orgId, checkoutTheme);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to open checkout");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Upgrade to Scale
              </Button>
            </div>
          )}

          {tier === "hobby" && (
            <Button
              size="sm"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await openScaleCheckout(orgId, checkoutTheme);
                } catch (err: any) {
                  toast.error(err.message || "Failed to open checkout");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Upgrade to Scale
            </Button>
          )}
        </div>

        {tier !== "free" && (
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
