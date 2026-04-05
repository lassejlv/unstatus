import { createFileRoute, Link } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicIncidentPageView,
} from "@/components/public-status-view";
import { getCurrentCustomDomainIncidentPageServerFn } from "@/lib/public-status";

export const Route = createFileRoute("/$incidentId")({
  loader: async ({ params }) =>
    getCurrentCustomDomainIncidentPageServerFn({
      data: { incidentId: params.incidentId },
    }),
  component: CustomDomainIncidentPage,
});

function CustomDomainIncidentPage() {
  const { domain, data } = Route.useLoaderData();

  if (!domain) {
    return <CenteredMessage message="Page not found." />;
  }

  if (!data) {
    return <CenteredMessage message="Incident not found." />;
  }

  return (
    <PublicIncidentPageView
      data={data}
      backLink={
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← {data.pageName}
        </Link>
      }
    />
  );
}
