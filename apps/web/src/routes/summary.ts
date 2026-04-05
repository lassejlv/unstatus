import { createFileRoute } from "@tanstack/react-router";
import { resolvePublicPage, getPublicStatusPage } from "@/orpc/router/public-status";
import { buildAtlassianSummary } from "@/lib/atlassian-summary";

const APP_DOMAIN = process.env.APP_DOMAIN ?? "";

function isCustomDomain(hostname: string): boolean {
  if (!APP_DOMAIN) return false;
  return (
    hostname !== APP_DOMAIN &&
    hostname !== `www.${APP_DOMAIN}` &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1"
  );
}

async function handle({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const hostname = request.headers.get("host")?.split(":")[0] ?? url.hostname;

    if (!isCustomDomain(hostname)) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const page = await resolvePublicPage({ customDomain: hostname });
    const data = await getPublicStatusPage(page);
    const pageUrl = `https://${hostname}`;
    const summary = buildAtlassianSummary(data, pageUrl);

    return new Response(JSON.stringify(summary), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Status page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/summary")({
  server: {
    handlers: {
      GET: handle,
    },
  },
});
