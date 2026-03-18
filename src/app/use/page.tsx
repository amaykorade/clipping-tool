import Link from "next/link";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import { USE_CASES } from "@/data/useCases";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Use Cases — Who Uses Kllivo?",
  description: "See how podcasters, YouTubers, coaches, teachers, and businesses use Kllivo to turn long-form videos into short-form clips for social media.",
  openGraph: {
    title: "Use Cases — Who Uses Kllivo?",
    description: "See how podcasters, YouTubers, coaches, teachers, and businesses use Kllivo to turn long-form videos into short-form clips for social media.",
    url: `${baseUrl}/use`,
  },
};

export default function UseCasesHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/use/#webpage`,
    name: "Kllivo Use Cases",
    description: "Explore how different professionals use Kllivo to repurpose long-form video into short-form social media clips.",
    isPartOf: { "@id": `${baseUrl}/#website` },
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] -mb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Built for creators, educators, and businesses
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          See how people like you use Kllivo to turn long-form videos into short-form content — automatically.
        </p>
      </div>

      {/* Grid */}
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((uc) => (
          <Link
            key={uc.slug}
            href={`/use/${uc.slug}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-purple-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-600"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 transition group-hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:group-hover:bg-purple-900/50">
              <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={uc.iconPath} />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              {uc.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {uc.subtitle}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-purple-700 transition group-hover:gap-2 dark:text-purple-400">
              Learn more
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="mx-auto mt-16 max-w-2xl text-center pb-12">
        <p className="text-slate-600 dark:text-slate-400">
          Don&apos;t see your use case?{" "}
          <Link href="/upload" className="font-medium text-purple-700 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300">
            Try Kllivo free
          </Link>{" "}
          — it works with any video that has speech.
        </p>
      </div>
    </div>
  );
}
