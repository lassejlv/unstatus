import { createFileRoute } from "@tanstack/react-router";
import { autumnHandler } from "autumn-js/backend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

async function handle({ request }: { request: Request }) {
  const url = new URL(request.url);
  const body = request.method !== "GET" ? await request.json().catch(() => ({})) : {};

  // Resolve the customer ID from the session's active org
  let customerId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    customerId = session?.session?.activeOrganizationId ?? undefined;

    // Fallback: if no active org set, use the user's first org
    if (!customerId && session?.user?.id) {
      const member = await prisma.member.findFirst({
        where: { userId: session.user.id },
        select: { organizationId: true },
        orderBy: { createdAt: "asc" },
      });
      customerId = member?.organizationId ?? undefined;
    }
  } catch {}

  const result = await autumnHandler({
    request: {
      url: url.pathname,
      method: request.method,
      body,
    },
    customerId,
    clientOptions: {
      secretKey: env.AUTUMN_SECRET_KEY,
    },
    pathPrefix: "/api/autumn",
  });

  return new Response(JSON.stringify(result.response), {
    status: result.statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/autumn/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
