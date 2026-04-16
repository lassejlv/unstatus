import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Status dot indicator component.
 *
 * Supports all status types used across the application:
 * - Monitor statuses: up, down, degraded, paused, unknown
 * - External/Atlassian statuses: operational, degraded_performance, partial_outage, major_outage, maintenance
 * - Incident statuses: investigating, identified, monitoring, resolved
 *
 * Use `pulse` prop for live/active status indicators.
 */

const statusDotVariants = cva(
  "shrink-0 rounded-full",
  {
    variants: {
      size: {
        xs: "size-1.5",
        sm: "size-2",
        default: "size-2.5",
        lg: "size-3",
      },
      status: {
        // Monitor statuses
        up: "bg-emerald-500",
        down: "bg-red-500",
        degraded: "bg-yellow-500",
        paused: "bg-muted-foreground",
        unknown: "bg-muted-foreground",
        // External service statuses (Atlassian-style)
        operational: "bg-emerald-500",
        degraded_performance: "bg-yellow-500",
        partial_outage: "bg-orange-500",
        major_outage: "bg-red-500",
        maintenance: "bg-blue-500",
        // Incident statuses
        investigating: "bg-red-500",
        identified: "bg-yellow-500",
        monitoring: "bg-blue-500",
        resolved: "bg-emerald-500",
      },
    },
    defaultVariants: {
      size: "default",
      status: "unknown",
    },
  }
)

// Glow colors for pulsing effect (40% opacity)
const pulseGlowColors: Record<string, string> = {
  up: "bg-emerald-500",
  down: "bg-red-500",
  degraded: "bg-yellow-500",
  paused: "bg-muted-foreground",
  unknown: "bg-muted-foreground",
  operational: "bg-emerald-500",
  degraded_performance: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-blue-500",
  investigating: "bg-red-500",
  identified: "bg-yellow-500",
  monitoring: "bg-blue-500",
  resolved: "bg-emerald-500",
}

export interface StatusDotProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof statusDotVariants> {
  /** Show pulsing animation for live/active indicators */
  pulse?: boolean
  /** Override the color class directly if needed */
  colorClass?: string
}

function StatusDot({
  className,
  size,
  status,
  pulse = false,
  colorClass,
  ...props
}: StatusDotProps) {
  const dotClass = colorClass ?? statusDotVariants({ size, status })
  const glowClass = colorClass ?? pulseGlowColors[status ?? "unknown"] ?? "bg-muted-foreground"

  if (pulse) {
    return (
      <span className={cn("relative flex", statusDotVariants({ size }), className)} {...props}>
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            glowClass
          )}
        />
        <span className={cn("relative inline-flex rounded-full", statusDotVariants({ size, status }), colorClass)} />
      </span>
    )
  }

  return <span className={cn(dotClass, className)} {...props} />
}

export { StatusDot, statusDotVariants }
