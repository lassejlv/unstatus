import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { organization } from "better-auth/plugins";
import { env } from "./env";
import { email } from "./email";
import { InvitationEmail } from "@unstatus/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
    },
  },
  plugins: [
    tanstackStartCookies(),
    organization({
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
    }),
  ],
});
