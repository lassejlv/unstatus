import { APIError, betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { organization } from "better-auth/plugins";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { env } from "./env";
import { email } from "./email";
import { InvitationEmail } from "@unstatus/email";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_MODE === "production" ? "production" : "sandbox",
});

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
            select: { role: true },
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
        },
      },
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: env.POLAR_PRO_ID,
              slug: "pro",
            },
          ],
          successUrl: "/dashboard?tab=overview",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onSubscriptionActive: async (payload) => {
            const sub = payload.data;
            let orgId = (sub.metadata as any)?.referenceId as string | undefined;

            if (!orgId && sub.customerId) {
              try {
                const customer = await polarClient.customers.get({ id: sub.customerId });
                const userId = customer.externalId;
                if (userId) {
                  const member = await prisma.member.findFirst({
                    where: { userId, role: "owner", organization: { subscriptionActive: false } },
                    select: { organizationId: true },
                  });
                  orgId = member?.organizationId;
                }
              } catch (e) {
                console.error("[Polar] Failed to resolve org from customer:", e);
              }
            }

            if (!orgId) return;
            await prisma.organization.update({
              where: { id: orgId },
              data: {
                subscriptionId: sub.id,
                subscriptionActive: true,
                subscriptionPlanName: (sub as any).product?.name ?? "Pro",
                cancelAtPeriodEnd: false,
                polarCustomerId: sub.customerId,
              },
            }).catch((e) => console.error("[Polar] Failed to activate subscription:", e));
          },
          onSubscriptionUpdated: async (payload) => {
            const sub = payload.data;
            let orgId = (sub.metadata as any)?.referenceId as string | undefined;

            if (!orgId) {
              const org = await prisma.organization.findFirst({
                where: { subscriptionId: sub.id },
              });
              orgId = org?.id;
            }

            if (!orgId) return;
            await prisma.organization.update({
              where: { id: orgId },
              data: {
                cancelAtPeriodEnd: (sub as any).cancelAtPeriodEnd ?? false,
              },
            }).catch((e) => console.error("[Polar] Failed to update subscription:", e));
          },
          onSubscriptionCanceled: async (payload) => {
            const sub = payload.data;
            const org = await prisma.organization.findFirst({
              where: { subscriptionId: sub.id },
            });
            if (!org) return;
            await prisma.organization.update({
              where: { id: org.id },
              data: { cancelAtPeriodEnd: true },
            }).catch((e) => console.error("[Polar] Failed to mark cancellation:", e));
          },
          onSubscriptionRevoked: async (payload) => {
            const sub = payload.data;
            const org = await prisma.organization.findFirst({
              where: { subscriptionId: sub.id },
            });
            if (!org) return;
            await prisma.organization.update({
              where: { id: org.id },
              data: {
                subscriptionActive: false,
                cancelAtPeriodEnd: false,
              },
            }).catch((e) => console.error("[Polar] Failed to revoke subscription:", e));
          },
        }),
      ],
    }),
  ],
});
