import { useState, useEffect } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getInitialState(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Hook to detect if user prefers reduced motion.
 * Returns true if the user has enabled reduced motion in their OS settings.
 * Use this to disable or simplify animations for accessibility.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(getInitialState);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reducedMotion;
}

/**
 * Returns animation props only if reduced motion is not preferred.
 * Use this to conditionally apply motion props.
 */
export function useMotionSafe<T extends Record<string, unknown>>(
  motionProps: T
): T | Record<string, never> {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? {} : motionProps;
}
