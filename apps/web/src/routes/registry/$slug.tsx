import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ServiceStatusBadge, STATUS_CONFIG } from "@/components/-registry/service-status-badge";
import { CATEGORY_LABELS } from "@/components/-registry/service-card";
import { orpc } from "@/orpc/client";
import { ArrowLeft, ExternalLink } from "lucide-react";

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
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Service not found.
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
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Logo.png" alt="unstatus" className="size-7" />
            <span className="text-sm font-semibold tracking-tight">unstatus</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/registry"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Registry
            </Link>
            <Link to="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-8 pb-24">
        {/* Back */}
        <Link
          to="/registry"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to registry
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border bg-card">
            {service.logoUrl ? (
              <img src={service.logoUrl} alt={service.name} className="size-8 rounded" />
            ) : (
              <span className="text-xl font-semibold text-muted-foreground">
                {service.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
              <Badge variant="secondary">
                {CATEGORY_LABELS[service.category] ?? service.category}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-4">
              <ServiceStatusBadge status={service.currentStatus} size="md" />
              {service.currentDescription && (
                <span className="text-sm text-muted-foreground">
                  {service.currentDescription}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              {service.website && (
                <a
                  href={service.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {service.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="size-3" />
                </a>
              )}
              {service.statusPageUrl && (
                <a
                  href={service.statusPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Status Page
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {service.lastFetchedAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            Last checked: {new Date(service.lastFetchedAt).toLocaleString()}
          </p>
        )}

        <Separator className="my-8" />

        {/* 90-day history */}
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium">90-day status history</h2>
          <TooltipProvider>
            <div className="flex gap-[2px]">
              {service.daily.map((day) => {
                const config = STATUS_CONFIG[day.status] ?? STATUS_CONFIG.unknown!;
                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={`h-8 flex-1 rounded-sm ${config.dot} opacity-80 hover:opacity-100 transition-opacity`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {day.date}: {(STATUS_CONFIG[day.status] ?? STATUS_CONFIG.unknown!).label}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Components */}
        {service.components.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium">Components</h2>
            <div className="space-y-6">
              {Array.from(groupedComponents.entries()).map(([group, components]) => (
                <div key={group}>
                  {groupedComponents.size > 1 && (
                    <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {group}
                    </h3>
                  )}
                  <div className="divide-y rounded-lg border">
                    {components.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <span className="text-sm">{comp.name}</span>
                          {comp.description && (
                            <p className="text-xs text-muted-foreground">{comp.description}</p>
                          )}
                        </div>
                        <ServiceStatusBadge status={comp.currentStatus} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
