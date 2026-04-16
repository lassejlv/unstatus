import { cn } from "@/lib/utils"

interface DetailRowProps extends React.ComponentProps<"div"> {
  label: React.ReactNode
  value: React.ReactNode
  /** Whether to show a bottom border (default: true) */
  border?: boolean
}

/**
 * A consistent key-value row for detail panels.
 *
 * @example
 * <DetailRow label="Status" value={<Badge>up</Badge>} />
 * <DetailRow label="Latency" value="45ms" border={false} />
 */
function DetailRow({ className, label, value, border = true, ...props }: DetailRowProps) {
  return (
    <div
      data-slot="detail-row"
      className={cn(
        "flex items-center justify-between px-3 py-2.5",
        border && "border-b",
        className
      )}
      {...props}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

interface DetailListProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

/**
 * Container for DetailRow items with consistent border styling.
 *
 * @example
 * <DetailList>
 *   <DetailRow label="Status" value="up" />
 *   <DetailRow label="Latency" value="45ms" border={false} />
 * </DetailList>
 */
function DetailList({ className, children, ...props }: DetailListProps) {
  return (
    <div
      data-slot="detail-list"
      className={cn("rounded-lg border", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { DetailRow, DetailList }
