import { defineHandler } from "nitro";

const APP_DOMAIN = process.env.APP_DOMAIN;

// Routes that belong to the main app and should not be served on custom domains
const APP_ROUTES = new Set([
  "/login",
  "/pricing",
  "/dashboard",
  "/status",
]);

function isCustomDomain(hostname: string): boolean {
  if (!APP_DOMAIN) return false;
  return (
    hostname !== APP_DOMAIN &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    !hostname.endsWith(`.${APP_DOMAIN}`)
  );
}

export default defineHandler((event) => {
  if (!APP_DOMAIN) return;

  const host = event.req.headers.get("host") ?? "";
  const hostname = host.split(":")[0];

  if (!isCustomDomain(hostname)) {
    return;
  }

  const path = event.path;

  // Allow: root, API routes, and static assets
  if (
    path === "/" ||
    path === "" ||
    path.startsWith("/api/") ||
    path.startsWith("/_build/") ||
    path.startsWith("/_nitro/") ||
    path.startsWith("/__") ||
    path.startsWith("/assets/")
  ) {
    return;
  }

  // Block known app routes on custom domains
  const firstSegment = "/" + path.split("/")[1];
  if (APP_ROUTES.has(firstSegment)) {
    return Response.redirect(`https://${APP_DOMAIN}${path}`, 302);
  }

  // Allow everything else (e.g., /{incidentId}) — the route component
  // will validate via the API whether it's a valid incident
});
