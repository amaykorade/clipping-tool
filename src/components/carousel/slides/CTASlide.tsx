import type { SlideBase } from "@/data/carousels";

/**
 * CTA slide: centered heading, glowing button-style element, URL below.
 * Strongest visual impact — extra glow effects.
 */
export default function CTASlide({ slide }: { slide: SlideBase }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="mb-[48px] max-w-[850px] text-[64px] font-bold leading-[1.05] tracking-tight text-white">
        {slide.heading}
      </h2>

      {/* Glowing button element */}
      <div
        className="mb-[40px] rounded-full px-[64px] py-[28px] text-[32px] font-semibold text-white"
        style={{
          background: "linear-gradient(135deg, #a855f7, #7c3aed)",
          boxShadow:
            "0 0 40px rgba(168,85,247,0.4), 0 0 80px rgba(168,85,247,0.2), 0 0 120px rgba(168,85,247,0.1)",
        }}
      >
        Try Kllivo free →
      </div>

      {slide.body && (
        <p className="text-[28px]" style={{ color: "#71717a" }}>
          {slide.body}
        </p>
      )}
    </div>
  );
}
