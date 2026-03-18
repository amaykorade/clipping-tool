import Link from "next/link";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import { PLATFORMS } from "@/data/platforms";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Create Clips for Every Platform — TikTok, Reels, Shorts & More",
  description: "Create optimized video clips for TikTok, Instagram Reels, YouTube Shorts, LinkedIn, Twitter, and Facebook. Right format, right specs, every time.",
  openGraph: {
    title: "Create Clips for Every Platform — TikTok, Reels, Shorts & More",
    description: "Create optimized video clips for TikTok, Instagram Reels, YouTube Shorts, LinkedIn, Twitter, and Facebook.",
    url: `${baseUrl}/clips-for`,
  },
};

export default function PlatformsHub() {
  return (
    <div className="min-h-[calc(100vh-8rem)] -mb-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Create clips for every platform
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          One video, every format. Kllivo renders your clips in the exact specs each platform requires.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => (
          <Link
            key={p.slug}
            href={`/clips-for/${p.slug}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-purple-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-600"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{p.name}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {p.specs.aspectRatio.split(" ")[0]}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {p.specs.bestLength}
              </span>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {p.heroSubline}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-purple-700 transition group-hover:gap-2 dark:text-purple-400">
              View {p.name} guide
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-2xl text-center pb-12">
        <p className="text-slate-600 dark:text-slate-400">
          All platforms, one upload.{" "}
          <Link href="/upload" className="font-medium text-purple-700 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300">
            Try Kllivo free
          </Link>
        </p>
      </div>
    </div>
  );
}
