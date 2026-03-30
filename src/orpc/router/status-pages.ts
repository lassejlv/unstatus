import { ORPCError } from "@orpc/server";
import z from "zod";

import {
  createCustomHostname,
  deleteCustomHostname,
  getCustomHostnameStatus,
} from "@/lib/cloudflare/custom-hostnames";
import { env } from "@/lib/env";
import { assertValidCustomHostname } from "@/lib/hostnames";
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

function getUserId(session: { user: { id: string } }) {
  return session.user.id;
}

async function requireOrganizationAccess(userId: string, organizationId: string) {
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      members: {
        some: { userId },
      },
    },
    select: { id: true },
  });

  if (!organization) {
    throw new ORPCError("NOT_FOUND", {
      message: "Organization not found.",
    });
  }

  return organization;
}

async function requireStatusPageAccess(userId: string, pageId: string) {
  const page = await prisma.statusPage.findFirst({
    where: {
      id: pageId,
      organization: {
        members: {
          some: { userId },
        },
      },
    },
  });

  if (!page) {
    throw new ORPCError("NOT_FOUND", {
      message: "Status page not found.",
    });
  }

  return page;
}

function cloudflareConfigured() {
  return Boolean(
    env.CLOUDFLARE_API_TOKEN &&
      env.CLOUDFLARE_ZONE_ID &&
      env.CLOUDFLARE_SAAS_TARGET,
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getCustomDomainSummary(hostname: string | null) {
  const providerConfigured = cloudflareConfigured();

  try {
    return {
      providerConfigured,
      cnameTarget: env.CLOUDFLARE_SAAS_TARGET ?? null,
      hostname,
      cloudflare:
        providerConfigured && hostname
          ? await getCustomHostnameStatus(hostname)
          : null,
    };
  } catch (error) {
    throw new ORPCError("BAD_GATEWAY", {
      message: getErrorMessage(error, "Failed to fetch Cloudflare domain status."),
    });
  }
}

export const statusPagesRouter = {
  list: authedProcedure.input(z.object({ organizationId: z.string() })).handler(
    async ({ input, context }) => {
      await requireOrganizationAccess(
        getUserId(context.session),
        input.organizationId,
      );

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
      await requireStatusPageAccess(getUserId(context.session), input.id);

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

  create: authedProcedure.input(createInput).handler(async ({ input, context }) => {
    await requireOrganizationAccess(
      getUserId(context.session),
      input.organizationId,
    );

    return prisma.statusPage.create({ data: input });
  }),

  update: authedProcedure.input(updateInput).handler(async ({ input, context }) => {
    await requireStatusPageAccess(getUserId(context.session), input.id);

    const { id, organizationId: _organizationId, ...data } = input;

    return prisma.statusPage.update({
      where: { id },
      data,
    });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).handler(
    async ({ input, context }) => {
      const page = await requireStatusPageAccess(getUserId(context.session), input.id);

      if (page.customDomain && cloudflareConfigured()) {
        try {
          await deleteCustomHostname(page.customDomain);
        } catch (error) {
          throw new ORPCError("BAD_GATEWAY", {
            message: getErrorMessage(error, "Failed to remove Cloudflare custom hostname."),
          });
        }
      }

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
      const userId = getUserId(context.session);
      const page = await requireStatusPageAccess(userId, input.statusPageId);

      const monitor = await prisma.monitor.findFirst({
        where: {
          id: input.monitorId,
          organizationId: page.organizationId,
          organization: {
            members: {
              some: { userId },
            },
          },
        },
        select: { id: true },
      });

      if (!monitor) {
        throw new ORPCError("NOT_FOUND", {
          message: "Monitor not found.",
        });
      }

      return prisma.statusPageMonitor.create({ data: input });
    }),

  removeMonitor: authedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const monitor = await prisma.statusPageMonitor.findFirst({
        where: {
          id: input.id,
          statusPage: {
            organization: {
              members: {
                some: { userId: getUserId(context.session) },
              },
            },
          },
        },
        select: { id: true },
      });

      if (!monitor) {
        throw new ORPCError("NOT_FOUND", {
          message: "Monitor not found.",
        });
      }

      await prisma.statusPageMonitor.delete({ where: { id: input.id } });
    }),

  getCustomDomainStatus: authedProcedure
    .input(z.object({ pageId: z.string() }))
    .handler(async ({ input, context }) => {
      const page = await requireStatusPageAccess(
        getUserId(context.session),
        input.pageId,
      );

      return getCustomDomainSummary(page.customDomain);
    }),

  connectCustomDomain: authedProcedure
    .input(
      z.object({
        pageId: z.string(),
        hostname: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!cloudflareConfigured()) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Cloudflare custom domains are not configured.",
        });
      }

      const page = await requireStatusPageAccess(
        getUserId(context.session),
        input.pageId,
      );

      if (!page.isPublic) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Custom domains are only available for public status pages.",
        });
      }

      let hostname: string;

      try {
        hostname = assertValidCustomHostname(input.hostname);
      } catch (error) {
        throw new ORPCError("BAD_REQUEST", {
          message: getErrorMessage(error, "Invalid hostname."),
        });
      }

      const conflictingPage = await prisma.statusPage.findFirst({
        where: {
          customDomain: hostname,
          NOT: { id: page.id },
        },
        select: { id: true },
      });

      if (conflictingPage) {
        throw new ORPCError("CONFLICT", {
          message: "That custom domain is already connected to another status page.",
        });
      }

      if (page.customDomain && page.customDomain !== hostname) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Remove the current custom domain before connecting a new one.",
        });
      }

      let cloudflare;

      try {
        cloudflare = await createCustomHostname(hostname);
      } catch (error) {
        throw new ORPCError("BAD_GATEWAY", {
          message: getErrorMessage(error, "Failed to create Cloudflare custom hostname."),
        });
      }

      if (page.customDomain !== hostname) {
        await prisma.statusPage.update({
          where: { id: page.id },
          data: { customDomain: hostname },
        });
      }

      return {
        providerConfigured: true,
        cnameTarget: env.CLOUDFLARE_SAAS_TARGET ?? null,
        hostname,
        cloudflare,
      };
    }),

  removeCustomDomain: authedProcedure
    .input(z.object({ pageId: z.string() }))
    .handler(async ({ input, context }) => {
      const page = await requireStatusPageAccess(
        getUserId(context.session),
        input.pageId,
      );

      if (page.customDomain && cloudflareConfigured()) {
        try {
          await deleteCustomHostname(page.customDomain);
        } catch (error) {
          throw new ORPCError("BAD_GATEWAY", {
            message: getErrorMessage(error, "Failed to remove Cloudflare custom hostname."),
          });
        }
      }

      await prisma.statusPage.update({
        where: { id: page.id },
        data: { customDomain: null },
      });

      return {
        providerConfigured: cloudflareConfigured(),
        cnameTarget: env.CLOUDFLARE_SAAS_TARGET ?? null,
        hostname: null,
        cloudflare: null,
      };
    }),
};
