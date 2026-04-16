import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

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
      pulse: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      status: "unknown",
      pulse: false,
    },
  }
)

export interface StatusDotProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof statusDotVariants> {
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

  if (pulse) {
    return (
      <span className={cn("relative flex", className)} {...props}>
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            colorClass ?? statusDotVariants({ status })
          )}
        />
        <span className={cn(dotClass)} />
      </span>
    )
  }

  return <span className={cn(dotClass, className)} {...props} />
}

export { StatusDot, statusDotVariants }
