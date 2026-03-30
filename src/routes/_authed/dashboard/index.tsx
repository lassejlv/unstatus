import { createFileRoute } from "@tanstack/react-router";
import { skipToken, useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_authed/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const monitorsQuery = orpc.monitors.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });
  const pagesQuery = orpc.statusPages.list.queryOptions({
    input: orgId ? { organizationId: orgId } : skipToken,
  });

  const { data: monitors } = useQuery(monitorsQuery);
  const { data: pages } = useQuery(pagesQuery);

  const active = monitors?.filter((m) => m.active).length ?? 0;
  const paused = monitors?.filter((m) => !m.active).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-sm font-medium">Overview</h1>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Monitors" value={monitors?.length ?? 0}>
          <span className="text-muted-foreground">
            {active} active · {paused} paused
          </span>
        </StatCard>
        <StatCard label="Status Pages" value={pages?.length ?? 0} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-medium">{value}</span>
      {children && <div className="text-[0.625rem]">{children}</div>}
    </div>
  );
}
