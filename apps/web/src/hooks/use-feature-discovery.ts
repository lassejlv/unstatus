import { useEffect, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY_PREFIX = "unstatus:features";

interface FeatureDiscoveryState {
  /** Features that have been discovered/seen */
  discovered: string[];
  /** Features that have been dismissed */
  dismissed: string[];
}

const defaultState: FeatureDiscoveryState = {
  discovered: [],
  dismissed: [],
};

function getStorageKey(orgId: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}:${orgId ?? "default"}`;
}

function readState(orgId: string | undefined): FeatureDiscoveryState {
  if (typeof window === "undefined") return defaultState;

  try {
    const stored = localStorage.getItem(getStorageKey(orgId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return defaultState;
}

function writeState(orgId: string | undefined, state: FeatureDiscoveryState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getStorageKey(orgId), JSON.stringify(state));
  } catch {
    // Ignore write errors
  }
}

// External store for syncing
let listeners: Array<() => void> = [];
let cachedState: FeatureDiscoveryState = defaultState;
let cachedOrgId: string | undefined;

function subscribe(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot(): FeatureDiscoveryState {
  return cachedState;
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

// Available features for progressive disclosure
export const FEATURES = {
  MULTI_REGION: "multi-region",
  AUTO_INCIDENTS: "auto-incidents",
  CUSTOM_DOMAIN: "custom-domain",
  NOTIFICATION_CHANNELS: "notification-channels",
  STATUS_PAGE_CUSTOMIZATION: "status-page-customization",
  API_ACCESS: "api-access",
  TEAM_MEMBERS: "team-members",
  MAINTENANCE_WINDOWS: "maintenance-windows",
} as const;

export type FeatureId = (typeof FEATURES)[keyof typeof FEATURES];

// Feature metadata
export const FEATURE_META: Record<
  FeatureId,
  {
    title: string;
    description: string;
    learnMoreUrl?: string;
  }
> = {
  [FEATURES.MULTI_REGION]: {
    title: "Multi-region monitoring",
    description:
      "Monitor from multiple locations worldwide to detect regional outages.",
  },
  [FEATURES.AUTO_INCIDENTS]: {
    title: "Automatic incidents",
    description:
      "Automatically create incidents when monitors go down, and resolve them when they recover.",
  },
  [FEATURES.CUSTOM_DOMAIN]: {
    title: "Custom domain",
    description:
      "Use your own domain for your status page (e.g., status.yourcompany.com).",
  },
  [FEATURES.NOTIFICATION_CHANNELS]: {
    title: "Notification channels",
    description:
      "Get alerted via Discord, Slack, email, or webhooks when issues occur.",
  },
  [FEATURES.STATUS_PAGE_CUSTOMIZATION]: {
    title: "Status page branding",
    description:
      "Customize your status page with your brand colors, logo, and custom CSS.",
  },
  [FEATURES.API_ACCESS]: {
    title: "API access",
    description:
      "Programmatically manage monitors and incidents using our REST API.",
  },
  [FEATURES.TEAM_MEMBERS]: {
    title: "Team collaboration",
    description: "Invite team members to help manage your monitoring setup.",
  },
  [FEATURES.MAINTENANCE_WINDOWS]: {
    title: "Maintenance windows",
    description:
      "Schedule maintenance to pause monitoring and notify subscribers.",
  },
};

interface UseFeatureDiscoveryOptions {
  orgId: string | undefined;
}

interface UseFeatureDiscoveryReturn {
  /** Check if a feature has been discovered */
  isDiscovered: (featureId: FeatureId) => boolean;
  /** Check if a feature spotlight has been dismissed */
  isDismissed: (featureId: FeatureId) => boolean;
  /** Mark a feature as discovered */
  markDiscovered: (featureId: FeatureId) => void;
  /** Dismiss a feature spotlight */
  dismiss: (featureId: FeatureId) => void;
  /** Get all features that should show spotlights */
  getAvailableSpotlights: (
    unlockedFeatures: FeatureId[]
  ) => FeatureId[];
  /** Reset all discovery state */
  reset: () => void;
}

/**
 * Hook to track feature discovery for progressive disclosure.
 * Shows spotlights for new features as users unlock them.
 */
export function useFeatureDiscovery({
  orgId,
}: UseFeatureDiscoveryOptions): UseFeatureDiscoveryReturn {
  // Initialize state from localStorage
  useEffect(() => {
    if (cachedOrgId !== orgId) {
      cachedOrgId = orgId;
      cachedState = readState(orgId);
      notifyListeners();
    }
  }, [orgId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, () => defaultState);

  const isDiscovered = useCallback(
    (featureId: FeatureId) => state.discovered.includes(featureId),
    [state.discovered]
  );

  const isDismissed = useCallback(
    (featureId: FeatureId) => state.dismissed.includes(featureId),
    [state.dismissed]
  );

  const markDiscovered = useCallback(
    (featureId: FeatureId) => {
      if (cachedState.discovered.includes(featureId)) return;

      const newState = {
        ...cachedState,
        discovered: [...cachedState.discovered, featureId],
      };
      cachedState = newState;
      writeState(orgId, newState);
      notifyListeners();
    },
    [orgId]
  );

  const dismiss = useCallback(
    (featureId: FeatureId) => {
      if (cachedState.dismissed.includes(featureId)) return;

      const newState = {
        ...cachedState,
        dismissed: [...cachedState.dismissed, featureId],
      };
      cachedState = newState;
      writeState(orgId, newState);
      notifyListeners();
    },
    [orgId]
  );

  const getAvailableSpotlights = useCallback(
    (unlockedFeatures: FeatureId[]) => {
      return unlockedFeatures.filter(
        (f) => !state.discovered.includes(f) && !state.dismissed.includes(f)
      );
    },
    [state.discovered, state.dismissed]
  );

  const reset = useCallback(() => {
    cachedState = defaultState;
    writeState(orgId, defaultState);
    notifyListeners();
  }, [orgId]);

  return {
    isDiscovered,
    isDismissed,
    markDiscovered,
    dismiss,
    getAvailableSpotlights,
    reset,
  };
}
