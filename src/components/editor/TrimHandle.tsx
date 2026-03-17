"use client";

import { useCallback, useRef } from "react";

interface TrimHandleProps {
  /** 0-1 normalized position within the timeline. */
  position: number;
  /** Called with new 0-1 normalized position during drag. */
  onDrag: (newPosition: number) => void;
  side: "left" | "right";
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function TrimHandle({
  position,
  onDrag,
  side,
  containerRef,
}: TrimHandleProps) {
  const dragging = useRef(false);

  const getPositionFromPointer = useCallback(
    (clientX: number): number => {
      const container = containerRef.current;
      if (!container) return position;
      const rect = container.getBoundingClientRect();
      const raw = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(1, raw));
    },
    [containerRef, position],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const pos = getPositionFromPointer(e.clientX);
      onDrag(pos);
    },
    [getPositionFromPointer, onDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [],
  );

  return (
    <div
      className="absolute top-0 bottom-0 z-20 flex cursor-col-resize touch-none select-none items-center"
      style={{
        left: `${position * 100}%`,
        transform: side === "left" ? "translateX(-100%)" : "translateX(0)",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      aria-label={side === "left" ? "Trim start" : "Trim end"}
      aria-valuenow={Math.round(position * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
    >
      <div className="flex h-full w-3 flex-col items-center justify-center rounded-sm bg-purple-600 shadow-md">
        {/* Grip lines */}
        <span className="my-0.5 h-px w-1.5 rounded-full bg-white/70" />
        <span className="my-0.5 h-px w-1.5 rounded-full bg-white/70" />
        <span className="my-0.5 h-px w-1.5 rounded-full bg-white/70" />
      </div>
    </div>
  );
}
