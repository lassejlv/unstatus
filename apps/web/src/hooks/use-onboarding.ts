import { useSyncExternalStore, useCallback } from "react";

type OnboardingState = { dismissed: boolean };

function getKey(orgId: string) {
  return `unstatus:onboarding:${orgId}`;
}

function getSnapshot(orgId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(getKey(orgId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dismissed: false };
}

function getServerSnapshot(): OnboardingState {
  return { dismissed: false };
}

export function useOnboarding({
  orgId,
  monitorCount,
  statusPageCount,
  notificationCount,
}: {
  orgId: string | undefined;
  monitorCount: number;
  statusPageCount: number;
  notificationCount: number;
}) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (e: StorageEvent) => {
        if (orgId && e.key === getKey(orgId)) callback();
      };
      window.addEventListener("storage", handler);
      window.addEventListener("onboarding-change", callback);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("onboarding-change", callback);
      };
    },
    [orgId],
  );

  const state = useSyncExternalStore(
    subscribe,
    () => (orgId ? getSnapshot(orgId) : { dismissed: false }),
    () => getServerSnapshot(),
  );

  const steps = {
    monitor: monitorCount > 0,
    statusPage: statusPageCount > 0,
    notification: notificationCount > 0,
  };

  const completedCount = [steps.monitor, steps.statusPage, steps.notification].filter(Boolean).length;

  const dismiss = useCallback(() => {
    if (!orgId) return;
    localStorage.setItem(getKey(orgId), JSON.stringify({ dismissed: true }));
    window.dispatchEvent(new Event("onboarding-change"));
  }, [orgId]);

  const showOnboarding = !state.dismissed && completedCount < 3;

  return { showOnboarding, steps, completedCount, dismiss };
}
