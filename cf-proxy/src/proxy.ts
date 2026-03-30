export interface ProxyEnv {
  APP_ORIGIN: string;
  FIRST_PARTY_HOSTS?: string;
}

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

export function getRequestHostname(request: Request): string {
  return normalizeHostname(new URL(request.url).hostname);
}

export function parseFirstPartyHosts(value?: string): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((host) => normalizeHostname(host))
      .filter(Boolean),
  );
}

export function isFirstPartyHost(hostname: string, env: ProxyEnv): boolean {
  return parseFirstPartyHosts(env.FIRST_PARTY_HOSTS).has(
    normalizeHostname(hostname),
  );
}

export function isBlockedCustomPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/dashboard") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/")
  );
}

export function buildUpstreamUrl(request: Request, env: ProxyEnv): URL {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(env.APP_ORIGIN);
  upstreamUrl.pathname = incomingUrl.pathname;
  upstreamUrl.search = incomingUrl.search;
  upstreamUrl.hash = "";
  return upstreamUrl;
}

export function buildCustomHostRequest(
  request: Request,
  env: ProxyEnv,
): Request {
  const upstreamUrl = buildUpstreamUrl(request, env);
  const upstreamRequest = new Request(upstreamUrl, request);
  upstreamRequest.headers.set("x-unstatus-custom-host", getRequestHostname(request));
  return upstreamRequest;
}
