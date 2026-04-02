import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";

type Dependency = {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  serviceLogoUrl: string | null;
  serviceStatus: string;
  serviceStatusPageUrl: string | null;
  serviceLastFetchedAt: string | Date | null;
  componentName: string | null;
  componentStatus: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  operational: { label: "Operational", dot: "bg-emerald-500", bg: "" },
  degraded_performance: { label: "Degraded", dot: "bg-yellow-500", bg: "bg-yellow-500/5" },
  partial_outage: { label: "Partial Outage", dot: "bg-orange-500", bg: "bg-orange-500/5" },
  major_outage: { label: "Major Outage", dot: "bg-red-500", bg: "bg-red-500/5" },
  maintenance: { label: "Maintenance", dot: "bg-blue-500", bg: "bg-blue-500/5" },
  unknown: { label: "Unknown", dot: "bg-muted-foreground", bg: "" },
};

function DependencyRow({ dep }: { dep: Dependency }) {
  const status = dep.componentStatus ?? dep.serviceStatus;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown!;
  const isDown = status !== "operational" && status !== "unknown";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-2 rounded px-2 py-1 ${isDown ? config.bg : ""}`}
          >
            <span className={`size-1.5 shrink-0 rounded-full ${config.dot}`} />
            <span className="text-xs text-muted-foreground">{dep.serviceName}</span>
            {dep.componentName && (
              <span className="text-[10px] text-muted-foreground/60">
                ({dep.componentName})
              </span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{dep.serviceName}</span>
            <span className="text-xs text-muted-foreground">
              Status: {config.label}
            </span>
            {dep.serviceLastFetchedAt && (
              <span className="text-xs text-muted-foreground">
                Last checked: {new Date(dep.serviceLastFetchedAt).toLocaleString()}
              </span>
            )}
            {dep.serviceStatusPageUrl && (
              <a
                href={dep.serviceStatusPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View status page <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DependencyList({ dependencies }: { dependencies: Dependency[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (dependencies.length === 0) return null;

  const hasIssues = dependencies.some(
    (d) => {
      const status = d.componentStatus ?? d.serviceStatus;
      return status !== "operational" && status !== "unknown";
    },
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden sm:block">
        <div className="mt-2 flex flex-col gap-0.5 pl-1">
          <span className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Dependencies
          </span>
          {dependencies.map((dep) => (
            <DependencyRow key={`${dep.serviceId}-${dep.componentName ?? ""}`} dep={dep} />
          ))}
        </div>
      </div>

      {/* Mobile: collapsible */}
      <div className="sm:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="mt-2 flex w-full items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
            <ChevronDown
              className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
            Dependencies ({dependencies.length})
            {hasIssues && (
              <span className="size-1.5 rounded-full bg-orange-500" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 flex flex-col gap-0.5 pl-1">
              {dependencies.map((dep) => (
                <DependencyRow key={`${dep.serviceId}-${dep.componentName ?? ""}`} dep={dep} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}

export function DependencyImpactBanner({
  monitorStatus,
  dependencies,
}: {
  monitorStatus: string;
  dependencies: Dependency[];
}) {
  if (monitorStatus !== "down" && monitorStatus !== "degraded") return null;

  const affectedDeps = dependencies.filter((d) => {
    const status = d.componentStatus ?? d.serviceStatus;
    return status === "major_outage" || status === "partial_outage" || status === "degraded_performance";
  });

  if (affectedDeps.length === 0) return null;

  const names = affectedDeps.map((d) => d.serviceName);
  const uniqueNames = [...new Set(names)];

  return (
    <div className="mt-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-800 dark:border-orange-800/30 dark:bg-orange-950/20 dark:text-orange-300">
      May be affected by: {uniqueNames.join(", ")}
    </div>
  );
}
