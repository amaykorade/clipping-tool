"use client";

import type { CropMode } from "./useEditorState";

const MODES: { id: CropMode; label: string; desc: string }[] = [
  { id: "FILL", label: "Fill", desc: "Crop to fill frame" },
  { id: "FIT", label: "Fit", desc: "Fit with blurred bg" },
];

interface CropModePickerProps {
  selected: CropMode;
  onChange: (mode: CropMode) => void;
}

export function CropModePicker({ selected, onChange }: CropModePickerProps) {
  return (
    <div className="flex gap-2">
      {MODES.map((m) => {
        const isSelected = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
              isSelected
                ? "border-purple-500 bg-purple-50 dark:border-purple-600 dark:bg-purple-950/30"
                : "border-slate-200 bg-white hover:border-purple-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-700"
            }`}
          >
            {/* Mode preview icon */}
            <div className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
              {m.id === "FILL" ? (
                /* Filled rectangle — content fills the frame */
                <div
                  className={`rounded-sm ${
                    isSelected
                      ? "bg-purple-500 dark:bg-purple-400"
                      : "bg-slate-400 dark:bg-slate-500"
                  }`}
                  style={{ width: 18, height: 32 }}
                />
              ) : (
                /* Letterboxed — content with blurred bars */
                <div
                  className={`flex flex-col items-center justify-center rounded-sm ${
                    isSelected
                      ? "bg-purple-200 dark:bg-purple-900/50"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                  style={{ width: 18, height: 32 }}
                >
                  <div
                    className={`rounded-[1px] ${
                      isSelected
                        ? "bg-purple-500 dark:bg-purple-400"
                        : "bg-slate-400 dark:bg-slate-500"
                    }`}
                    style={{ width: 16, height: 10 }}
                  />
                </div>
              )}
            </div>
            <div className="text-center">
              <div
                className={`text-xs font-semibold ${
                  isSelected
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {m.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {m.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
