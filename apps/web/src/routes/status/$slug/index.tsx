import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { getPublicStatusPageBySlugServerFn } from "@/lib/public-status";
import { client } from "@/orpc/client";

export const Route = createFileRoute("/status/$slug/")({
  loader: async ({ params }) =>
    getPublicStatusPageBySlugServerFn({ data: { slug: params.slug } }),
  component: PublicStatusPage,
});

function PublicStatusPage() {
  const { slug } = Route.useParams();
  const data = Route.useLoaderData();

  const subscribeMut = useMutation({
    mutationFn: (input: { email: string; monitorIds?: string[] }) =>
      client.publicStatus.subscribe({ slug, ...input }),
  });

  if (!data) {
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
