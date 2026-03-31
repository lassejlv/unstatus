import { useState, useEffect } from "react";

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN as string | undefined;

function getCustomDomain(): string | null {
  if (typeof window === "undefined" || !APP_DOMAIN) return null;
  const hostname = window.location.hostname;
  if (
    hostname === APP_DOMAIN ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(`.${APP_DOMAIN}`)
  ) {
    return null;
  }
  return hostname;
}

/**
 * Returns the custom domain hostname if the current page is being served
 * on a custom domain, or null if on the app's own domain.
 *
 * Returns `undefined` during SSR / before hydration to allow callers
 * to render a loading state and avoid a hydration mismatch.
 *
 * If VITE_APP_DOMAIN is not set, custom domain detection is disabled
 * and always returns null.
 */
export function useCustomDomain(): string | null | undefined {
  const [domain, setDomain] = useState<string | null | undefined>(
    APP_DOMAIN ? undefined : null,
  );

  useEffect(() => {
    if (APP_DOMAIN) {
      setDomain(getCustomDomain());
    }
  }, []);

  return domain;
}
