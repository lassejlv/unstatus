import { Hono } from "hono";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "../middleware/auth";
import { success } from "../helpers";

const app = new Hono();

app.get("/", async (c) => {
  const { organizationId, tier } = getApiContext(c);

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      createdAt: true,
      subscriptionActive: true,
      subscriptionPlanName: true,
      cancelAtPeriodEnd: true,
    },
  });

  return success(c, {
    ...org,
    plan: tier,
  });
});

export { app as organizationRoutes };
