import type { SlideBase } from "@/data/carousels";
import AccentHeading from "../AccentHeading";

/**
 * Hook slide: massive centered heading dominating the canvas.
 * Optional emoji icon above, optional subtitle below.
 */
export default function HookSlide({ slide }: { slide: SlideBase }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {slide.icon && (
        <div className="mb-[32px] text-[64px]">{slide.icon}</div>
      )}

      <AccentHeading
        text={slide.heading}
        accentWords={slide.accentWords}
        className="text-[80px] font-bold leading-[1.05] tracking-tight text-white"
      />

      {slide.body && (
        <p
          className="mt-[32px] max-w-[800px] text-[32px] leading-relaxed"
          style={{ color: "#a1a1aa" }}
        >
          {slide.body}
        </p>
      )}
    </div>
  );
}
