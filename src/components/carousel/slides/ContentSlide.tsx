import type { SlideBase } from "@/data/carousels";
import AccentHeading from "../AccentHeading";

/**
 * Content slide: heading + body text inside a frosted glass card.
 * Optional emoji icon, optional bullet list with cyan checkmarks.
 */
export default function ContentSlide({ slide }: { slide: SlideBase }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      {slide.icon && (
        <div className="mb-[24px] text-[56px]">{slide.icon}</div>
      )}

      <AccentHeading
        text={slide.heading}
        accentWords={slide.accentWords}
        className="mb-[40px] text-[56px] font-bold leading-[1.1] tracking-tight text-white"
      />

      {/* Frosted glass card for body content */}
      {(slide.body || slide.bullets) && (
        <div
          className="rounded-[24px] p-[48px]"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {slide.body && (
            <p
              className="text-[30px] leading-[1.6]"
              style={{ color: "#a1a1aa" }}
            >
              {slide.body}
            </p>
          )}

          {slide.bullets && (
            <ul className={slide.body ? "mt-[32px] space-y-[20px]" : "space-y-[20px]"}>
              {slide.bullets.map((item, i) => (
                <li key={i} className="flex items-start gap-[16px]">
                  <svg
                    className="mt-[6px] h-[24px] w-[24px] shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="#06b6d4"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    className="text-[28px] leading-[1.5]"
                    style={{ color: "#d4d4d8" }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
