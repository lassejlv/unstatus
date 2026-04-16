import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
  /** Called when input value changes */
  onValueChange?: (value: string) => void
}

/**
 * Search input with icon. Used across list/table views.
 */
function SearchInput({ className, onValueChange, onChange, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        className={cn("pl-9", className)}
        onChange={(e) => {
          onChange?.(e)
          onValueChange?.(e.target.value)
        }}
        {...props}
      />
    </div>
  )
}

export { SearchInput }
