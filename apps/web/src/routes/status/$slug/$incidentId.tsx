import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicIncidentPageView,
  IncidentPageSkeleton,
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
    return <IncidentPageSkeleton />;
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
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <span className="transition-transform duration-150 group-hover:-translate-x-0.5">←</span>
          {data.pageName}
        </Link>
      }
    />
  );
}
