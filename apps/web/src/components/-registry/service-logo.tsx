import { cn } from "@/lib/utils"

interface ServiceLogoProps {
  name: string
  logoUrl: string | null
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  xs: {
    container: "size-9 rounded-md",
    image: "size-5",
    fallback: "text-xs",
  },
  sm: {
    container: "size-10 rounded-md",
    image: "size-6",
    fallback: "text-sm",
  },
  md: {
    container: "size-14 rounded-lg",
    image: "size-8",
    fallback: "text-xl",
  },
  lg: {
    container: "size-16 rounded-lg",
    image: "size-10",
    fallback: "text-2xl",
  },
}

/**
 * Service logo with fallback to first letter.
 * Used in ServiceCard and service detail pages.
 */
export function ServiceLogo({ name, logoUrl, size = "sm", className }: ServiceLogoProps) {
  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border bg-card",
        sizes.container,
        className
      )}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name} className={cn("rounded", sizes.image)} />
      ) : (
        <span className={cn("font-semibold text-muted-foreground", sizes.fallback)}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  )
}
