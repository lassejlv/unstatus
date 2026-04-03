import { APIError, betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { organization } from "better-auth/plugins";
import { env } from "./env";
import { email } from "./email";
import { autumn } from "./autumn";
import { InvitationEmail } from "@unstatus/email";

function isPersonalOrganizationSlug(slug: string, userId: string) {
  return slug.endsWith(`-personal-${userId.slice(0, 8)}`);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const slug = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-");
          await prisma.organization.create({
            data: {
              id: crypto.randomUUID(),
              name: "Personal",
              slug: `${slug}-personal-${user.id.slice(0, 8)}`,
              createdAt: new Date(),
              members: {
                create: {
                  id: crypto.randomUUID(),
                  userId: user.id,
                  role: "owner",
                  createdAt: new Date(),
                },
              },
            },
          });
        },
      },
      delete: {
        before: async (user) => {
          // Clean up all organizations this user owns
          const ownedMembers = await prisma.member.findMany({
            where: { userId: user.id, role: "owner" },
            select: { organizationId: true },
          });

          for (const m of ownedMembers) {
            // Cancel subscription in Autumn/Stripe
            try {
              await autumn.customers.delete({
                customerId: m.organizationId,
                deleteInStripe: true,
              });
            } catch {}

            // Delete the org (cascades to monitors, status pages, incidents, etc.)
            await prisma.organization.delete({
              where: { id: m.organizationId },
            }).catch(() => {});
          }
        },
      },
    },
  },
  plugins: [
    tanstackStartCookies(),
    organization({
      organizationLimit: 3,
      sendInvitationEmail: async (data) => {
        const domain = env.APP_DOMAIN === "localhost" ? "http://localhost:3000" : `https://${env.APP_DOMAIN}`;
        const invitationUrl = `${domain}/accept-invitation/${data.id}`;

        await email.emails.send({
          from: env.INBOUND_FROM,
          to: data.email,
          subject: `You're invited to join ${data.organization.name} on Unstatus`,
          react: (
            <InvitationEmail
              organizationName={data.organization.name}
              inviterName={data.inviter.user.name}
              role={data.role}
              invitationUrl={invitationUrl}
            />
          ),
        });
      },
      organizationHooks: {
        beforeDeleteOrganization: async ({ organization, user }) => {
          const member = await prisma.member.findFirst({
            where: {
              organizationId: organization.id,
              userId: user.id,
            },
            select: {
              role: true,
            },
          });

          if (member?.role !== "owner") {
            throw new APIError("FORBIDDEN", {
              message: "Only organization owners can delete an organization.",
            });
          }

          if (
            organization.name === "Personal"
            && isPersonalOrganizationSlug(organization.slug, user.id)
          ) {
            throw new APIError("FORBIDDEN", {
              message: "Your personal organization cannot be deleted.",
            });
          }

          // Cancel subscription and delete customer in Autumn/Stripe
          try {
            await autumn.customers.delete({
              customerId: organization.id,
              deleteInStripe: true,
            });
          } catch (e) {
            // Ignore if customer doesn't exist in Autumn
            console.error("[Autumn] Failed to delete customer on org deletion:", e);
          }
        },
      },
    }),
  ],
});
