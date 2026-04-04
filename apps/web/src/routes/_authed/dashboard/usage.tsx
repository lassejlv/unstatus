import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/components/org-context";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Activity, Globe, Users, Bell } from "lucide-react";

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
          Current resource usage across your workspace.
        </p>
      </div>

      <UsageContent orgId={activeOrg.id} />
    </div>
  );
}

function UsageContent({ orgId }: { orgId: string }) {
  const { isPro, planName } = useSubscription();

  const { data: monitors } = useQuery(
    orpc.monitors.list.queryOptions({ input: { organizationId: orgId } }),
  );
  const { data: statusPages } = useQuery(
    orpc.statusPages.list.queryOptions({ input: { organizationId: orgId } }),
  );
  const { data: subscribers } = useQuery(
    orpc.subscribers.list.queryOptions({ input: { organizationId: orgId } }),
  );
  const { data: notifications } = useQuery(
    orpc.notifications.list.queryOptions({ input: { organizationId: orgId } }),
  );

  const monitorCount = monitors?.length ?? 0;
  const statusPageCount = statusPages?.length ?? 0;
  const subscriberCount = (subscribers as any[])?.length ?? 0;
  const notificationCount = (notifications as any[])?.length ?? 0;

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{isPro ? (planName ?? "Pro") : "Free"}</span>
            <Badge variant={isPro ? "default" : "secondary"}>
              {isPro ? "Active" : "Free plan"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Resources</CardTitle>
          <CardDescription>Current usage in your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          <UsageRow icon={Activity} label="Monitors" count={monitorCount} />
          <UsageRow icon={Globe} label="Status Pages" count={statusPageCount} />
          <UsageRow icon={Users} label="Subscribers" count={subscriberCount} />
          <UsageRow icon={Bell} label="Notification Channels" count={notificationCount} />
        </CardContent>
      </Card>
    </>
  );
}

function UsageRow({ icon: Icon, label, count }: { icon: typeof Activity; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-mono font-medium">{count}</span>
    </div>
  );
}
