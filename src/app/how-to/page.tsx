import Link from "next/link";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import { HOW_TO_GUIDES } from "@/data/howTo";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "How-To Guides — Create Short-Form Video Clips",
  description: "Step-by-step guides for turning your long-form videos into short-form clips for TikTok, Instagram Reels, YouTube Shorts, and LinkedIn.",
  openGraph: {
    title: "How-To Guides — Create Short-Form Video Clips",
    description: "Step-by-step guides for turning your long-form videos into short-form clips for TikTok, Instagram Reels, YouTube Shorts, and LinkedIn.",
    url: `${baseUrl}/how-to`,
  },
};

export default function HowToHub() {
  return (
    <div className="min-h-[calc(100vh-8rem)] -mb-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          How-to guides
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          Step-by-step tutorials for turning your videos into short-form clips for every platform.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {HOW_TO_GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/how-to/${guide.slug}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-purple-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-600"
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{guide.title}</h2>
            <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{guide.intro}</p>
            <div className="mt-4 flex items-center gap-1">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-400">{guide.steps.length} steps</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{guide.faqs.length} FAQs</span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700 transition group-hover:gap-2 dark:text-purple-400">
              Read guide
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
