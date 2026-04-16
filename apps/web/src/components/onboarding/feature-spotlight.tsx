import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface FeatureSpotlightProps {
  /** Unique identifier for this spotlight */
  id: string;
  /** Title of the feature */
  title: string;
  /** Description of the feature */
  description: string;
  /** Whether the spotlight is visible */
  isVisible: boolean;
  /** Callback when user dismisses the spotlight */
  onDismiss: () => void;
  /** Callback when user clicks "Got it" */
  onAcknowledge: () => void;
  /** Position relative to the anchor element */
  position?: "top" | "bottom" | "left" | "right";
  /** Additional class names for positioning */
  className?: string;
  /** Optional learn more URL */
  learnMoreUrl?: string;
}

/**
 * A spotlight/coach mark component for progressive feature disclosure.
 * Appears near a UI element to explain new features.
 */
export function FeatureSpotlight({
  id: _id,
  title,
  description,
  isVisible,
  onDismiss,
  onAcknowledge,
  position = "bottom",
  className,
  learnMoreUrl,
}: FeatureSpotlightProps) {
  const reducedMotion = useReducedMotion();

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  const arrowClasses = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-card border-x-transparent border-b-transparent",
    bottom:
      "top-[-6px] left-1/2 -translate-x-1/2 border-b-card border-x-transparent border-t-transparent",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-l-card border-y-transparent border-r-transparent",
    right:
      "left-[-6px] top-1/2 -translate-y-1/2 border-r-card border-y-transparent border-l-transparent",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={cn(
            "absolute z-50 w-64 rounded-lg border bg-card p-3 shadow-lg",
            positionClasses[position],
            className
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              "absolute size-0 border-[6px]",
              arrowClasses[position]
            )}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>

          {/* Content */}
          <h4 className="pr-5 text-sm font-medium">{title}</h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="default" onClick={onAcknowledge} className="h-7 text-xs">
              Got it
            </Button>
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Learn more
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SpotlightTriggerProps {
  /** Whether to show the pulsing indicator */
  showPulse?: boolean;
  /** Children to wrap */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Wrapper component that adds a pulsing indicator to an element.
 * Use this to highlight elements that have new features to discover.
 */
export function SpotlightTrigger({
  showPulse = true,
  children,
  className,
}: SpotlightTriggerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={cn("relative", className)}>
      {children}
      {showPulse && !reducedMotion && (
        <span className="absolute -right-1 -top-1 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
      )}
    </div>
  );
}

interface UseSpotlightOptions {
  /** Whether the spotlight should be shown */
  shouldShow: boolean;
  /** Delay before showing the spotlight in ms */
  delay?: number;
}

/**
 * Hook to manage spotlight visibility with optional delay.
 */
export function useSpotlight({ shouldShow, delay = 1000 }: UseSpotlightOptions) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (shouldShow) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    } else {
      setIsVisible(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [shouldShow, delay]);

  const hide = () => setIsVisible(false);

  return { isVisible, hide };
}
