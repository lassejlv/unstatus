import { authedProcedure } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";
import z from "zod";

const createInput = z.object({
  monitorId: z.string(),
  title: z.string(),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]).default("investigating"),
  severity: z.enum(["minor", "major", "critical"]).default("minor"),
  message: z.string(),
});

export const incidentsRouter = {
  list: authedProcedure.input(z.object({ monitorId: z.string() })).handler(
    async ({ input }) => {
      return prisma.incident.findMany({
        where: { monitorId: input.monitorId },
        include: { updates: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  listByOrg: authedProcedure.input(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      return prisma.incident.findMany({
        where: { monitor: { organizationId: input.organizationId } },
        include: { monitor: { select: { name: true } }, updates: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input }) => {
      return prisma.incident.findUniqueOrThrow({
        where: { id: input.id },
        include: { updates: { orderBy: { createdAt: "desc" } } },
      });
    },
  ),

  create: authedProcedure.input(createInput).handler(async ({ input }) => {
    const { message, ...data } = input;
    return prisma.incident.create({
      data: {
        ...data,
        updates: { create: { status: data.status, message } },
      },
      include: { updates: true },
    });
  }),

  update: authedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["investigating", "identified", "monitoring", "resolved"]), message: z.string() }))
    .handler(async ({ input }) => {
      const resolvedAt = input.status === "resolved" ? new Date() : undefined;
      return prisma.incident.update({
        where: { id: input.id },
        data: {
          status: input.status,
          resolvedAt,
          updates: { create: { status: input.status, message: input.message } },
        },
        include: { updates: { orderBy: { createdAt: "desc" } } },
      });
    }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input }) => {
      await prisma.incident.delete({ where: { id: input.id } });
    },
  ),
};
