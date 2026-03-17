"use client";

import { CAPTION_STYLES, type CaptionStyleId } from "./captionStyles";

interface CaptionStylePickerProps {
  selectedStyle: string;
  onStyleChange: (style: CaptionStyleId) => void;
}

export function CaptionStylePicker({
  selectedStyle,
  onStyleChange,
}: CaptionStylePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {CAPTION_STYLES.map((style) => {
        const isSelected = selectedStyle === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onStyleChange(style.id)}
            className={`group relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
              isSelected
                ? "border-purple-500 bg-purple-50 shadow-sm dark:border-purple-600 dark:bg-purple-950/30"
                : "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-700 dark:hover:bg-purple-950/20"
            }`}
          >
            {/* Mini preview */}
            <div className="flex h-14 w-full items-end justify-center overflow-hidden rounded-lg bg-slate-900 p-1.5">
              <div className={`${style.containerClass} scale-[0.45] origin-bottom whitespace-nowrap`}>
                <span className={style.activeWordClass}>Hello</span>{" "}
                <span className={style.inactiveWordClass}>world</span>{" "}
                <span className={style.inactiveWordClass}>demo</span>
              </div>
            </div>

            <div>
              <div
                className={`text-xs font-semibold ${
                  isSelected
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {style.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {style.description}
              </div>
            </div>

            {/* Selected check */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
