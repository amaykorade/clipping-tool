import { CAROUSELS } from "@/data/carousels";
import SlideRenderer from "@/components/carousel/SlideRenderer";
import { notFound } from "next/navigation";
import Link from "next/link";

/**
 * Single carousel preview: all slides at 0.4× scale.
 */
export default async function CarouselDetailPage({
  params,
}: {
  params: Promise<{ carouselId: string }>;
}) {
  const { carouselId } = await params;
  const carousel = CAROUSELS.find((c) => c.id === carouselId);
  if (!carousel) return notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/internal/carousels"
          className="text-sm text-purple-600 hover:underline dark:text-purple-400"
        >
          ← All carousels
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{carousel.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{carousel.caption}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {carousel.hashtags.map((h) => (
            <span
              key={h}
              className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        {carousel.slides.map((slide) => (
          <div
            key={slide.slideNumber}
            className="overflow-hidden rounded-lg shadow-lg"
            style={{
              width: 1080 * 0.4,
              height: 1350 * 0.4,
            }}
          >
            <div
              style={{
                transform: "scale(0.4)",
                transformOrigin: "top left",
                width: 1080,
                height: 1350,
              }}
            >
              <SlideRenderer
                slide={slide}
                totalSlides={carousel.slides.length}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return CAROUSELS.map((c) => ({ carouselId: c.id }));
}
