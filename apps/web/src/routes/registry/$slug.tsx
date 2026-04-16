import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { StatusHistoryBar } from "@/components/ui/uptime-bar";
import { ServiceStatusBadge } from "@/components/-registry/service-status-badge";
import { ServiceLogo } from "@/components/-registry/service-logo";
import { CATEGORY_LABELS } from "@/components/-registry/service-card";
import { orpc } from "@/orpc/client";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";
import { PublicNav } from "@/components/-public-nav";

export const Route = createFileRoute("/registry/$slug")({
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { slug } = Route.useParams();
  const { data: service, isLoading } = useQuery(
    orpc.registry.get.queryOptions({ input: { slug } }),
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <PublicNav active="/registry" />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="font-medium">Service not found</p>
          <p className="mt-1 text-sm text-muted-foreground">The service you're looking for doesn't exist</p>
          <Link
            to="/registry"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to registry
          </Link>
        </div>
      </div>
    );
  }

  const groupedComponents = new Map<string, typeof service.components>();
  for (const comp of service.components) {
    const group = comp.groupName ?? "Components";
    const existing = groupedComponents.get(group) ?? [];
    existing.push(comp);
    groupedComponents.set(group, existing);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav active="/registry" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-10 sm:pb-24">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm sm:mb-8">
          <Link
            to="/registry"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Registry
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium truncate max-w-[150px] sm:max-w-[200px]">{service.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-5">
          <ServiceLogo
            name={service.name}
            logoUrl={service.logoUrl}
            size="lg"
            className="hidden shadow-sm sm:flex"
          />
          <ServiceLogo
            name={service.name}
            logoUrl={service.logoUrl}
            size="md"
            className="shadow-sm sm:hidden"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{service.name}</h1>
              <Badge variant="secondary">
                {CATEGORY_LABELS[service.category] ?? service.category}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <ServiceStatusBadge status={service.currentStatus} size="md" />
              {service.currentDescription && (
                <span className="w-full text-sm text-muted-foreground sm:w-auto">
                  {service.currentDescription}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {service.website && (
                <a
                  href={service.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <span className="truncate max-w-[180px] sm:max-w-none">
                    {service.website.replace(/^https?:\/\//, "")}
                  </span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              )}
              {service.statusPageUrl && (
                <a
                  href={service.statusPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  Status Page
                  <ExternalLink className="size-3" />
                </a>
              )}
              {service.lastFetchedAt && (
                <span className="hidden sm:inline-flex sm:items-center sm:gap-4">
                  <span className="text-muted-foreground/50">|</span>
                  <span>
                    Updated {new Date(service.lastFetchedAt).toLocaleString()}
                  </span>
                </span>
              )}
            </div>
            {/* Last updated on mobile - on its own line */}
            {service.lastFetchedAt && (
              <p className="mt-2 text-xs text-muted-foreground sm:hidden">
                Updated {new Date(service.lastFetchedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <Separator className="my-6 sm:my-10" />

        {/* 90-day history */}
        <section className="mb-8 sm:mb-10">
          <h2 className="mb-3 text-sm font-medium sm:mb-4 sm:text-base">90-day status history</h2>
          <StatusHistoryBar daily={service.daily} />
        </section>

        {/* Components */}
        {service.components.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium sm:mb-4 sm:text-base">Components</h2>
            <div className="space-y-6 sm:space-y-8">
              {Array.from(groupedComponents.entries()).map(([group, components]) => (
                <div key={group}>
                  {groupedComponents.size > 1 && (
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group}
                    </h3>
                  )}
                  <div className="divide-y rounded-lg border bg-card overflow-hidden">
                    {components.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex flex-col gap-2 px-3 py-3 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">{comp.name}</span>
                          {comp.description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{comp.description}</p>
                          )}
                        </div>
                        <ServiceStatusBadge status={comp.currentStatus} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-sm text-muted-foreground sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-0">
            <span>
              Powered by{" "}
              <Link to="/" className="font-medium text-foreground hover:underline">
                unstatus
              </Link>
            </span>
            <Link to="/legal" className="transition-colors hover:text-foreground">Legal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
