import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EXTERNAL_STATUS_CONFIG } from "@/lib/constants"

// =============================================================================
// UPTIME BAR (percentage-based)
// =============================================================================
// Used for monitor uptime visualization on public status pages.

interface UptimeDayData {
  date: string
  uptime: number
  totalChecks: number
}

interface UptimeBarProps extends React.ComponentProps<"div"> {
  daily: UptimeDayData[]
  /** Show date labels below the bar */
  showLabels?: boolean
  /** Height of the bars */
  barHeight?: "sm" | "default" | "lg"
}

function getUptimeColor(uptime: number, totalChecks: number): string {
  if (totalChecks === 0) return "bg-muted"
  if (uptime >= 99.5) return "bg-emerald-500"
  if (uptime >= 95) return "bg-emerald-400"
  if (uptime >= 90) return "bg-yellow-400"
  if (uptime >= 50) return "bg-orange-400"
  if (uptime > 0) return "bg-red-500"
  return "bg-muted"
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

const barHeightClasses = {
  sm: "h-5 sm:h-6",
  default: "h-7 sm:h-8",
  lg: "h-8 sm:h-10",
}

/**
 * Uptime bar visualization showing percentage-based coloring.
 * Used for monitor uptime history on public status pages.
 *
 * @example
 * <UptimeBar daily={monitor.daily} showLabels />
 */
function UptimeBar({
  daily,
  showLabels = true,
  barHeight = "default",
  className,
  ...props
}: UptimeBarProps) {
  return (
    <TooltipProvider>
      <div className={cn("flex flex-col", className)} {...props}>
        <div className="flex gap-px sm:gap-[2px]">
          {daily.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex-1 min-w-[2px] rounded-[2px] sm:rounded-[3px] transition-all hover:opacity-80 hover:scale-y-110",
                    barHeightClasses[barHeight],
                    getUptimeColor(day.uptime, day.totalChecks)
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{formatDate(day.date)}</p>
                {day.totalChecks > 0 ? (
                  <p className="tabular-nums">{day.uptime.toFixed(2)}% uptime</p>
                ) : (
                  <p className="text-muted-foreground">No data</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {showLabels && (
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/70 sm:text-xs sm:text-muted-foreground">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// =============================================================================
// STATUS HISTORY BAR (status-based)
// =============================================================================
// Used for external service status history (registry pages).

interface StatusDayData {
  date: string
  status: string
}

interface StatusHistoryBarProps extends React.ComponentProps<"div"> {
  daily: StatusDayData[]
  /** Show date labels below the bar */
  showLabels?: boolean
  /** Height of the bars */
  barHeight?: "sm" | "default" | "lg"
}

/**
 * Status history bar visualization showing status-based coloring.
 * Used for external service history on registry pages.
 *
 * @example
 * <StatusHistoryBar daily={service.daily} showLabels />
 */
function StatusHistoryBar({
  daily,
  showLabels = true,
  barHeight = "default",
  className,
  ...props
}: StatusHistoryBarProps) {
  return (
    <TooltipProvider>
      <div className={cn("flex flex-col", className)} {...props}>
        <div className="flex gap-[2px]">
          {daily.map((day) => {
            const config = EXTERNAL_STATUS_CONFIG[day.status as keyof typeof EXTERNAL_STATUS_CONFIG]
              ?? EXTERNAL_STATUS_CONFIG.unknown
            return (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex-1 rounded-sm opacity-80 hover:opacity-100 transition-opacity",
                      barHeightClasses[barHeight],
                      config.dot
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>{day.date}: {config.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        {showLabels && (
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export { UptimeBar, StatusHistoryBar }
export type { UptimeDayData, StatusDayData }
