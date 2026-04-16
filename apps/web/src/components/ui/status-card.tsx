import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Unified card component for public status pages.
 * Used for monitor cards, incident rows, maintenance items, etc.
 */

const statusCardVariants = cva(
  "rounded-lg border bg-card transition-all",
  {
    variants: {
      variant: {
        default: "ring-1 ring-foreground/5 hover:ring-foreground/10",
        interactive: "ring-1 ring-foreground/5 hover:ring-foreground/10 hover:-translate-y-px cursor-pointer",
        banner: "",
        notice: "",
      },
      accent: {
        none: "",
        critical: "border-l-[3px] border-l-red-500",
        major: "border-l-[3px] border-l-yellow-500",
        minor: "border-l-[3px] border-l-muted-foreground",
        success: "border-l-[3px] border-l-emerald-500",
        info: "border-l-[3px] border-l-blue-500",
      },
    },
    defaultVariants: {
      variant: "default",
      accent: "none",
    },
  }
)

interface StatusCardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof statusCardVariants> {}

const StatusCard = React.forwardRef<HTMLDivElement, StatusCardProps>(
  ({ className, variant, accent, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="status-card"
        className={cn(statusCardVariants({ variant, accent }), className)}
        {...props}
      />
    )
  }
)
StatusCard.displayName = "StatusCard"

interface StatusCardHeaderProps extends Omit<React.ComponentProps<"div">, "onClick"> {
  /** Makes the header clickable with button styling */
  asButton?: boolean
  onClick?: () => void
}

/**
 * Header section of StatusCard. Use asButton for expandable cards.
 */
function StatusCardHeader({
  className,
  asButton,
  onClick,
  ...props
}: StatusCardHeaderProps) {
  if (asButton) {
    return (
      <button
        type="button"
        data-slot="status-card-header"
        className={cn(
          "flex w-full items-center justify-between p-4 text-left",
          className
        )}
        onClick={onClick}
      >
        {props.children}
      </button>
    )
  }

  return (
    <div
      data-slot="status-card-header"
      className={cn(
        "flex w-full items-center justify-between p-4",
        className
      )}
      {...props}
    />
  )
}

interface StatusCardContentProps extends React.ComponentProps<"div"> {}

/**
 * Content section of StatusCard.
 */
function StatusCardContent({ className, ...props }: StatusCardContentProps) {
  return (
    <div
      data-slot="status-card-content"
      className={cn("px-4 pb-3", className)}
      {...props}
    />
  )
}

interface StatusCardExpandableProps extends React.ComponentProps<"div"> {
  expanded?: boolean
}

/**
 * Expandable section with smooth animation.
 */
function StatusCardExpandable({
  className,
  expanded,
  children,
  ...props
}: StatusCardExpandableProps) {
  return (
    <div
      data-slot="status-card-expandable"
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-in-out",
        className
      )}
      style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      {...props}
    >
      <div className="overflow-hidden">
        {expanded && (
          <div className="border-t px-4 py-4">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

export {
  StatusCard,
  StatusCardHeader,
  StatusCardContent,
  StatusCardExpandable,
  statusCardVariants
}
