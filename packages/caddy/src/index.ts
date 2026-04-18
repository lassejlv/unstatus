import { Hono } from "hono";
import { createPrismaClient } from "@unstatus/db";

const prisma = createPrismaClient(process.env.DATABASE_URL!);
const ASK_SECRET = process.env.ASK_SECRET;

const app = new Hono();

function normalizeDomain(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
}

app.get("/health", (c) => c.json({ status: "ok", askSecretConfigured: Boolean(ASK_SECRET) }));

app.get("/ask", async (c) => {
  const providedSecret = c.req.header("x-ask-secret") ?? c.req.query("secret");
  if (ASK_SECRET && providedSecret !== ASK_SECRET) {
    return c.json({ error: "forbidden" }, 403);
  }

  const domain = c.req.query("domain");
  if (!domain) {
    return c.json({ error: "missing domain parameter" }, 400);
  }

  const normalizedDomain = normalizeDomain(domain);

  const page = await prisma.statusPage.findFirst({
    where: { customDomain: normalizedDomain },
    select: { id: true },
  });

  if (page) {
    return c.json({ ok: true, domain: normalizedDomain }, 200);
  }

  return c.json({ error: "domain not found", domain: normalizedDomain }, 404);
});

export default {
  port: Number(process.env.API_PORT ?? 3456),
  fetch: app.fetch,
};
