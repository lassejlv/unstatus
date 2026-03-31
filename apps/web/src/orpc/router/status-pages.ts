import z from "zod";
import { ORPCError } from "@orpc/server";
import { Prisma } from "@unstatus/db";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { authedProcedure, orgProcedure, verifyOrgMembership } from "@/orpc/procedures";

const domainSchema = z
  .string()
  .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase())
  .refine((v) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(v), {
    message: "Invalid domain format",
  })
  .refine(
    (v) => {
      if (env.APP_DOMAIN === "localhost") return true;
      // Only block the exact app domain, not subdomains
      return v !== env.APP_DOMAIN;
    },
    { message: "Cannot use the application's own domain" },
  );

const createInput = z.object({
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  customDomain: domainSchema.nullable().optional(),
  isPublic: z.boolean().default(true),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  brandColor: z.string().default("#000000"),
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  showResponseTimes: z.boolean().default(true),
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
    try {
      return await prisma.statusPage.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ORPCError("CONFLICT", { message: "This custom domain is already in use" });
      }
      throw err;
    }
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
