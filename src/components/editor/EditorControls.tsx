"use client";

interface EditorControlsProps {
  isPlaying: boolean;
  currentTime: number;
  startTime: number;
  endTime: number;
  onToggle: () => void;
  onSeekTo: (time: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
}

export function EditorControls({
  isPlaying,
  currentTime,
  startTime,
  endTime,
  onToggle,
  onSeekTo,
}: EditorControlsProps) {
  const duration = endTime - startTime;
  const elapsed = Math.max(0, Math.min(currentTime - startTime, duration));

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      {/* Skip backward 1s */}
      <button
        type="button"
        onClick={() => onSeekTo(currentTime - 1)}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        aria-label="Skip backward 1 second"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
          />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        type="button"
        onClick={onToggle}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-700 text-white shadow-md transition-colors hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Skip forward 1s */}
      <button
        type="button"
        onClick={() => onSeekTo(currentTime + 1)}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        aria-label="Skip forward 1 second"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
          />
        </svg>
      </button>

      {/* Time display */}
      <span className="ml-2 min-w-[120px] text-center font-mono text-sm tabular-nums text-slate-600 dark:text-slate-400">
        {formatTime(elapsed)} / {formatTime(duration)}
      </span>
    </div>
  );
}
