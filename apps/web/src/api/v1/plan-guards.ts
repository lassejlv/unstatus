import { PLAN_LIMITS, type PlanFeature, type PlanLimit, type PlanTier } from "@/lib/plans";
import { ApiError } from "../helpers";

export function requireApiFeature(tier: PlanTier, feature: PlanFeature, label: string) {
  if (!PLAN_LIMITS[tier][feature]) {
    const requiredTier = PLAN_LIMITS.hobby[feature] ? "Hobby" : "Scale";
    throw new ApiError(
      "FORBIDDEN",
      `${label} is available on the ${requiredTier} plan. Upgrade to unlock this feature.`,
      403,
    );
  }
}

export function requireApiLimit(tier: PlanTier, limit: PlanLimit, currentCount: number) {
  const max = PLAN_LIMITS[tier][limit] as number;
  if (currentCount >= max) {
    const labels: Record<string, string> = {
      monitors: "monitors",
      statusPages: "status pages",
    };
    const name = labels[limit] ?? limit;
    throw new ApiError("FORBIDDEN", `Maximum of ${max} ${name} reached on your plan`, 403);
  }
}

