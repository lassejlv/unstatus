import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Status = "up" | "down" | "degraded" | "paused" | "unknown";

interface StatusOrbProps {
  status: Status;
  size?: "sm" | "default" | "lg";
  className?: string;
  showGlow?: boolean;
}

const statusConfig: Record<
  Status,
  { color: string; glowColor: string; label: string }
> = {
  up: {
    color: "bg-emerald-500",
    glowColor: "oklch(0.765 0.177 163.22 / 0.4)",
    label: "Operational",
  },
  down: {
    color: "bg-red-500",
    glowColor: "oklch(0.637 0.237 25.331 / 0.4)",
    label: "Down",
  },
  degraded: {
    color: "bg-yellow-500",
    glowColor: "oklch(0.795 0.184 86.047 / 0.4)",
    label: "Degraded",
  },
  paused: {
    color: "bg-muted-foreground",
    glowColor: "oklch(0.556 0 0 / 0.3)",
    label: "Paused",
  },
  unknown: {
    color: "bg-muted-foreground",
    glowColor: "oklch(0.556 0 0 / 0.3)",
    label: "Unknown",
  },
};

const sizeConfig = {
  sm: {
    orb: "size-8",
    glow: "size-12",
    outerGlow: "size-16",
  },
  default: {
    orb: "size-12",
    glow: "size-16",
    outerGlow: "size-20",
  },
  lg: {
    orb: "size-16",
    glow: "size-20",
    outerGlow: "size-24",
  },
};

/**
 * A prominent status indicator orb with ambient glow effects.
 * Features a breathing animation when operational.
 */
export function StatusOrb({
  status,
  size = "default",
  className,
  showGlow = true,
}: StatusOrbProps) {
  const reducedMotion = useReducedMotion();
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  const isOperational = status === "up";

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={
        {
          "--glow-color": config.glowColor,
        } as React.CSSProperties
      }
    >
      {/* Outer glow layer */}
      {showGlow && (
        <motion.div
          className={cn(
            "absolute rounded-full opacity-20 blur-xl",
            config.color,
            sizes.outerGlow
          )}
          animate={
            !reducedMotion && isOperational
              ? {
                  scale: [1, 1.1, 1],
                  opacity: [0.15, 0.25, 0.15],
                }
              : {}
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Middle glow layer */}
      {showGlow && (
        <motion.div
          className={cn(
            "absolute rounded-full opacity-30 blur-md",
            config.color,
            sizes.glow
          )}
          animate={
            !reducedMotion && isOperational
              ? {
                  scale: [1, 1.05, 1],
                  opacity: [0.25, 0.4, 0.25],
                }
              : {}
          }
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
      )}

      {/* Main orb */}
      <motion.div
        className={cn(
          "relative rounded-full shadow-lg",
          config.color,
          sizes.orb
        )}
        animate={
          !reducedMotion && isOperational
            ? {
                scale: [1, 1.02, 1],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner shine */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
      </motion.div>
    </div>
  );
}

/**
 * Get the status label for display
 */
export function getStatusLabel(status: Status): string {
  return statusConfig[status].label;
}
