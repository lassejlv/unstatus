import {
  buildCustomHostRequest,
  getRequestHostname,
  isBlockedCustomPath,
  isFirstPartyHost,
} from "./proxy";

type Env = {
  APP_ORIGIN: string;
  FIRST_PARTY_HOSTS?: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const hostname = getRequestHostname(request);
    const pathname = new URL(request.url).pathname;

    if (isFirstPartyHost(hostname, env)) {
      return fetch(request);
    }

    if (isBlockedCustomPath(pathname)) {
      return new Response("Not found", { status: 404 });
    }

    return fetch(buildCustomHostRequest(request, env));
  },
};
