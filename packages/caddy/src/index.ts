import { Hono } from "hono";
import { createPrismaClient } from "@unstatus/db";

const prisma = createPrismaClient(process.env.DATABASE_URL!);
const ASK_SECRET = process.env.ASK_SECRET;

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/ask", async (c) => {
  if (ASK_SECRET && c.req.header("x-ask-secret") !== ASK_SECRET) {
    return c.json({ error: "forbidden" }, 403);
  }

  const domain = c.req.query("domain");
  if (!domain) {
    return c.json({ error: "missing domain parameter" }, 400);
  }

  const page = await prisma.statusPage.findUnique({
    where: { customDomain: domain },
    select: { id: true },
  });

  if (page) {
    return c.json({ ok: true }, 200);
  }

  return c.json({ error: "domain not found" }, 404);
});

export default {
  port: Number(process.env.API_PORT ?? 3456),
  fetch: app.fetch,
};
