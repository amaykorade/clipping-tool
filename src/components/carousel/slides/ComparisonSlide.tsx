import type { ComparisonSlide as ComparisonSlideData } from "@/data/carousels";
import AccentHeading from "../AccentHeading";

/**
 * Comparison slide: two frosted glass cards side by side.
 * Left = "other tools" (dim/red), Right = "Kllivo" (cyan glow).
 */
export default function ComparisonSlide({
  slide,
}: {
  slide: ComparisonSlideData;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <AccentHeading
        text={slide.heading}
        accentWords={slide.accentWords}
        className="mb-[48px] text-center text-[52px] font-bold leading-[1.1] tracking-tight text-white"
      />

      <div className="flex gap-[28px]">
        {/* Left card — "other tools" */}
        <div
          className="flex-1 rounded-[24px] p-[40px]"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="mb-[28px] text-[26px] font-semibold uppercase tracking-wider"
            style={{ color: "#71717a" }}
          >
            {slide.left.label}
          </div>
          <ul className="space-y-[24px]">
            {slide.left.items.map((item, i) => (
              <li key={i} className="flex items-start gap-[14px]">
                <span className="mt-[4px] text-[22px]">
                  {item.good ? "✅" : "❌"}
                </span>
                <span
                  className="text-[26px] leading-[1.5]"
                  style={{ color: item.good ? "#d4d4d8" : "#71717a" }}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right card — "Kllivo" with cyan glow */}
        <div
          className="flex-1 rounded-[24px] p-[40px]"
          style={{
            background: "rgba(6,182,212,0.05)",
            border: "1px solid rgba(6,182,212,0.2)",
            boxShadow: "0 0 40px rgba(6,182,212,0.1)",
          }}
        >
          <div
            className="mb-[28px] text-[26px] font-semibold uppercase tracking-wider"
            style={{ color: "#06b6d4" }}
          >
            {slide.right.label}
          </div>
          <ul className="space-y-[24px]">
            {slide.right.items.map((item, i) => (
              <li key={i} className="flex items-start gap-[14px]">
                <span className="mt-[4px] text-[22px]">
                  {item.good ? "✅" : "❌"}
                </span>
                <span
                  className="text-[26px] leading-[1.5]"
                  style={{ color: "#d4d4d8" }}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
