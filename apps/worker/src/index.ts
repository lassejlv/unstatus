import { Hono } from "hono";
import { runChecks, runSingleCheck } from "./runner.js";
import { runExternalServiceChecks } from "./external-service-runner.js";
import { getSchedulerHealth, startSchedulers } from "./scheduler.js";
import { auditLog } from "@unstatus/observability";

const app = new Hono();

app.get("/health", (c) => c.json(getSchedulerHealth()));

app.post("/run", async (c) => {
  const secret = c.req.header("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await runChecks();
  auditLog({
    service: "worker",
    action: "worker.run_checks",
    result: "success",
    resourceType: "worker",
    message: "Worker monitor checks run",
    metadata: {
      total: result.total,
      failed: result.failed,
      region: process.env.REGION ?? "eu",
    },
  });
  return c.json(result);
});

app.post("/run-external", async (c) => {
  const secret = c.req.header("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await runExternalServiceChecks();
  auditLog({
    service: "worker",
    action: "worker.run_external_services",
    result: "success",
    resourceType: "worker",
    message: "External service checks run",
    metadata: {
      checked: result.checked,
      region: process.env.REGION ?? "eu",
    },
  });
  return c.json(result);
});

app.post("/run/:monitorId", async (c) => {
  const secret = c.req.header("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  try {
    const result = await runSingleCheck(c.req.param("monitorId"));
    auditLog({
      service: "worker",
      action: "worker.run_single_check",
      result: "success",
      resourceType: "monitor",
      resourceId: c.req.param("monitorId"),
      message: "Single monitor check run",
      metadata: { region: process.env.REGION ?? "eu" },
    });
    return c.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Manual check failed for ${c.req.param("monitorId")}:`, e);
    auditLog({
      service: "worker",
      action: "worker.run_single_check",
      result: "failure",
      resourceType: "monitor",
      resourceId: c.req.param("monitorId"),
      message,
      metadata: { region: process.env.REGION ?? "eu" },
    });
    return c.json({ error: message }, 500);
  }
});

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch,
};

startSchedulers();
