import { Hono } from "hono";
import { resolvePublicPage, getPublicStatusPage } from "@/orpc/router/public-status";
import { buildAtlassianSummary } from "@/lib/atlassian-summary";

const APP_DOMAIN = process.env.APP_DOMAIN ?? "";

const app = new Hono();

// Slug-based: /api/status/:slug/summary.json
app.get("/api/status/:slug/summary.json", async (c) => {
  try {
    const slug = c.req.param("slug");
    const page = await resolvePublicPage({ slug });
    const data = await getPublicStatusPage(page);
    const pageUrl = `https://${APP_DOMAIN || "localhost"}/status/${slug}`;
    const summary = buildAtlassianSummary(data, pageUrl);

    c.header("Cache-Control", "public, max-age=60, s-maxage=60");
    c.header("Access-Control-Allow-Origin", "*");
    return c.json(summary);
  } catch {
    return c.json({ error: "Status page not found" }, 404);
  }
});

// Custom domain: /summary.json
app.get("/api/status/summary.json", async (c) => {
  try {
    const hostname = c.req.header("host")?.split(":")[0] ?? "";

    if (
      !APP_DOMAIN ||
      hostname === APP_DOMAIN ||
      hostname === `www.${APP_DOMAIN}` ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    ) {
      return c.json({ error: "Not found" }, 404);
    }

    const page = await resolvePublicPage({ customDomain: hostname });
    const data = await getPublicStatusPage(page);
    const pageUrl = `https://${hostname}`;
    const summary = buildAtlassianSummary(data, pageUrl);

    c.header("Cache-Control", "public, max-age=60, s-maxage=60");
    c.header("Access-Control-Allow-Origin", "*");
    return c.json(summary);
  } catch {
    return c.json({ error: "Status page not found" }, 404);
  }
});

export { app as publicSummaryApi };
