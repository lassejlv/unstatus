import { env } from "./env";
import { type PlanTier, resolvePlanTier } from "./plans";

export function resolveServerPlanTier(
  subscriptionActive: boolean,
  subscriptionPlanName: string | null | undefined,
  subscriptionProductId?: string | null | undefined,
): PlanTier {
  return resolvePlanTier(subscriptionActive, subscriptionPlanName, subscriptionProductId, {
    hobby: env.POLAR_HOBBY_ID,
    pro: env.POLAR_PRO_ID,
    scale: env.POLAR_SCALE_ID,
  });
}
