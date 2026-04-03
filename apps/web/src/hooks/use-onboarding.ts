import { useCallback, useRef, useSyncExternalStore } from "react";

type OnboardingState = { dismissed: boolean };

const DEFAULT_STATE: OnboardingState = { dismissed: false };

function getKey(orgId: string) {
  return `unstatus:onboarding:${orgId}`;
}

function readState(orgId: string | undefined): OnboardingState {
  if (!orgId) return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(getKey(orgId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.dismissed === "boolean") return parsed;
    }
  } catch {}
  return DEFAULT_STATE;
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
  const cachedState = useRef<OnboardingState>(DEFAULT_STATE);

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

  const getSnapshot = useCallback(() => {
    const next = readState(orgId);
    // Return the same reference if nothing changed to avoid re-renders
    if (next.dismissed === cachedState.current.dismissed) {
      return cachedState.current;
    }
    cachedState.current = next;
    return next;
  }, [orgId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);

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
