import { StatusDot } from "@/components/ui/status-dot"
import { EXTERNAL_STATUS_CONFIG, getExternalStatusConfig } from "@/lib/constants"

/**
 * Status badge for external services (registry).
 * Shows a status dot with label using Atlassian-style status values.
 */
export function ServiceStatusBadge({ status, size = "sm" }: { status: string | null; size?: "sm" | "md" }) {
  const config = getExternalStatusConfig(status)
  const dotSize = size === "md" ? "default" : "sm"
  const textClass = size === "md" ? "text-sm font-medium" : "text-xs font-medium"

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 ${config.text}`}>
      <StatusDot
        status={status as "operational" | "degraded_performance" | "partial_outage" | "major_outage" | "maintenance" | "unknown" | null | undefined}
        size={dotSize}
      />
      <span className={textClass}>{config.label}</span>
    </span>
  )
}

/** @deprecated Import from @/lib/constants instead */
export const STATUS_CONFIG = EXTERNAL_STATUS_CONFIG
