import { os, ORPCError } from "@orpc/server";
import { auth } from "@/lib/auth";

export const publicProcedure = os.$context<{ headers: Headers }>();

export const authedProcedure = publicProcedure.use(
  async ({ context, next }) => {
    const session = await auth.api.getSession({
      headers: context.headers,
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({ context: { session } });
  },
);
