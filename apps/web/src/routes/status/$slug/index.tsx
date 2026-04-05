import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { orpc, client } from "@/orpc/client";

export const Route = createFileRoute("/status/$slug/")({
  component: PublicStatusPage,
});

function PublicStatusPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getBySlug.queryOptions({ input: { slug } }),
  );

  const subscribeMut = useMutation({
    mutationFn: (input: { email: string; monitorIds?: string[] }) =>
      client.publicStatus.subscribe({ slug, ...input }),
  });

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
      onSubscribe={async (email, monitorIds) => {
        await subscribeMut.mutateAsync({ email, monitorIds });
      }}
      subscribeLoading={subscribeMut.isPending}
      subscribeSuccess={subscribeMut.isSuccess}
      subscribeError={subscribeMut.error?.message}
    />
  );
}
