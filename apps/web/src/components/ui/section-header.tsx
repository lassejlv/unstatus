import { cn } from "@/lib/utils"

interface SectionHeaderProps extends React.ComponentProps<"span"> {
  children: React.ReactNode
}

/**
 * Consistent section header styling used for labels above grouped content.
 *
 * @example
 * <SectionHeader>Recent checks</SectionHeader>
 */
function SectionHeader({ className, children, ...props }: SectionHeaderProps) {
  return (
    <span
      data-slot="section-header"
      className={cn(
        "text-xs font-medium uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { SectionHeader }
