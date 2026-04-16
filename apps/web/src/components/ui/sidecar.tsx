import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, X } from "lucide-react"
import { Spinner } from "./spinner"

interface SidecarProps extends React.ComponentProps<"div"> {
  /** Whether the sidecar is open */
  open: boolean
  /** Width of the sidecar panel (default: 520px) */
  width?: number
  children: React.ReactNode
}

/**
 * Sliding panel that appears from the right side of the screen.
 * Used for detail views of monitors, incidents, status pages, etc.
 *
 * @example
 * <Sidecar open={selectedId !== null} width={440}>
 *   <SidecarHeader title="Monitor details" onClose={() => setSelectedId(null)} />
 *   <SidecarContent>
 *     ...content...
 *   </SidecarContent>
 * </Sidecar>
 */
function Sidecar({ open, width = 520, className, children, ...props }: SidecarProps) {
  return (
    <div
      data-slot="sidecar"
      className={cn(
        "shrink-0 overflow-hidden transition-all duration-300 ease-out",
        open ? "opacity-100" : "w-0 opacity-0",
        className
      )}
      style={{ width: open ? width : 0 }}
      {...props}
    >
      <div
        className="relative flex h-full flex-col border-l bg-background/95 backdrop-blur-sm overflow-hidden"
        style={{ width }}
      >
        {children}
      </div>
    </div>
  )
}

interface SidecarHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClose: () => void
  actions?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Header for a Sidecar panel.
 *
 * @example
 * <SidecarHeader
 *   title="API Gateway"
 *   subtitle="/monitors/http"
 *   onClose={handleClose}
 *   actions={<Badge>Active</Badge>}
 * />
 */
function SidecarHeader({
  title,
  subtitle,
  onClose,
  actions,
  children,
}: SidecarHeaderProps) {
  return (
    <div data-slot="sidecar-header" className="px-6 pt-6 pb-0">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{title}</h2>
          {subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

interface SidecarTabsProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

/**
 * Tab bar container for Sidecar panels.
 */
function SidecarTabs({ className, children, ...props }: SidecarTabsProps) {
  return (
    <div
      data-slot="sidecar-tabs"
      className={cn("flex gap-4 mt-4 border-b -mx-6 px-6", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface SidecarTabProps extends React.ComponentProps<"button"> {
  active?: boolean
  children: React.ReactNode
}

/**
 * Individual tab button for SidecarTabs.
 */
function SidecarTab({ active, className, children, ...props }: SidecarTabProps) {
  return (
    <button
      type="button"
      data-slot="sidecar-tab"
      className={cn(
        "pb-2.5 text-sm transition-colors border-b-2 -mb-px",
        active
          ? "border-foreground text-foreground font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface SidecarContentProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

/**
 * Scrollable content area for Sidecar panels.
 */
function SidecarContent({ className, children, ...props }: SidecarContentProps) {
  return (
    <div
      data-slot="sidecar-content"
      className={cn("flex flex-1 flex-col overflow-y-auto", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface SidecarLoadingProps {
  className?: string
}

/**
 * Loading state for Sidecar panels.
 */
function SidecarLoading({ className }: SidecarLoadingProps) {
  return (
    <div className={cn("flex flex-1 items-center justify-center", className)}>
      <Spinner className="size-5" />
    </div>
  )
}

interface SidecarOverlayProps extends React.ComponentProps<"div"> {
  /** Whether the overlay is visible */
  visible: boolean
  children: React.ReactNode
}

/**
 * Sliding overlay that appears on top of the main sidecar content.
 * Used for edit forms, delete confirmations, etc.
 *
 * @example
 * <SidecarOverlay visible={view === "edit"}>
 *   <SidecarOverlayHeader title="Edit monitor" onBack={() => setView("main")} />
 *   ...form content...
 * </SidecarOverlay>
 */
function SidecarOverlay({
  visible,
  className,
  children,
  ...props
}: SidecarOverlayProps) {
  return (
    <div
      data-slot="sidecar-overlay"
      className={cn(
        "absolute inset-0 flex flex-col bg-background/95 backdrop-blur-sm transition-transform duration-200 ease-out",
        visible ? "translate-x-0" : "translate-x-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SidecarOverlayHeaderProps {
  title: React.ReactNode
  onBack: () => void
}

/**
 * Header for SidecarOverlay with back button.
 */
function SidecarOverlayHeader({ title, onBack }: SidecarOverlayHeaderProps) {
  return (
    <div
      data-slot="sidecar-overlay-header"
      className="flex items-center gap-2 border-b px-4 py-3"
    >
      <button
        type="button"
        onClick={onBack}
        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-sm font-medium">{title}</span>
    </div>
  )
}

export {
  Sidecar,
  SidecarHeader,
  SidecarTabs,
  SidecarTab,
  SidecarContent,
  SidecarLoading,
  SidecarOverlay,
  SidecarOverlayHeader,
}
