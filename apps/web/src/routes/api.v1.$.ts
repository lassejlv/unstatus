import { createFileRoute } from "@tanstack/react-router";
import { apiV1 } from "@/api/v1";

async function handle({ request }: { request: Request }) {
  return apiV1.fetch(request);
}

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
