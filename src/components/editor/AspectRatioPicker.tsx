"use client";

import type { AspectRatio } from "./useEditorState";

const RATIOS: { id: AspectRatio; label: string; icon: string; desc: string }[] = [
  { id: "VERTICAL", label: "9:16", icon: "portrait", desc: "TikTok, Reels, Shorts" },
  { id: "SQUARE", label: "1:1", icon: "square", desc: "Instagram, LinkedIn" },
  { id: "LANDSCAPE", label: "16:9", icon: "landscape", desc: "YouTube, Twitter" },
];

interface AspectRatioPickerProps {
  selected: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}

export function AspectRatioPicker({ selected, onChange }: AspectRatioPickerProps) {
  return (
    <div className="flex gap-2">
      {RATIOS.map((r) => {
        const isSelected = selected === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
              isSelected
                ? "border-purple-500 bg-purple-50 dark:border-purple-600 dark:bg-purple-950/30"
                : "border-slate-200 bg-white hover:border-purple-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-700"
            }`}
          >
            {/* Ratio preview box */}
            <div
              className={`rounded border-2 ${
                isSelected
                  ? "border-purple-500 bg-purple-200 dark:border-purple-400 dark:bg-purple-900/50"
                  : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
              }`}
              style={{
                width: r.id === "VERTICAL" ? 18 : r.id === "SQUARE" ? 24 : 32,
                height: r.id === "VERTICAL" ? 32 : r.id === "SQUARE" ? 24 : 18,
              }}
            />
            <div className="text-center">
              <div
                className={`text-xs font-semibold ${
                  isSelected
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {r.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {r.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
