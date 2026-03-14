import type { StatsSlide as StatsSlideData } from "@/data/carousels";
import AccentHeading from "../AccentHeading";

/**
 * Stats slide: 2×2 grid of stats in frosted glass cards.
 * Values in massive gradient text, labels in zinc-400.
 */
export default function StatsSlide({ slide }: { slide: StatsSlideData }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      {slide.heading && (
        <AccentHeading
          text={slide.heading}
          accentWords={slide.accentWords}
          className="mb-[48px] text-center text-[48px] font-bold leading-[1.1] tracking-tight text-white"
        />
      )}

      <div className="grid grid-cols-2 gap-[24px]">
        {slide.stats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center rounded-[24px] p-[40px]"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-center text-[80px] font-bold leading-none tracking-tight text-transparent"
              style={{
                textShadow: "0 0 60px rgba(168,85,247,0.3)",
              }}
            >
              {stat.value}
            </div>
            <div
              className="mt-[12px] text-center text-[24px] uppercase tracking-wider"
              style={{ color: "#a1a1aa" }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
