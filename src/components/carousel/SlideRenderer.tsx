import type { Slide, ComparisonSlide as ComparisonSlideType, StatsSlide as StatsSlideType } from "@/data/carousels";
import SlideChrome from "./SlideChrome";
import HookSlide from "./slides/HookSlide";
import ContentSlide from "./slides/ContentSlide";
import ComparisonSlide from "./slides/ComparisonSlide";
import StatsSlide from "./slides/StatsSlide";
import CTASlide from "./slides/CTASlide";

/**
 * Renders one slide inside the shared chrome wrapper.
 * Dispatches to the appropriate layout component based on slide.type.
 */
export default function SlideRenderer({
  slide,
  totalSlides,
}: {
  slide: Slide;
  totalSlides: number;
}) {
  let content: React.ReactNode;

  switch (slide.type) {
    case "hook":
      content = <HookSlide slide={slide} />;
      break;
    case "comparison":
      content = <ComparisonSlide slide={slide as ComparisonSlideType} />;
      break;
    case "stats":
      content = <StatsSlide slide={slide as StatsSlideType} />;
      break;
    case "cta":
      content = <CTASlide slide={slide} />;
      break;
    case "content":
    default:
      content = <ContentSlide slide={slide} />;
      break;
  }

  return (
    <SlideChrome slideNumber={slide.slideNumber} totalSlides={totalSlides}>
      {content}
    </SlideChrome>
  );
}
