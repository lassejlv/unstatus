import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Activity, Globe, Users, Zap, Link2, Check } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/usage")({
  component: UsagePage,
});

function UsagePage() {
  const { activeOrg } = useOrg();

  if (!activeOrg) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Usage</h1>
        <p className="text-sm text-muted-foreground">
          Track your current usage and plan limits.
        </p>
      </div>

      <UsageContent />
    </div>
  );
}

const FEATURE_META: Record<string, { label: string; icon: typeof Activity; unit?: string }> = {
  checks: { label: "Checks", icon: Zap, unit: "checks" },
  monitors: { label: "Monitors", icon: Activity, unit: "monitors" },
  status_pages: { label: "Status Pages", icon: Globe, unit: "pages" },
  custom_domain: { label: "Custom Domains", icon: Link2, unit: "domains" },
  subscribers: { label: "Subscribers", icon: Users, unit: "subscribers" },
};

function UsageContent() {
  const { customer, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  const balances = customer?.balances ? Object.values(customer.balances) : [];
  const flags = customer?.flags ? Object.values(customer.flags) : [];

  const meteredBalances = balances.filter((b: any) => FEATURE_META[b.featureId]);
  const otherBalances = balances.filter((b: any) => !FEATURE_META[b.featureId]);

  const activeSub = customer?.subscriptions?.find(
    (s) => s.status === "active" && !s.autoEnable,
  );

  return (
    <>
      {/* Current plan */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {activeSub?.plan?.name ?? "Free"}
              </span>
              <Badge variant={activeSub ? "default" : "secondary"}>
                {activeSub ? "Active" : "Free plan"}
              </Badge>
            </div>
            {activeSub?.currentPeriodEnd && (
              <span className="text-xs text-muted-foreground">
                Resets {new Date(activeSub.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metered usage */}
      {meteredBalances.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Usage</CardTitle>
            <CardDescription>Current billing period usage and limits.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {meteredBalances.map((bal: any) => {
              const meta = FEATURE_META[bal.featureId];
              if (!meta) return null;
              const Icon = meta.icon;
              const used = bal.usage ?? 0;
              const granted = bal.granted ?? 0;
              const remaining = bal.remaining ?? 0;
              const pct = bal.unlimited ? 0 : granted > 0 ? Math.min(Math.round((used / granted) * 100), 100) : 0;
              const isHigh = !bal.unlimited && pct >= 80;

              return (
                <div key={bal.featureId} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/50">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{meta.label}</span>
                        {bal.nextResetAt && (
                          <p className="text-[10px] text-muted-foreground">
                            Resets {new Date(bal.nextResetAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {bal.unlimited ? (
                        <span className="text-sm font-medium">Unlimited</span>
                      ) : (
                        <>
                          <span className="text-sm font-medium font-mono">
                            {used.toLocaleString()} <span className="text-muted-foreground">/ {granted.toLocaleString()}</span>
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {remaining.toLocaleString()} remaining
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {!bal.unlimited && granted > 0 && (
                    <Progress
                      value={pct}
                      className={`h-2 ${isHigh ? "[&>div]:bg-orange-500" : ""}`}
                    />
                  )}
                  {bal.overageAllowed && !bal.unlimited && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Overage billing enabled beyond included amount
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Other metered balances */}
      {otherBalances.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Other limits</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {otherBalances.map((bal: any) => {
              const used = bal.usage ?? 0;
              const granted = bal.granted ?? 0;
              return (
                <div key={bal.featureId} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm">{bal.feature?.name ?? bal.featureId}</span>
                  <span className="text-sm font-mono">
                    {bal.unlimited ? "Unlimited" : `${used} / ${granted}`}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Boolean features */}
      {flags.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Features</CardTitle>
            <CardDescription>Features included in your current plan.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {flags.map((flag: any) => (
              <div key={flag.featureId} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-sm">{flag.feature?.name ?? flag.featureId}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">Included</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {meteredBalances.length === 0 && flags.length === 0 && otherBalances.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No usage data available yet. Usage will appear once you start using features.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
