import { CAROUSELS } from "@/data/carousels";
import SlideRenderer from "@/components/carousel/SlideRenderer";
import { notFound } from "next/navigation";

/**
 * Puppeteer target: renders all slides for one carousel at full 1080×1350px.
 * Each slide has a data-slide-index attribute for element.screenshot().
 */
export default async function CarouselSlidesPage({
  params,
}: {
  params: Promise<{ carouselId: string }>;
}) {
  const { carouselId } = await params;
  const carousel = CAROUSELS.find((c) => c.id === carouselId);
  if (!carousel) return notFound();

  return (
    <>
      {/* Hide the app navbar and reset layout padding for clean screenshots */}
      <style>{`
        nav, header { display: none !important; }
        main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
      `}</style>
      <div className="flex flex-col items-center gap-[40px] bg-neutral-950 p-[40px]">
        {carousel.slides.map((slide) => (
          <div
            key={slide.slideNumber}
            data-slide-index={slide.slideNumber}
            data-carousel-id={carousel.id}
          >
            <SlideRenderer slide={slide} totalSlides={carousel.slides.length} />
          </div>
        ))}
      </div>
    </>
  );
}

export function generateStaticParams() {
  return CAROUSELS.map((c) => ({ carouselId: c.id }));
}
