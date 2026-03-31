import { useSyncExternalStore } from "react";

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN as string | undefined;

function getCustomDomain(): string | null {
  if (!APP_DOMAIN) return null;
  const hostname = window.location.hostname;
  if (
    hostname === APP_DOMAIN ||
    hostname === `www.${APP_DOMAIN}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return null;
  }
  return hostname;
}

const subscribe = () => () => {};

// When APP_DOMAIN isn't set, custom domains are disabled — always null.
// When set, server can't know the hostname, so return undefined during SSR.
const serverSnapshot = APP_DOMAIN ? undefined : null;

/**
 * Returns the custom domain hostname, null if on the app's own domain,
 * or undefined during SSR (when custom domains are enabled).
 *
 * Callers should render nothing when undefined to avoid flashing
 * the homepage on custom domains.
 */
export function useCustomDomain(): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    getCustomDomain,
    () => serverSnapshot,
  );
}
