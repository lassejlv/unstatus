import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  /** Format function to apply to the displayed value */
  format?: (value: number) => string;
  /** Duration of the animation in seconds */
  duration?: number;
  /** Additional class names */
  className?: string;
  /** Whether to animate on value changes (default: true) */
  animateOnChange?: boolean;
}

/**
 * Animated number counter that smoothly transitions between values.
 * Respects user's reduced motion preference.
 */
export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toString(),
  duration = 0.5,
  className,
  animateOnChange = true,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => format(v));
  const prevValue = useRef(value);

  useEffect(() => {
    // Skip animation if reduced motion is preferred
    if (reducedMotion) {
      motionValue.set(value);
      return;
    }

    // Animate from previous value to new value
    const from = animateOnChange ? prevValue.current : 0;
    prevValue.current = value;

    const controls = animate(motionValue, value, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
    });

    // Set initial value if this is the first render
    if (from === 0 && value !== 0) {
      motionValue.set(0);
    }

    return () => controls.stop();
  }, [value, duration, motionValue, reducedMotion, animateOnChange]);

  // If reduced motion, just show the static value
  if (reducedMotion) {
    return <span className={cn("tabular-nums", className)}>{format(value)}</span>;
  }

  return (
    <motion.span className={cn("tabular-nums", className)}>
      {rounded}
    </motion.span>
  );
}

// Preset formatters
export const formatters = {
  /** Format as percentage with 1 decimal */
  percent: (v: number) => `${v.toFixed(1)}%`,
  /** Format as percentage with 2 decimals */
  percentPrecise: (v: number) => `${v.toFixed(2)}%`,
  /** Format with "ms" suffix */
  ms: (v: number) => `${Math.round(v)}ms`,
  /** Format as integer */
  integer: (v: number) => Math.round(v).toString(),
  /** Format with commas for thousands */
  thousands: (v: number) =>
    Math.round(v).toLocaleString("en-US"),
};
