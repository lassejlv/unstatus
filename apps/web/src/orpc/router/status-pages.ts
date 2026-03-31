import z from "zod";
import { ORPCError } from "@orpc/server";

import { prisma } from "@/lib/prisma";
import { authedProcedure, orgProcedure, verifyOrgMembership } from "@/orpc/procedures";

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
});

const updateInput = createInput.partial().extend({ id: z.string() });

export const statusPagesRouter = {
  list: orgProcedure.input(z.object({ organizationId: z.string() })).handler(
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
    async ({ input, context }) => {
      const statusPage = await prisma.statusPage.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          monitors: {
            include: { monitor: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      await verifyOrgMembership(context.session.user.id, statusPage.organizationId);
      return statusPage;
    },
  ),

  create: orgProcedure.input(createInput).handler(async ({ input }) => {
    return prisma.statusPage.create({ data: input });
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input, context }) => {
    const { id, organizationId: _orgId, ...data } = input;
    const statusPage = await prisma.statusPage.findUniqueOrThrow({ where: { id } });
    await verifyOrgMembership(context.session.user.id, statusPage.organizationId);
    return prisma.statusPage.update({ where: { id }, data });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const statusPage = await prisma.statusPage.findUniqueOrThrow({ where: { id: input.id } });
      await verifyOrgMembership(context.session.user.id, statusPage.organizationId);
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
    .handler(async ({ input, context }) => {
      const statusPage = await prisma.statusPage.findUniqueOrThrow({ where: { id: input.statusPageId } });
      await verifyOrgMembership(context.session.user.id, statusPage.organizationId);
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
      if (monitor.organizationId !== statusPage.organizationId) {
        throw new ORPCError("FORBIDDEN", { message: "Monitor does not belong to this organization" });
      }
      return prisma.statusPageMonitor.create({ data: input });
    }),

  removeMonitor: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const spm = await prisma.statusPageMonitor.findUniqueOrThrow({
        where: { id: input.id },
        include: { statusPage: { select: { organizationId: true } } },
      });
      await verifyOrgMembership(context.session.user.id, spm.statusPage.organizationId);
      await prisma.statusPageMonitor.delete({ where: { id: input.id } });
    }),
};
