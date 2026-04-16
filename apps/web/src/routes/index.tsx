import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MoveRight } from "lucide-react";
import { PublicNav } from "@/components/-public-nav";
import { MarketingFooter } from "@/components/-marketing-footer";
import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { Hero } from "@/components/ui/animated-hero";
import { Features } from "@/components/ui/features-2";
import { Button } from "@/components/ui/button";
import { useCustomDomain } from "@/lib/use-custom-domain";
import { orpc, client } from "@/orpc/client";

export const Route = createFileRoute("/")({
  component: RootPage,
});

function RootPage() {
  const customDomain = useCustomDomain();

  // undefined = SSR (custom domains enabled but hostname unknown yet)
  if (customDomain === undefined) return null;

  if (customDomain) {
    return <CustomDomainStatusPage domain={customDomain} />;
  }

  return <HomePage />;
}

function CustomDomainStatusPage({ domain }: { domain: string }) {
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getByDomain.queryOptions({ input: { domain } }),
  );

  const subscribeMut = useMutation({
    mutationFn: (input: { email: string; monitorIds?: string[] }) =>
      client.publicStatus.subscribe({ slug: data?.slug ?? "", ...input }),
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
        <Link to="/$incidentId" params={{ incidentId: incident.id }}>
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

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <Hero />

        {/* Features */}
        <Features />

        {/* Closing CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:py-20">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
              Start monitoring in under 2 minutes
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
              Create your first monitor and status page today. Free forever, no credit card required.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/login">
                  Get started <MoveRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">
                  View pricing
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
