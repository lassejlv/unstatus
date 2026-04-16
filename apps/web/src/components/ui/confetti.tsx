import { useEffect, useRef, useCallback, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface ConfettiProps {
  /** Trigger the confetti burst */
  active: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Number of confetti pieces */
  count?: number;
  /** Duration in ms */
  duration?: number;
  /** Colors to use */
  colors?: string[];
}

const defaultColors = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
];

/**
 * A lightweight canvas-based confetti burst effect.
 * Triggers when `active` becomes true.
 */
export function Confetti({
  active,
  onComplete,
  count = 50,
  duration = 2000,
  colors = defaultColors,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const reducedMotion = useReducedMotion();

  const createPieces = useCallback(() => {
    const pieces: ConfettiPiece[] = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const velocity = 8 + Math.random() * 8;

      pieces.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 5,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    return pieces;
  }, [count, colors]);

  const animate = useCallback(
    (startTime: number, ctx: CanvasRenderingContext2D) => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        onComplete?.();
        return;
      }

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      for (const piece of piecesRef.current) {
        // Update physics
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.3; // gravity
        piece.vx *= 0.99; // air resistance
        piece.rotation += piece.rotationSpeed;
        piece.opacity = 1 - progress;

        // Draw
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate((piece.rotation * Math.PI) / 180);
        ctx.globalAlpha = piece.opacity;
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(() =>
        animate(startTime, ctx)
      );
    },
    [duration, onComplete]
  );

  useEffect(() => {
    if (!active || reducedMotion) {
      if (active && reducedMotion) {
        // Still call onComplete even if we skip animation
        onComplete?.();
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create pieces and start animation
    piecesRef.current = createPieces();
    animate(Date.now(), ctx);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, reducedMotion, createPieces, animate, onComplete]);

  if (!active || reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

/**
 * Hook to easily trigger confetti
 */
export function useConfetti() {
  const [isActive, setIsActive] = useState(false);

  const fire = useCallback(() => {
    setIsActive(true);
  }, []);

  const reset = useCallback(() => {
    setIsActive(false);
  }, []);

  return { isActive, fire, reset };
}
