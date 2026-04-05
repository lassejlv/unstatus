import { skipToken, useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";
import type { PlanTier } from "@/lib/plans";

export function useSubscription() {
  const { activeOrg } = useOrg();
  const { data, isLoading } = useQuery(
    orpc.billing.getSubscription.queryOptions({
      input: activeOrg ? { organizationId: activeOrg.id } : skipToken,
    }),
  );
  const tier: PlanTier = data?.tier ?? "free";
  return {
    tier,
    isPro: tier !== "free",
    isLoading,
    planName: data?.subscriptionPlanName ?? null,
    cancelAtPeriodEnd: data?.cancelAtPeriodEnd ?? false,
  };
}
