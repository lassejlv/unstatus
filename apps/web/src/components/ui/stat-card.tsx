import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number | undefined | null
  icon: LucideIcon
  isLoading?: boolean
  className?: string
}

/**
 * Metric/stat card for dashboard overviews.
 * Shows a labeled value with an icon and proper loading state.
 */
function StatCard({ label, value, icon: Icon, isLoading, className }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="mb-1 h-7 w-16" />
          ) : (
            <p className="truncate text-2xl font-semibold tabular-nums">
              {value ?? "-"}
            </p>
          )}
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export { StatCard }
