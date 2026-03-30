import { Hono } from "hono";
import { runChecks } from "./runner.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

// Trigger a check run (called by cron or external scheduler)
app.post("/run", async (c) => {
  const secret = c.req.header("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await runChecks();
  return c.json(result);
});

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch,
};
