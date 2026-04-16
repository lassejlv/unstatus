import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCard, CATEGORY_LABELS } from "@/components/-registry/service-card";
import { orpc } from "@/orpc/client";
import { Search, X } from "lucide-react";
import { PublicNav } from "@/components/-public-nav";

export const Route = createFileRoute("/registry/")({
  component: RegistryPage,
});

function RegistryPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: services, isLoading } = useQuery(
    orpc.registry.list.queryOptions({
      input: {
        search: search || undefined,
        category: selectedCategory ?? undefined,
      },
    }),
  );

  const { data: categories } = useQuery(
    orpc.registry.categories.queryOptions({ input: undefined }),
  );

  const hasActiveFilters = search.length > 0 || selectedCategory !== null;

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory(null);
  };

  // Group services by category when showing all (no category filter and no search)
  const groupedServices = useMemo(() => {
    if (!services || selectedCategory || search) return null;

    const groups = new Map<string, typeof services>();
    for (const service of services) {
      const existing = groups.get(service.category) ?? [];
      existing.push(service);
      groups.set(service.category, existing);
    }

    // Sort categories by the order they appear in CATEGORY_LABELS, then alphabetically
    const categoryOrder = Object.keys(CATEGORY_LABELS);
    return Array.from(groups.entries()).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a[0]);
      const bIndex = categoryOrder.indexOf(b[0]);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [services, selectedCategory, search]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav active="/registry" />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Service Registry</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
              Real-time status of popular services. Powered by their official status pages.
            </p>
          </div>

          {/* Search and filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="pl-10 pr-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Category filters - horizontal scroll on mobile, wrap on larger screens */}
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="shrink-0"
                >
                  All
                </Button>
                {categories?.map((cat) => (
                  <Button
                    key={cat.category}
                    variant={selectedCategory === cat.category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.category)}
                    className="shrink-0 gap-1.5"
                  >
                    {CATEGORY_LABELS[cat.category] ?? cat.category}
                    <span className={selectedCategory === cat.category ? "text-primary-foreground/70" : "text-muted-foreground"}>
                      {cat.count}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count and clear filters */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <>
                  {services?.length ?? 0} service{services?.length !== 1 ? "s" : ""}
                  {hasActiveFilters && " found"}
                </>
              )}
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 size-3" />
                Clear filters
              </Button>
            )}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : services && services.length > 0 ? (
            groupedServices ? (
              // Grouped view when showing all services
              <div className="space-y-10">
                {groupedServices.map(([category, categoryServices]) => (
                  <section key={category}>
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {CATEGORY_LABELS[category] ?? category}
                      <span className="text-muted-foreground/60">{categoryServices.length}</span>
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryServices.map((service) => (
                        <ServiceCard
                          key={service.id}
                          name={service.name}
                          slug={service.slug}
                          category={service.category}
                          currentStatus={service.currentStatus}
                          logoUrl={service.logoUrl}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              // Flat grid when filtered by category or searching
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    name={service.name}
                    slug={service.slug}
                    category={service.category}
                    currentStatus={service.currentStatus}
                    logoUrl={service.logoUrl}
                    showCategory={!!search}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full border bg-muted/50">
                <Search className="size-5 text-muted-foreground" />
              </div>
              <p className="font-medium">No services found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your search or filters" : "No services available yet"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
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
