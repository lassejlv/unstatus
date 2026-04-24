import z from "zod";
import { ORPCError } from "@orpc/server";
import { Prisma } from "@unstatus/db";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import {
  authedProcedure,
  orgAdminProcedure,
  orgProcedure,
  ORG_MANAGER_ROLES,
  verifyOrgMembership,
  verifyOrgRole,
  getOrgSubscription,
  requireFeature,
  requireLimit,
} from "@/orpc/procedures";

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
  customCss: z.string().optional(),
  customJs: z.string().optional(),
  showResponseTimes: z.boolean().default(true),
  showDependencies: z.boolean().default(false),
});

const updateInput = createInput.partial().extend({ id: z.string() });

export const statusPagesRouter = {
  list: orgProcedure(z.object({ organizationId: z.string() })).handler(
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

  create: orgAdminProcedure(createInput).handler(async ({ input, context }) => {
    const { tier } = await getOrgSubscription(input.organizationId);
    const count = await prisma.statusPage.count({ where: { organizationId: input.organizationId } });
    requireLimit(tier, "statusPages", count);
    if (input.customDomain) requireFeature(tier, "customDomain", "Custom domains");
    if (input.customCss) requireFeature(tier, "customCss", "Custom CSS");
    if (input.customJs) requireFeature(tier, "customJs", "Custom JavaScript");
    if (input.showDependencies) requireFeature(tier, "dependencies", "Dependency chain");
    const statusPage = await prisma.statusPage.create({ data: input });
    logAudit({
      context,
      action: "status_page.create",
      result: "success",
      organizationId: input.organizationId,
      resourceType: "status_page",
      resourceId: statusPage.id,
      message: "Status page created",
      metadata: { isPublic: statusPage.isPublic },
    });
    return statusPage;
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input, context }) => {
    const { id, organizationId: _orgId, ...data } = input;
    const statusPage = await prisma.statusPage.findUniqueOrThrow({ where: { id } });
    await verifyOrgRole(context.session.user.id, statusPage.organizationId, ORG_MANAGER_ROLES);

    const orgId = statusPage.organizationId;
    const { tier } = await getOrgSubscription(orgId);
    if (data.customDomain) requireFeature(tier, "customDomain", "Custom domains");
    if (data.customCss) requireFeature(tier, "customCss", "Custom CSS");
    if (data.customJs) requireFeature(tier, "customJs", "Custom JavaScript");
    if (data.showDependencies) requireFeature(tier, "dependencies", "Dependency chain");

    try {
      const updated = await prisma.statusPage.update({ where: { id }, data });
      logAudit({
        context,
        action: "status_page.update",
        result: "success",
        organizationId: orgId,
        resourceType: "status_page",
        resourceId: id,
        message: "Status page updated",
        metadata: { isPublic: updated.isPublic },
      });
      return updated;
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
      await verifyOrgRole(context.session.user.id, statusPage.organizationId, ORG_MANAGER_ROLES);
      await prisma.statusPage.delete({ where: { id: input.id } });
      logAudit({
        context,
        action: "status_page.delete",
        result: "success",
        organizationId: statusPage.organizationId,
        resourceType: "status_page",
        resourceId: input.id,
        message: "Status page deleted",
      });
    },
  ),

  addMonitor: authedProcedure
    .input(
      z.object({
        statusPageId: z.string(),
        monitorId: z.string(),
        displayName: z.string().optional(),
        sortOrder: z.number().int().default(0),
        groupName: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const statusPage = await prisma.statusPage.findUniqueOrThrow({ where: { id: input.statusPageId } });
      await verifyOrgRole(context.session.user.id, statusPage.organizationId, ORG_MANAGER_ROLES);
      const monitor = await prisma.monitor.findUniqueOrThrow({ where: { id: input.monitorId } });
      if (monitor.organizationId !== statusPage.organizationId) {
        throw new ORPCError("FORBIDDEN", { message: "Monitor does not belong to this organization" });
      }
      const statusPageMonitor = await prisma.statusPageMonitor.create({ data: input });
      logAudit({
        context,
        action: "status_page.add_monitor",
        result: "success",
        organizationId: statusPage.organizationId,
        resourceType: "status_page",
        resourceId: input.statusPageId,
        message: "Monitor added to status page",
        metadata: { monitorId: input.monitorId },
      });
      return statusPageMonitor;
    }),

  updateMonitors: authedProcedure
    .input(
      z.object({
        statusPageId: z.string(),
        monitors: z.array(z.object({
          id: z.string(),
          sortOrder: z.number().int(),
          groupName: z.string().nullable(),
        })),
      }),
    )
    .handler(async ({ input, context }) => {
      const statusPage = await prisma.statusPage.findUniqueOrThrow({ where: { id: input.statusPageId } });
      await verifyOrgRole(context.session.user.id, statusPage.organizationId, ORG_MANAGER_ROLES);

      // Verify ALL monitor IDs belong to this status page to prevent IDOR
      const inputIds = input.monitors.map((m) => m.id);
      if (inputIds.length > 0) {
        const validCount = await prisma.statusPageMonitor.count({
          where: {
            id: { in: inputIds },
            statusPageId: input.statusPageId,
          },
        });
        if (validCount !== inputIds.length) {
          throw new ORPCError("FORBIDDEN", {
            message: "One or more monitor IDs do not belong to this status page",
          });
        }
      }

      await Promise.all(
        input.monitors.map((m) =>
          prisma.statusPageMonitor.update({
            where: { id: m.id },
            data: { sortOrder: m.sortOrder, groupName: m.groupName },
          }),
        ),
      );
      logAudit({
        context,
        action: "status_page.update_monitors",
        result: "success",
        organizationId: statusPage.organizationId,
        resourceType: "status_page",
        resourceId: input.statusPageId,
        message: "Status page monitors updated",
        metadata: { monitorCount: input.monitors.length },
      });
      return { success: true };
    }),

  removeMonitor: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const spm = await prisma.statusPageMonitor.findUniqueOrThrow({
        where: { id: input.id },
        include: { statusPage: { select: { organizationId: true } } },
      });
      await verifyOrgRole(context.session.user.id, spm.statusPage.organizationId, ORG_MANAGER_ROLES);
      await prisma.statusPageMonitor.delete({ where: { id: input.id } });
      logAudit({
        context,
        action: "status_page.remove_monitor",
        result: "success",
        organizationId: spm.statusPage.organizationId,
        resourceType: "status_page_monitor",
        resourceId: input.id,
        message: "Monitor removed from status page",
      });
    }),
};
