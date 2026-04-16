import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ServiceStatusBadge } from "./service-status-badge";

type ServiceCardProps = {
  name: string;
  slug: string;
  category: string;
  currentStatus: string | null;
  logoUrl: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  hosting: "Hosting",
  cdn: "CDN / DNS",
  database: "Database",
  api: "API",
  devtools: "DevTools",
  cloud: "Cloud",
  payments: "Payments",
  communication: "Communication",
  auth: "Auth",
};

export function ServiceCard({ name, slug, category, currentStatus, logoUrl }: ServiceCardProps) {
  return (
    <Link
      to="/registry/$slug"
      params={{ slug }}
      className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="size-6 rounded" />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {name.charAt(0)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <Badge variant="secondary" className="shrink-0">
            {CATEGORY_LABELS[category] ?? category}
          </Badge>
        </div>
        <div className="mt-0.5">
          <ServiceStatusBadge status={currentStatus} />
        </div>
      </div>
    </Link>
  );
}

export { CATEGORY_LABELS };
