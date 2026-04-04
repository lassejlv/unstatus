import { skipToken, useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";
import { useOrg } from "@/components/org-context";

export function useSubscription() {
  const { activeOrg } = useOrg();
  const { data, isLoading } = useQuery(
    orpc.billing.getSubscription.queryOptions({
      input: activeOrg ? { organizationId: activeOrg.id } : skipToken,
    }),
  );
  return {
    isPro: data?.subscriptionActive ?? false,
    isLoading,
    planName: data?.subscriptionPlanName ?? null,
    cancelAtPeriodEnd: data?.cancelAtPeriodEnd ?? false,
  };
}
