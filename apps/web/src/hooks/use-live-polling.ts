import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UseLivePollingOptions {
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Query keys to invalidate on each poll */
  queryKeys?: unknown[][];
  /** Callback when data is refreshed */
  onRefresh?: () => void;
  /** Pause polling when tab is not visible (default: true) */
  pauseOnHidden?: boolean;
}

interface UseLivePollingReturn {
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Timestamp of last successful refresh */
  lastRefreshed: Date | null;
  /** Seconds since last refresh */
  secondsSinceRefresh: number;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Whether polling is currently active */
  isPolling: boolean;
}

/**
 * Hook for polling data at regular intervals with visibility awareness.
 * Automatically pauses when the tab is not visible.
 */
export function useLivePolling({
  interval = 30000,
  enabled = true,
  queryKeys = [],
  onRefresh,
  pauseOnHidden = true,
}: UseLivePollingOptions = {}): UseLivePollingReturn {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Invalidate all specified query keys
      await Promise.all(
        queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );
      setLastRefreshed(new Date());
      setSecondsSinceRefresh(0);
      onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryKeys, queryClient, onRefresh]);

  // Track tab visibility
  useEffect(() => {
    if (!pauseOnHidden) return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseOnHidden]);

  // Main polling interval
  useEffect(() => {
    if (!enabled || (pauseOnHidden && !isVisible)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial refresh on mount
    if (!lastRefreshed && queryKeys.length > 0) {
      setLastRefreshed(new Date());
    }

    intervalRef.current = setInterval(() => {
      refresh();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, isVisible, pauseOnHidden, refresh, lastRefreshed, queryKeys.length]);

  // Counter for seconds since last refresh
  useEffect(() => {
    counterRef.current = setInterval(() => {
      if (lastRefreshed) {
        const seconds = Math.floor(
          (Date.now() - lastRefreshed.getTime()) / 1000
        );
        setSecondsSinceRefresh(seconds);
      }
    }, 1000);

    return () => {
      if (counterRef.current) {
        clearInterval(counterRef.current);
        counterRef.current = null;
      }
    };
  }, [lastRefreshed]);

  const isPolling = enabled && (!pauseOnHidden || isVisible);

  return {
    isRefreshing,
    lastRefreshed,
    secondsSinceRefresh,
    refresh,
    isPolling,
  };
}

/**
 * Format seconds into a human-readable relative time string.
 */
export function formatRelativeTime(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
