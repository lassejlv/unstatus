import { ORPCError } from "@orpc/server";
import z from "zod";
import { prisma } from "@/lib/prisma";
import {
  authedProcedure,
  verifyOrgRole,
  ORG_MANAGER_ROLES,
} from "@/orpc/procedures";

const applyInput = z.object({
  organizationId: z.string().min(1),
  githubRepo: z
    .string()
    .trim()
    .regex(
      /^https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/,
      "Must be a GitHub repo URL (e.g. https://github.com/owner/repo)",
    ),
  reason: z.string().trim().min(20).max(2000),
  website: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const ossRouter = {
  listEligibleOrgs: authedProcedure.handler(async ({ context }) => {
    const members = await prisma.member.findMany({
      where: {
        userId: context.session.user.id,
        role: { in: [...ORG_MANAGER_ROLES] },
      },
      select: {
        role: true,
        organization: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });

    return members.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role,
    }));
  }),

  myApplications: authedProcedure.handler(async ({ context }) => {
    const applications = await prisma.ossApplication.findMany({
      where: { userId: context.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    return applications;
  }),

  apply: authedProcedure
    .input(applyInput)
    .handler(async ({ input, context }) => {
      await verifyOrgRole(
        context.session.user.id,
        input.organizationId,
        ORG_MANAGER_ROLES,
      );

      const existing = await prisma.ossApplication.findFirst({
        where: {
          organizationId: input.organizationId,
          status: { in: ["pending", "approved"] },
        },
      });
      if (existing) {
        throw new ORPCError("CONFLICT", {
          message:
            existing.status === "approved"
              ? "This organization has already been approved for the OSS program."
              : "An application for this organization is already pending review.",
        });
      }

      return prisma.ossApplication.create({
        data: {
          organizationId: input.organizationId,
          userId: context.session.user.id,
          githubRepo: input.githubRepo,
          reason: input.reason,
          website: input.website,
        },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
      });
    }),
};
