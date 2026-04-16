import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PaginationProps {
  /** Current page (0-indexed) */
  page: number
  /** Total number of pages */
  totalPages: number
  /** Called when page changes */
  onPageChange: (page: number) => void
  /** Optional total item count for display */
  totalItems?: number
  /** Items per page (for computing display text) */
  pageSize?: number
  className?: string
}

/**
 * Pagination controls with page info and prev/next buttons.
 * Only renders when there's more than one page.
 */
function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const showingStart = pageSize ? page * pageSize + 1 : undefined
  const showingEnd = pageSize && totalItems ? Math.min((page + 1) * pageSize, totalItems) : undefined

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-xs text-muted-foreground">
        {showingStart && showingEnd && totalItems ? (
          <>Showing {showingStart}-{showingEnd} of {totalItems}</>
        ) : (
          <>Page {page + 1} of {totalPages}</>
        )}
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export { Pagination }
