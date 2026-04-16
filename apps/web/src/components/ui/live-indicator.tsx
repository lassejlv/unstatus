import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface LiveIndicatorProps {
  /** Whether the connection is live */
  isLive?: boolean;
  /** Optional label to display */
  label?: string;
  /** Size variant */
  size?: "sm" | "default";
  /** Additional class names */
  className?: string;
}

/**
 * A pulsing indicator showing live/connected status.
 * Shows a green dot with pulse animation when live.
 */
export function LiveIndicator({
  isLive = true,
  label,
  size = "default",
  className,
}: LiveIndicatorProps) {
  const reducedMotion = useReducedMotion();

  const dotSize = size === "sm" ? "size-1.5" : "size-2";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="relative flex">
        {/* Ping animation */}
        {isLive && !reducedMotion && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              isLive ? "bg-emerald-400" : "bg-muted-foreground"
            )}
          />
        )}
        {/* Static dot */}
        <span
          className={cn(
            "relative inline-flex rounded-full",
            dotSize,
            isLive ? "bg-emerald-500" : "bg-muted-foreground"
          )}
        />
      </span>
      {label && (
        <span className={cn("text-muted-foreground", textSize)}>{label}</span>
      )}
    </div>
  );
}

interface ConnectionStatusProps {
  status: "connected" | "reconnecting" | "offline";
  className?: string;
}

/**
 * Connection status indicator with different states.
 */
export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const config = {
    connected: {
      color: "bg-emerald-500",
      pingColor: "bg-emerald-400",
      label: "Connected",
      showPing: true,
    },
    reconnecting: {
      color: "bg-yellow-500",
      pingColor: "bg-yellow-400",
      label: "Reconnecting...",
      showPing: true,
    },
    offline: {
      color: "bg-muted-foreground",
      pingColor: "",
      label: "Offline",
      showPing: false,
    },
  }[status];

  const reducedMotion = useReducedMotion();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="relative flex">
        {config.showPing && !reducedMotion && (
          <span
            className={cn(
              "absolute inline-flex size-2 animate-ping rounded-full opacity-75",
              config.pingColor
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", config.color)} />
      </span>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}
