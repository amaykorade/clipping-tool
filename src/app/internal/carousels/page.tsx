import { CAROUSELS } from "@/data/carousels";
import SlideRenderer from "@/components/carousel/SlideRenderer";
import Link from "next/link";

/**
 * Internal carousel listing: shows all carousels with thumbnail previews.
 */
export default function CarouselsListPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Carousel Generator</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {CAROUSELS.length} carousels &middot; Click to preview &middot; Run{" "}
          <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
            npm run generate-carousels
          </code>{" "}
          to export PNGs
        </p>
      </div>

      {CAROUSELS.map((carousel) => (
        <div key={carousel.id}>
          <Link
            href={`/internal/carousels/${carousel.id}`}
            className="group block"
          >
            <h2 className="text-lg font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
              {carousel.name}
            </h2>
            <p className="text-sm text-slate-500">{carousel.slides.length} slides</p>
          </Link>

          {/* Horizontal scroll of thumbnails */}
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {carousel.slides.map((slide) => (
              <div
                key={slide.slideNumber}
                className="shrink-0 overflow-hidden rounded-md shadow"
                style={{
                  width: 1080 * 0.2,
                  height: 1350 * 0.2,
                }}
              >
                <div
                  style={{
                    transform: "scale(0.2)",
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
      ))}
    </div>
  );
}
