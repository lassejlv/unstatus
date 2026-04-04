import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ServiceCard, CATEGORY_LABELS } from "@/components/-registry/service-card";
import { orpc } from "@/orpc/client";
import { Search } from "lucide-react";
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav active="/registry" />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-24">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">Service Registry</h1>
            <p className="mt-2 text-muted-foreground">
              Real-time status of popular services. Powered by their official status pages.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-9"
            />
          </div>

          {/* Category filters */}
          <div className="mb-8 flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories?.map((cat) => (
              <Button
                key={cat.category}
                variant={selectedCategory === cat.category ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat.category ? null : cat.category,
                  )
                }
              >
                {CATEGORY_LABELS[cat.category] ?? cat.category}
                <span className="ml-1 text-xs text-muted-foreground">
                  {cat.count}
                </span>
              </Button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Spinner />
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
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
          ) : (
            <div className="py-24 text-center text-muted-foreground">
              No services found.
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span>
            Powered by{" "}
            <Link to="/" className="font-medium text-foreground hover:underline">
              unstatus
            </Link>
          </span>
          <Link to="/legal" className="hover:text-foreground">Legal</Link>
        </div>
      </footer>
    </div>
  );
}
