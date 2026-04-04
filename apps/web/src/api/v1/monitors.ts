import { Hono } from "hono";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getApiContext, requirePro } from "../middleware/auth";
import { ApiError, success, paginated, parsePagination } from "../helpers";

const app = new Hono();

// GET /monitors - List monitors
app.get("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const { limit, offset } = parsePagination(c);

  const [items, total] = await Promise.all([
    prisma.monitor.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.monitor.count({ where: { organizationId } }),
  ]);

  return paginated(c, items, total, limit, offset);
});

// GET /monitors/:id - Get monitor
app.get("/:id", async (c) => {
  const { organizationId } = getApiContext(c);
  const id = c.req.param("id");

  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  return success(c, monitor);
});

// POST /monitors - Create monitor (Pro)
app.post("/", async (c) => {
  const { organizationId } = getApiContext(c);
  requirePro(c);

  const body = await c.req.json();
  const { name, type, interval, timeout, url, method, headers, body: reqBody, host, port, rules, regions, autoIncidents } = body;

  if (!name || !type) {
    throw new ApiError("BAD_REQUEST", "name and type are required", 400);
  }

  const count = await prisma.monitor.count({ where: { organizationId } });
  if (count >= 50) {
    throw new ApiError("FORBIDDEN", "Maximum of 50 monitors reached", 403);
  }

  const monitor = await prisma.monitor.create({
    data: {
      organizationId,
      name,
      type,
      interval: interval ?? 60,
      timeout: timeout ?? 10,
      url: url ?? null,
      method: method ?? "GET",
      headers: headers ?? undefined,
      body: reqBody ?? null,
      host: host ?? null,
      port: port ?? null,
      rules: rules ?? undefined,
      regions: regions ?? ["eu"],
      autoIncidents: autoIncidents ?? false,
    },
  });

  return success(c, monitor, 201);
});

// PATCH /monitors/:id - Update monitor (Pro)
app.patch("/:id", async (c) => {
  const { organizationId } = getApiContext(c);
  requirePro(c);

  const id = c.req.param("id");
  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  const body = await c.req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.interval !== undefined) data.interval = body.interval;
  if (body.timeout !== undefined) data.timeout = body.timeout;
  if (body.url !== undefined) data.url = body.url;
  if (body.method !== undefined) data.method = body.method;
  if (body.headers !== undefined) data.headers = body.headers;
  if (body.body !== undefined) data.body = body.body;
  if (body.host !== undefined) data.host = body.host;
  if (body.port !== undefined) data.port = body.port;
  if (body.rules !== undefined) data.rules = body.rules;
  if (body.regions !== undefined) data.regions = body.regions;
  if (body.autoIncidents !== undefined) data.autoIncidents = body.autoIncidents;
  if (body.active !== undefined) data.active = body.active;

  const updated = await prisma.monitor.update({ where: { id }, data });
  return success(c, updated);
});

// DELETE /monitors/:id - Delete monitor (Pro)
app.delete("/:id", async (c) => {
  const { organizationId } = getApiContext(c);
  requirePro(c);

  const id = c.req.param("id");
  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  await prisma.monitor.delete({ where: { id } });
  return success(c, { deleted: true });
});

// GET /monitors/:id/checks - List checks
app.get("/:id/checks", async (c) => {
  const { organizationId } = getApiContext(c);
  const id = c.req.param("id");
  const { limit, offset } = parsePagination(c);

  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  const take = Math.min(limit, 200);
  const [items, total] = await Promise.all([
    prisma.monitorCheck.findMany({
      where: { monitorId: id },
      orderBy: { checkedAt: "desc" },
      take,
      skip: offset,
    }),
    prisma.monitorCheck.count({ where: { monitorId: id } }),
  ]);

  return paginated(c, items, total, take, offset);
});

// POST /monitors/:id/run - Trigger manual check (Pro)
app.post("/:id/run", async (c) => {
  const { organizationId } = getApiContext(c);
  requirePro(c);

  const id = c.req.param("id");
  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  const regions = (monitor.regions as string[]) ?? ["eu"];
  const primaryRegion = regions[0] ?? "eu";
  const workerUrlMap: Record<string, string | undefined> = {
    eu: env.WORKER_EU_URL,
    us: env.WORKER_US_URL,
    asia: env.WORKER_ASIA_URL,
  };
  const workerUrl = workerUrlMap[primaryRegion] ?? env.WORKER_EU_URL ?? env.WORKER_URL;
  if (!workerUrl || !env.WORKER_SECRET) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Worker not configured", 503);
  }

  const res = await fetch(`${workerUrl}/run/${id}`, {
    method: "POST",
    headers: { "x-worker-secret": env.WORKER_SECRET },
  });

  if (!res.ok) {
    throw new ApiError("BAD_GATEWAY", "Monitor check failed. Please try again later.", 502);
  }

  const result = await res.json();
  return success(c, result);
});

export { app as monitorsRoutes };
