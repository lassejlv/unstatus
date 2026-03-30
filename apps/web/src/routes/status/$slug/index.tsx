import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { orpc } from "@/orpc/client";

export const Route = createFileRoute("/status/$slug/")({
  component: PublicStatusPage,
});

function PublicStatusPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getBySlug.queryOptions({ input: { slug } }),
  );

  if (isLoading) {
    return <CenteredMessage message="Loading…" />;
  }

  if (error || !data) {
    return <CenteredMessage message="Status page not found." />;
  }

  return (
    <PublicStatusPageView
      data={data}
      renderIncidentLink={(incident, content) => (
        <Link
          to="/status/$slug/$incidentId"
          params={{ slug, incidentId: incident.id }}
        >
          {content}
        </Link>
      )}
    />
  );
}
