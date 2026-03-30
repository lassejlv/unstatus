import { Hono } from "hono";
import { runChecks, runSingleCheck } from "./runner.js";

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

// Trigger a single monitor check
app.post("/run/:monitorId", async (c) => {
  const secret = c.req.header("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await runSingleCheck(c.req.param("monitorId"));
  return c.json(result);
});

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch,
};

// Auto-run checks on an interval
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL ?? 10) * 1000;
setInterval(() => {
  runChecks().catch((e) => console.error("Auto-check failed:", e));
}, POLL_INTERVAL);
console.log(`Worker polling every ${POLL_INTERVAL / 1000}s`);
