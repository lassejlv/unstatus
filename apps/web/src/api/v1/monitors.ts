import { Hono } from "hono";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { PLAN_LIMITS } from "@/lib/plans";
import { monitorTypeSchema, regionSchema } from "@/types";
import { getApiContext } from "../middleware/auth";
import { ApiError, success, paginated, parsePagination, parseJsonBody } from "../helpers";

const app = new Hono();
const ruleSchema = z.object({
  type: z.string().trim().min(1),
  operator: z.string().trim().min(1),
  value: z.string(),
});

function validateMonitorFields(
  value: {
    type?: z.infer<typeof monitorTypeSchema>;
    url?: string | null;
    host?: string | null;
    port?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (value.type === "http" && !value.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: "url is required for HTTP monitors",
    });
  }

  if (value.type === "tcp") {
    if (!value.host) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["host"],
        message: "host is required for TCP monitors",
      });
    }

    if (value.port == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["port"],
        message: "port is required for TCP monitors",
      });
    }
  }

  if (value.type === "ping" && !value.host && !value.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["host"],
      message: "host or url is required for ping monitors",
    });
  }

  if ((value.type === "redis" || value.type === "postgres") && !value.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: `url is required for ${value.type} monitors`,
    });
  }
}

const createMonitorBodySchema = z.object({
  name: z.string().trim().min(1),
  type: monitorTypeSchema,
  interval: z.number().int().min(10).default(60),
  timeout: z.number().int().min(1).default(10),
  url: z.string().trim().min(1).optional().nullable(),
  method: z.string().trim().min(1).default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional().nullable(),
  host: z.string().trim().min(1).optional().nullable(),
  port: z.number().int().positive().optional().nullable(),
  rules: z.array(ruleSchema).optional(),
  regions: z.array(regionSchema).nonempty().default(["eu"]),
  autoIncidents: z.boolean().default(false),
}).superRefine(validateMonitorFields);

const updateMonitorBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: monitorTypeSchema.optional(),
  interval: z.number().int().min(10).optional(),
  timeout: z.number().int().min(1).optional(),
  url: z.string().trim().min(1).nullable().optional(),
  method: z.string().trim().min(1).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().nullable().optional(),
  host: z.string().trim().min(1).nullable().optional(),
  port: z.number().int().positive().nullable().optional(),
  rules: z.array(ruleSchema).optional(),
  regions: z.array(regionSchema).nonempty().optional(),
  autoIncidents: z.boolean().optional(),
  active: z.boolean().optional(),
}).superRefine(validateMonitorFields);

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

app.get("/:id", async (c) => {
  const { organizationId } = getApiContext(c);
  const id = c.req.param("id");

  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  return success(c, monitor);
});

app.post("/", async (c) => {
  const { organizationId, tier } = getApiContext(c);
  const body = await parseJsonBody(c, createMonitorBodySchema);
  const { name, type, interval, timeout, url, method, headers, body: reqBody, host, port, rules, regions, autoIncidents } = body;

  const maxMonitors = PLAN_LIMITS[tier].monitors;
  const count = await prisma.monitor.count({ where: { organizationId } });
  if (count >= maxMonitors) {
    throw new ApiError("FORBIDDEN", `Maximum of ${maxMonitors} monitors reached on your plan`, 403);
  }
  if (type === "redis" && !PLAN_LIMITS[tier].redisMonitor) {
    throw new ApiError("FORBIDDEN", "Redis monitors require the Scale plan", 403);
  }
  if (type === "postgres" && !PLAN_LIMITS[tier].postgresMonitor) {
    throw new ApiError("FORBIDDEN", "Postgres monitors require the Scale plan", 403);
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

app.patch("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  const body = await parseJsonBody(c, updateMonitorBodySchema);
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

app.delete("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const monitor = await prisma.monitor.findUnique({ where: { id } });
  if (!monitor || monitor.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Monitor not found", 404);
  }

  await prisma.monitor.delete({ where: { id } });
  return success(c, { deleted: true });
});

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

app.post("/:id/run", async (c) => {
  const { organizationId } = getApiContext(c);

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
