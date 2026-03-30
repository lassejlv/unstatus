import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicIncidentPageView,
} from "@/components/public-status-view";
import { getCustomDomainContext } from "@/lib/custom-domain";
import { orpc } from "@/orpc/client";

export const Route = createFileRoute("/incidents/$incidentId")({
  beforeLoad: async () => {
    const { customHost } = await getCustomDomainContext();
    if (!customHost) {
      throw notFound();
    }
  },
  component: CustomDomainIncidentPage,
});

function CustomDomainIncidentPage() {
  const { incidentId } = Route.useParams();
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getIncidentByCustomDomain.queryOptions({
      input: { incidentId },
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
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← {data.pageName}
        </Link>
      }
    />
  );
}
