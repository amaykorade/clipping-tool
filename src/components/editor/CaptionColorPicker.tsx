"use client";

const PRESET_COLORS = [
  { hex: "#c084fc", label: "Purple" },
  { hex: "#facc15", label: "Yellow" },
  { hex: "#34d399", label: "Green" },
  { hex: "#60a5fa", label: "Blue" },
  { hex: "#fb923c", label: "Orange" },
  { hex: "#f87171", label: "Red" },
  { hex: "#f9a8d4", label: "Pink" },
  { hex: "#ffffff", label: "White" },
];

interface CaptionColorPickerProps {
  selectedColor: string;
  onChange: (color: string) => void;
}

export function CaptionColorPicker({
  selectedColor,
  onChange,
}: CaptionColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Highlight
      </span>
      <div className="flex gap-1.5">
        {PRESET_COLORS.map((c) => {
          const isSelected =
            selectedColor.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              onClick={() => onChange(c.hex)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                isSelected
                  ? "scale-110 border-white shadow-md"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </div>
      {/* Custom color input */}
      <label className="relative cursor-pointer" title="Custom color">
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-6 w-6 cursor-pointer opacity-0"
        />
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-slate-400 text-[10px] text-slate-400 dark:border-slate-600 dark:text-slate-500"
        >
          +
        </div>
      </label>
    </div>
  );
}
