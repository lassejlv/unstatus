import { createFileRoute, Link } from "@tanstack/react-router";
import { skipToken, useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/usage")({
  component: UsagePage,
});

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  hobby: "Hobby",
  scale: "Scale",
};

const FEATURE_LABELS: Record<string, string> = {
  multiRegion: "Multi-region monitoring",
  autoIncidents: "Auto-create incidents",
  customDomain: "Custom domain",
  customCss: "Custom CSS",
  customJs: "Custom JS",
  discordAlerts: "Discord alerts",
  apiAccess: "API access",
  removeBranding: "Remove branding",
  pingMonitor: "Ping monitor",
  redisMonitor: "Redis monitor",
  postgresMonitor: "Postgres monitor",
  dependencies: "Dependencies",
};

function formatInterval(seconds: number) {
  if (seconds >= 60) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function UsagePage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;

  const { data, isLoading } = useQuery(
    orpc.billing.getUsage.queryOptions({
      input: orgId ? { organizationId: orgId } : skipToken,
    }),
  );

  if (!activeOrg) return null;

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1.5 h-4 w-56" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const tier = data.tier;
  const isScale = tier === "scale";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Usage</h1>
          <p className="text-sm text-muted-foreground">
            Resource usage on the{" "}
            <span className="font-medium text-foreground">
              {PLAN_LABELS[tier]}
            </span>{" "}
            plan.
          </p>
        </div>
        {!isScale && (
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/billing">Upgrade</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageCard
          label="Monitors"
          used={data.monitors.used}
          limit={data.monitors.limit}
        />
        <UsageCard
          label="Status Pages"
          used={data.statusPages.used}
          limit={data.statusPages.limit}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Check interval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatInterval(data.minInterval)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Minimum check interval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.features).map(([key, enabled]) => (
              <div
                key={key}
                className="flex items-center gap-2 text-sm"
              >
                {enabled ? (
                  <Check className="size-3.5 text-foreground" />
                ) : (
                  <X className="size-3.5 text-muted-foreground/50" />
                )}
                <span
                  className={
                    enabled ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {FEATURE_LABELS[key] ?? key}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageCard({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = !Number.isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && pct >= 80;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {isNearLimit && (
            <Badge variant="secondary" className="text-xs">
              {pct >= 100 ? "At limit" : "Near limit"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums">{used}</span>
          <span className="text-sm text-muted-foreground">
            / {isUnlimited ? "Unlimited" : limit}
          </span>
        </div>
        {!isUnlimited && (
          <Progress value={pct} className="mt-3" />
        )}
      </CardContent>
    </Card>
  );
}
