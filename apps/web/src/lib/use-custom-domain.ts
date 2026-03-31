const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN as string | undefined;

/**
 * Returns the custom domain hostname if the current page is being served
 * on a custom domain, or null if on the app's own domain.
 *
 * If VITE_APP_DOMAIN is not set, custom domain detection is disabled
 * and always returns null.
 */
export function useCustomDomain(): string | null {
  if (!APP_DOMAIN || typeof window === "undefined") return null;
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
