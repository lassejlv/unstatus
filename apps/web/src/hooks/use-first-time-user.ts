import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY_PREFIX = "unstatus:welcome";

interface WelcomeState {
  welcomed: boolean;
  useCase: string | null;
  welcomedAt: string | null;
}

const defaultState: WelcomeState = {
  welcomed: false,
  useCase: null,
  welcomedAt: null,
};

function getStorageKey(userId: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? "anonymous"}`;
}

function readState(userId: string | undefined): WelcomeState {
  if (typeof window === "undefined") return defaultState;

  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return defaultState;
}

function writeState(userId: string | undefined, state: WelcomeState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
    // Dispatch event for cross-tab sync
    window.dispatchEvent(new StorageEvent("storage", {
      key: getStorageKey(userId),
      newValue: JSON.stringify(state),
    }));
  } catch {
    // Ignore write errors
  }
}

// External store for syncing across components
let listeners: Array<() => void> = [];
let cachedState: WelcomeState = defaultState;
let cachedUserId: string | undefined;

function subscribe(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot(): WelcomeState {
  return cachedState;
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

interface UseFirstTimeUserOptions {
  userId: string | undefined;
}

interface UseFirstTimeUserReturn {
  /** Whether this is a first-time user (hasn't completed welcome) */
  isFirstTime: boolean;
  /** The use case the user selected during welcome */
  useCase: string | null;
  /** Mark the welcome as completed */
  completeWelcome: (useCase?: string) => void;
  /** Reset the welcome state (for testing) */
  resetWelcome: () => void;
}

/**
 * Hook to track whether a user has completed the welcome flow.
 * Persists state to localStorage per user.
 */
export function useFirstTimeUser({
  userId,
}: UseFirstTimeUserOptions): UseFirstTimeUserReturn {
  // Initialize state from localStorage
  useEffect(() => {
    if (cachedUserId !== userId) {
      cachedUserId = userId;
      cachedState = readState(userId);
      notifyListeners();
    }
  }, [userId]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getStorageKey(userId)) {
        cachedState = readState(userId);
        notifyListeners();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [userId]);

  // Subscribe to state changes
  const state = useSyncExternalStore(subscribe, getSnapshot, () => defaultState);

  const completeWelcome = useCallback(
    (useCase?: string) => {
      const newState: WelcomeState = {
        welcomed: true,
        useCase: useCase ?? null,
        welcomedAt: new Date().toISOString(),
      };
      cachedState = newState;
      writeState(userId, newState);
      notifyListeners();
    },
    [userId]
  );

  const resetWelcome = useCallback(() => {
    cachedState = defaultState;
    writeState(userId, defaultState);
    notifyListeners();
  }, [userId]);

  return {
    isFirstTime: !state.welcomed,
    useCase: state.useCase,
    completeWelcome,
    resetWelcome,
  };
}

/**
 * Check URL params for welcome flag (set after OAuth redirect for new users)
 */
export function useWelcomeParam(): boolean {
  const [hasWelcomeParam, setHasWelcomeParam] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "true") {
      setHasWelcomeParam(true);
      // Remove the param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return hasWelcomeParam;
}
