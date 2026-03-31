import { useState, useEffect } from "react";

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN ?? "localhost";

function getCustomDomain(): string | null {
  if (typeof window === "undefined") return null;
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
 */
export function useCustomDomain(): string | null | undefined {
  const [domain, setDomain] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setDomain(getCustomDomain());
  }, []);

  return domain;
}
