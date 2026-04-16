import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const listCardVariants = cva(
  "flex flex-col gap-2.5 rounded-lg border bg-card p-3.5 text-left transition-colors hover:border-foreground/20",
  {
    variants: {
      selected: {
        true: "border-foreground/30 bg-accent",
        false: "",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
)

interface ListCardProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof listCardVariants> {}

/**
 * Clickable card used in grid lists (monitors, status pages, etc).
 *
 * @example
 * <ListCard selected={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
 *   <ListCardHeader>
 *     <span className="text-sm font-medium truncate">{item.name}</span>
 *     <Badge>Active</Badge>
 *   </ListCardHeader>
 *   <ListCardDescription>{item.url}</ListCardDescription>
 *   <ListCardMeta>
 *     <StatusDot status="up" size="xs" />
 *     <Badge variant="outline">HTTP</Badge>
 *     <span>30s</span>
 *   </ListCardMeta>
 * </ListCard>
 */
const ListCard = React.forwardRef<HTMLButtonElement, ListCardProps>(
  ({ className, selected, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        data-slot="list-card"
        className={cn(listCardVariants({ selected, className }))}
        {...props}
      />
    )
  }
)
ListCard.displayName = "ListCard"

interface ListCardHeaderProps extends React.ComponentProps<"div"> {}

/**
 * Header row for ListCard with title and optional action/badge.
 */
function ListCardHeader({ className, ...props }: ListCardHeaderProps) {
  return (
    <div
      data-slot="list-card-header"
      className={cn("flex items-center justify-between", className)}
      {...props}
    />
  )
}

interface ListCardDescriptionProps extends React.ComponentProps<"span"> {}

/**
 * Secondary text line for ListCard.
 */
function ListCardDescription({ className, ...props }: ListCardDescriptionProps) {
  return (
    <span
      data-slot="list-card-description"
      className={cn("text-xs text-muted-foreground truncate", className)}
      {...props}
    />
  )
}

interface ListCardMetaProps extends React.ComponentProps<"div"> {}

/**
 * Metadata row at the bottom of ListCard (status dot, badges, etc).
 */
function ListCardMeta({ className, ...props }: ListCardMetaProps) {
  return (
    <div
      data-slot="list-card-meta"
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { ListCard, ListCardHeader, ListCardDescription, ListCardMeta, listCardVariants }
