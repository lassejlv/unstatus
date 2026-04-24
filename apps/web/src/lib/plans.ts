import { ORPCError } from "@orpc/server";

export type PlanTier = "free" | "hobby" | "pro" | "scale";

export type PlanProductIds = {
  hobby?: string | null;
  pro?: string | null;
  scale?: string | null;
};

export const PLAN_LIMITS = {
  free: {
    monitors: 1,
    statusPages: 1,
    minInterval: 600,
    multiRegion: false,
    autoIncidents: false,
    customDomain: false,
    customCss: false,
    customJs: false,
    discordAlerts: false,
    apiAccess: false,
    removeBranding: false,
    pingMonitor: false,
    redisMonitor: false,
    postgresMonitor: false,
    dependencies: false,
  },
  hobby: {
    monitors: 10,
    statusPages: 3,
    minInterval: 60,
    multiRegion: false,
    autoIncidents: false,
    customDomain: true,
    customCss: false,
    customJs: false,
    discordAlerts: true,
    apiAccess: true,
    removeBranding: false,
    pingMonitor: false,
    redisMonitor: false,
    postgresMonitor: false,
    dependencies: false,
  },
  pro: {
    monitors: Infinity,
    statusPages: Infinity,
    minInterval: 60,
    multiRegion: false,
    autoIncidents: false,
    customDomain: true,
    customCss: false,
    customJs: false,
    discordAlerts: true,
    apiAccess: true,
    removeBranding: false,
    pingMonitor: false,
    redisMonitor: false,
    postgresMonitor: false,
    dependencies: false,
  },
  scale: {
    monitors: 50,
    statusPages: Infinity,
    minInterval: 10,
    multiRegion: true,
    autoIncidents: true,
    customDomain: true,
    customCss: true,
    customJs: true,
    discordAlerts: true,
    apiAccess: true,
    removeBranding: true,
    pingMonitor: true,
    redisMonitor: true,
    postgresMonitor: true,
    dependencies: true,
  },
} as const satisfies Record<PlanTier, Record<string, number | boolean>>;

export const PLAN_METERED_INCLUDES = {
  pro: {
    monitors: 5,
    customDomains: 1,
  },
} as const;

export type PlanFeature = {
  [K in keyof (typeof PLAN_LIMITS)["free"]]: (typeof PLAN_LIMITS)["free"][K] extends boolean ? K : never;
}[keyof (typeof PLAN_LIMITS)["free"]];

export type PlanLimit = {
  [K in keyof (typeof PLAN_LIMITS)["free"]]: (typeof PLAN_LIMITS)["free"][K] extends number ? K : never;
}[keyof (typeof PLAN_LIMITS)["free"]];

/**
 * Resolve the plan tier from subscription state.
 * Existing stored "Pro" subscribers without a matching new Pro product ID are
 * grandfathered into Scale.
 */
export function resolvePlanTier(
  subscriptionActive: boolean,
  subscriptionPlanName: string | null | undefined,
  subscriptionProductId?: string | null | undefined,
  productIds: PlanProductIds = {},
): PlanTier {
  if (!subscriptionActive) return "free";

  if (subscriptionProductId) {
    if (productIds.pro && subscriptionProductId === productIds.pro) return "pro";
    if (productIds.scale && subscriptionProductId === productIds.scale) return "scale";
    if (productIds.hobby && subscriptionProductId === productIds.hobby) return "hobby";
  }

  const name = subscriptionPlanName?.trim().toLowerCase();
  if (name === "hobby") return "hobby";
  if (name === "scale") return "scale";
  // Grandfather: existing "Pro" subscribers get Scale access unless the
  // product ID identifies the new Pro plan above.
  if (name === "pro") return "scale";
  return "hobby";
}

export function requireFeature(tier: PlanTier, feature: PlanFeature, label: string) {
  if (!PLAN_LIMITS[tier][feature]) {
    const requiredTier = PLAN_LIMITS.pro[feature] ? "Pro" : PLAN_LIMITS.hobby[feature] ? "Hobby" : "Scale";
    throw new ORPCError("FORBIDDEN", {
      message: `${label} is available on the ${requiredTier} plan. Upgrade to unlock this feature.`,
    });
  }
}

export function requireLimit(tier: PlanTier, limit: PlanLimit, currentCount: number) {
  const max = PLAN_LIMITS[tier][limit] as number;
  if (currentCount >= max) {
    const labels: Record<string, string> = {
      monitors: "monitors",
      statusPages: "status pages",
    };
    const name = labels[limit] ?? limit;
    throw new ORPCError("FORBIDDEN", {
      message: `You've reached the maximum of ${max} ${name} on your plan. Upgrade to add more.`,
    });
  }
}
