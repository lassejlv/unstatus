import z from "zod";

import { prisma } from "@/lib/prisma";
import { authedProcedure } from "@/orpc/procedures";

const createInput = z.object({
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  isPublic: z.boolean().default(true),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  brandColor: z.string().default("#000000"),
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  customCss: z.string().optional(),
});

const updateInput = createInput.partial().extend({ id: z.string() });

export const statusPagesRouter = {
  list: authedProcedure.input(z.object({ organizationId: z.string() })).handler(
    async ({ input }) => {
      return prisma.statusPage.findMany({
        where: { organizationId: input.organizationId },
        include: {
          monitors: {
            include: { monitor: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input }) => {
      return prisma.statusPage.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          monitors: {
            include: { monitor: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    },
  ),

  create: authedProcedure.input(createInput).handler(async ({ input }) => {
    return prisma.statusPage.create({ data: input });
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input }) => {
    const { id, ...data } = input;

    return prisma.statusPage.update({
      where: { id },
      data,
    });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input }) => {
      await prisma.statusPage.delete({ where: { id: input.id } });
    },
  ),

  addMonitor: authedProcedure
    .input(
      z.object({
        statusPageId: z.string(),
        monitorId: z.string(),
        displayName: z.string().optional(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .handler(async ({ input }) => {
      return prisma.statusPageMonitor.create({ data: input });
    }),

  removeMonitor: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      await prisma.statusPageMonitor.delete({ where: { id: input.id } });
    }),
};
