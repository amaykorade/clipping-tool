"use client";

import { useCallback, useRef, useMemo } from "react";
import { TrimHandle } from "./TrimHandle";

interface TimelineProps {
  /** Full padded range start (seconds). */
  rangeStart: number;
  /** Full padded range end (seconds). */
  rangeEnd: number;
  /** Current trim start (seconds). */
  startTime: number;
  /** Current trim end (seconds). */
  endTime: number;
  /** Current playhead position (seconds). */
  currentTime: number;
  /** Waveform peak values (0-1), or null if still loading. */
  peaks: number[] | null;
  /** Callback when trim points change. */
  onTrimChange: (startTime: number, endTime: number) => void;
  /** Callback when user clicks to seek. */
  onSeek: (time: number) => void;
}

function formatTimeLabel(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
}

const MIN_TRIM_DURATION = 1; // seconds

export function Timeline({
  rangeStart,
  rangeEnd,
  startTime,
  endTime,
  currentTime,
  peaks,
  onTrimChange,
  onSeek,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rangeDuration = rangeEnd - rangeStart;

  // Normalize time to 0-1 within the padded range
  const normalize = useCallback(
    (t: number) => (rangeDuration > 0 ? (t - rangeStart) / rangeDuration : 0),
    [rangeStart, rangeDuration],
  );

  // Convert 0-1 position back to seconds
  const denormalize = useCallback(
    (p: number) => rangeStart + p * rangeDuration,
    [rangeStart, rangeDuration],
  );

  const startPos = normalize(startTime);
  const endPos = normalize(endTime);
  const playheadPos = normalize(
    Math.max(startTime, Math.min(endTime, currentTime)),
  );

  const handleLeftDrag = useCallback(
    (pos: number) => {
      const newStart = denormalize(pos);
      const clamped = Math.min(newStart, endTime - MIN_TRIM_DURATION);
      onTrimChange(Math.max(rangeStart, clamped), endTime);
    },
    [denormalize, endTime, rangeStart, onTrimChange],
  );

  const handleRightDrag = useCallback(
    (pos: number) => {
      const newEnd = denormalize(pos);
      const clamped = Math.max(newEnd, startTime + MIN_TRIM_DURATION);
      onTrimChange(startTime, Math.min(rangeEnd, clamped));
    },
    [denormalize, startTime, rangeEnd, onTrimChange],
  );

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const time = denormalize(Math.max(0, Math.min(1, pos)));
      // Clamp seek to within trim bounds
      onSeek(Math.max(startTime, Math.min(endTime, time)));
    },
    [denormalize, startTime, endTime, onSeek],
  );

  // Generate synthetic peaks if waveform not available
  const displayPeaks = useMemo(() => {
    if (peaks && peaks.length > 0) return peaks;
    // Generate a visually plausible synthetic waveform
    const count = 200;
    const synthetic: number[] = [];
    for (let i = 0; i < count; i++) {
      synthetic.push(
        0.3 +
          0.4 * Math.abs(Math.sin(i * 0.15)) +
          0.2 * Math.abs(Math.sin(i * 0.37)),
      );
    }
    return synthetic;
  }, [peaks]);

  return (
    <div className="w-full select-none">
      <div
        ref={containerRef}
        className="relative h-[120px] w-full cursor-pointer overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
        onClick={handleTimelineClick}
        role="slider"
        aria-label="Timeline"
        aria-valuenow={Math.round(currentTime * 10) / 10}
        tabIndex={0}
      >
        {/* Waveform SVG */}
        <svg
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${displayPeaks.length} 100`}
        >
          {displayPeaks.map((peak, i) => {
            const barPos = i / displayPeaks.length;
            const inTrimRegion = barPos >= startPos && barPos <= endPos;
            const barHeight = Math.max(2, peak * 80);
            const y = (100 - barHeight) / 2;

            return (
              <rect
                key={i}
                x={i}
                y={y}
                width={0.7}
                height={barHeight}
                rx={0.3}
                className={
                  inTrimRegion
                    ? "fill-purple-500 dark:fill-purple-400"
                    : "fill-slate-300 dark:fill-slate-600"
                }
                opacity={inTrimRegion ? 1 : 0.3}
              />
            );
          })}
        </svg>

        {/* Dimmed overlay outside trim region - left */}
        <div
          className="pointer-events-none absolute top-0 left-0 bottom-0 bg-slate-900/20 dark:bg-slate-900/40"
          style={{ width: `${startPos * 100}%` }}
        />

        {/* Dimmed overlay outside trim region - right */}
        <div
          className="pointer-events-none absolute top-0 right-0 bottom-0 bg-slate-900/20 dark:bg-slate-900/40"
          style={{ width: `${(1 - endPos) * 100}%` }}
        />

        {/* Trim handles */}
        <TrimHandle
          position={startPos}
          onDrag={handleLeftDrag}
          side="left"
          containerRef={containerRef}
        />
        <TrimHandle
          position={endPos}
          onDrag={handleRightDrag}
          side="right"
          containerRef={containerRef}
        />

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)] dark:bg-purple-300"
          style={{ left: `${playheadPos * 100}%` }}
        />
      </div>

      {/* Time labels */}
      <div className="mt-1.5 flex justify-between px-1 font-mono text-xs text-slate-500 dark:text-slate-400">
        <span>{formatTimeLabel(startTime)}</span>
        <span>{formatTimeLabel(endTime)}</span>
      </div>
    </div>
  );
}
