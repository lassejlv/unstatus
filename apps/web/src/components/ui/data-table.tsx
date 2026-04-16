import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: string
  header: string
  className?: string
  headerClassName?: string
  render: (item: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[] | undefined
  isLoading?: boolean
  emptyMessage?: string
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number
  /** Unique key extractor for each row */
  getRowKey: (item: T) => string
  /** Optional row click handler */
  onRowClick?: (item: T) => void
  /** Additional content below a row (for expandable rows) */
  renderExpandedRow?: (item: T) => React.ReactNode | null
  className?: string
}

/**
 * Consistent data table with loading skeletons and empty state.
 * Wraps the base Table components for common admin use cases.
 */
function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = "No items found.",
  skeletonRows = 5,
  getRowKey,
  onRowClick,
  renderExpandedRow,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((col) => (
              <TableHead key={col.key} className={col.headerClassName}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading skeleton rows
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    <Skeleton className="h-5 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data && data.length > 0 ? (
            // Data rows
            data.map((item, index) => {
              const key = getRowKey(item)
              const expandedContent = renderExpandedRow?.(item)
              return (
                <>
                  <TableRow
                    key={key}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render(item, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedContent && (
                    <TableRow key={`${key}-expanded`}>
                      <TableCell
                        colSpan={columns.length}
                        className="bg-muted/20 p-4"
                      >
                        {expandedContent}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })
          ) : (
            // Empty state
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export { DataTable, type Column }
