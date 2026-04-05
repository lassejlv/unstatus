import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Activity, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data: stats } = useQuery(
    orpc.admin.stats.queryOptions({ input: undefined }),
  );

  const cards = [
    { label: "Total Users", value: stats?.users ?? "-", icon: Users },
    { label: "Organizations", value: stats?.organizations ?? "-", icon: Building2 },
    { label: "Monitors", value: stats?.monitors ?? "-", icon: Activity },
    { label: "Checks Today", value: stats?.checksToday ?? "-", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">Platform-wide statistics and management.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-muted p-2">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
