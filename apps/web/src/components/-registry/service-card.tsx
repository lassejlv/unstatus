import { Link } from "@tanstack/react-router";
import { ServiceStatusBadge } from "./service-status-badge";
import { ServiceLogo } from "./service-logo";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type ServiceCardProps = {
  name: string;
  slug: string;
  category: string;
  currentStatus: string | null;
  logoUrl: string | null;
  /** Hide category badge when parent already shows category context */
  showCategory?: boolean;
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

// Map status to left border accent color for visual severity indication
function getStatusBorderClass(status: string | null): string {
  switch (status) {
    case "major_outage":
      return "border-l-red-500 border-l-2";
    case "partial_outage":
      return "border-l-orange-500 border-l-2";
    case "degraded_performance":
      return "border-l-yellow-500 border-l-2";
    case "maintenance":
      return "border-l-blue-500 border-l-2";
    default:
      return "";
  }
}

export function ServiceCard({
  name,
  slug,
  category,
  currentStatus,
  logoUrl,
  showCategory = false,
}: ServiceCardProps) {
  const borderClass = getStatusBorderClass(currentStatus);

  return (
    <Link
      to="/registry/$slug"
      params={{ slug }}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3.5 transition-all duration-150 hover:border-border/80 hover:bg-accent/40 hover:shadow-sm",
        borderClass
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <ServiceLogo
          name={name}
          logoUrl={logoUrl}
          size="xs"
          className="bg-background transition-colors group-hover:border-border/80"
        />
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium leading-tight">{name}</span>
          {showCategory && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {CATEGORY_LABELS[category] ?? category}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ServiceStatusBadge status={currentStatus} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>
    </Link>
  );
}

export { CATEGORY_LABELS };
