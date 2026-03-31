import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  CenteredMessage,
  PublicIncidentPageView,
} from "@/components/public-status-view";
import { orpc } from "@/orpc/client";
import { useCustomDomain } from "@/lib/use-custom-domain";

export const Route = createFileRoute("/$incidentId")({
  component: CustomDomainIncidentPage,
});

function CustomDomainIncidentPage() {
  const customDomain = useCustomDomain();
  const { incidentId } = Route.useParams();

  if (!customDomain) {
    return <CenteredMessage message="Page not found." />;
  }

  return <IncidentView domain={customDomain} incidentId={incidentId} />;
}

function IncidentView({
  domain,
  incidentId,
}: {
  domain: string;
  incidentId: string;
}) {
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getIncidentByDomain.queryOptions({
      input: { domain, incidentId },
    }),
  );

  if (isLoading) {
    return <CenteredMessage message="Loading…" />;
  }

  if (error || !data) {
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
