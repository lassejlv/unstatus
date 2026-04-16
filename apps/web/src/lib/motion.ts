import type { Variants, Transition } from "motion/react";

// Shared easing curves
export const easings = {
  smooth: [0.25, 0.46, 0.45, 0.94] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
  out: [0, 0, 0.2, 1] as const,
  in: [0.4, 0, 1, 1] as const,
} as const;

// Animation durations
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  slower: 0.5,
} as const;

// Fade up animation (most common pattern in the app)
export function fadeUp(delay = 0): {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  transition: Transition;
} {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: durations.slow, delay, ease: easings.smooth },
  };
}

// Fade in animation
export function fadeIn(delay = 0): {
  initial: { opacity: number };
  animate: { opacity: number };
  transition: Transition;
} {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: durations.normal, delay, ease: easings.out },
  };
}

// Scale in animation
export function scaleIn(delay = 0): {
  initial: { opacity: number; scale: number };
  animate: { opacity: number; scale: number };
  transition: Transition;
} {
  return {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: durations.normal, delay, ease: easings.smooth },
  };
}

// Stagger container variants
export function staggerContainer(staggerDelay = 0.05): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };
}

// Stagger child variants
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.smooth },
  },
};

// Slide in from right (for sidecars/panels)
export function slideInRight(delay = 0): {
  initial: { opacity: number; x: string };
  animate: { opacity: number; x: number };
  exit: { opacity: number; x: string };
  transition: Transition;
} {
  return {
    initial: { opacity: 0, x: "100%" },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: "100%" },
    transition: { duration: durations.normal, delay, ease: easings.smooth },
  };
}

// Pulse animation for attention
export const pulseVariants: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3, ease: easings.smooth },
  },
};

// Breathing animation for status indicators
export const breathingVariants: Variants = {
  idle: { scale: 1, opacity: 1 },
  breathing: {
    scale: [1, 1.02, 1],
    opacity: [1, 0.9, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Spring transition preset
export const springTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

// Gentle spring for UI elements
export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};
