import { Hono } from "hono";
import { runChecks, runSingleCheck } from "./runner.js";
import { runExternalServiceChecks } from "./external-service-runner.js";
import { startSchedulers } from "./scheduler.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/run", async (c) => {
  const secret = c.req.header("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await runChecks();
  return c.json(result);
});

app.post("/run-external", async (c) => {
  const secret = c.req.header("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await runExternalServiceChecks();
  return c.json(result);
});

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

startSchedulers();
