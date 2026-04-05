import { createFileRoute } from "@tanstack/react-router";
import { resolvePublicPage, getPublicStatusPage } from "@/orpc/router/public-status";
import { buildAtlassianSummary } from "@/lib/atlassian-summary";

async function handle({ params }: { params: { slug: string }; request: Request }) {
  try {
    const page = await resolvePublicPage({ slug: params.slug });
    const data = await getPublicStatusPage(page);
    const pageUrl = `https://${process.env.APP_DOMAIN ?? "localhost"}/status/${params.slug}`;
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

export const Route = createFileRoute("/status/$slug/summary")({
  server: {
    handlers: {
      GET: handle,
    },
  },
});
