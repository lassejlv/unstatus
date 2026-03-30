import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicIncidentPageView,
} from "@/components/public-status-view";
import { orpc } from "@/orpc/client";

export const Route = createFileRoute("/status/$slug/$incidentId")({
  component: PublicIncidentPage,
});

function PublicIncidentPage() {
  const { slug, incidentId } = Route.useParams();
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getIncident.queryOptions({
      input: { slug, incidentId },
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
          to="/status/$slug"
          params={{ slug }}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← {data.pageName}
        </Link>
      }
    />
  );
}
