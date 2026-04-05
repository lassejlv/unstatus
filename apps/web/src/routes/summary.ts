import { createFileRoute } from "@tanstack/react-router";
import { publicSummaryApi } from "@/api/public-summary";

async function handle({ request }: { request: Request }) {
  return publicSummaryApi.fetch(request);
}

export const Route = createFileRoute("/summary")({
  server: {
    handlers: {
      GET: handle,
    },
  },
});
