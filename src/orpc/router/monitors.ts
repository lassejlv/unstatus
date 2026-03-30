import { authedProcedure } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import z from "zod";

const REGIONS = ["eu", "us", "asia"] as const;

const createInput = z.object({
  organizationId: z.string(),
  name: z.string(),
  type: z.enum(["http", "tcp"]),
  interval: z.number().int().min(10).default(60),
  timeout: z.number().int().min(1).default(10),
  url: z.string().optional(),
  method: z.string().default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().optional(),
  rules: z
    .array(z.object({ type: z.string(), operator: z.string(), value: z.string() }))
    .optional(),
  regions: z.array(z.enum(REGIONS)).default(["eu"]),
  autoIncidents: z.boolean().default(false),
});

const updateInput = createInput.partial().extend({ id: z.string() });

export const monitorsRouter = {
  list: authedProcedure.input(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      return prisma.monitor.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input }) => {
      return prisma.monitor.findUniqueOrThrow({ where: { id: input.id } });
    },
  ),

  create: authedProcedure.input(createInput).handler(async ({ input }) => {
    return prisma.monitor.create({ data: input });
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input }) => {
    const { id, ...data } = input;
    return prisma.monitor.update({ where: { id }, data });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input }) => {
      await prisma.monitor.delete({ where: { id: input.id } });
    },
  ),

  checks: authedProcedure
    .input(z.object({ monitorId: z.string(), limit: z.number().int().default(100) }))
    .handler(async ({ input }) => {
      return prisma.monitorCheck.findMany({
        where: { monitorId: input.monitorId },
        orderBy: { checkedAt: "desc" },
        take: input.limit,
      });
    }),

  runCheck: authedProcedure
    .input(z.object({ monitorId: z.string() }))
    .handler(async ({ input }) => {
      const workerUrl = env.WORKER_EU_URL ?? env.WORKER_URL;
      if (!workerUrl || !env.WORKER_SECRET) {
        throw new Error("Worker not configured");
      }
      const res = await fetch(`${workerUrl}/run/${input.monitorId}`, {
        method: "POST",
        headers: { "x-worker-secret": env.WORKER_SECRET },
      });
      if (!res.ok) throw new Error("Worker check failed");
      return res.json();
    }),
};
