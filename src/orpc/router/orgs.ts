import { authedProcedure } from "@/orpc/procedures";
import { prisma } from "@/lib/prisma";

export const orgsRouter = {
  list: authedProcedure.handler(async ({ context }) => {
    const members = await prisma.member.findMany({
      where: { userId: context.session.user.id },
      include: { organization: true },
    });
    return members.map((m) => m.organization);
  }),
};
