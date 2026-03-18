import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import { getUseCaseBySlug, getAllUseCaseSlugs, USE_CASES } from "@/data/useCases";

const baseUrl = getBaseUrl();

export function generateStaticParams() {
  return getAllUseCaseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const uc = getUseCaseBySlug(slug);
  if (!uc) return {};

  return {
    title: uc.metaTitle,
    description: uc.metaDescription,
    keywords: uc.keywords,
    openGraph: {
      title: uc.metaTitle,
      description: uc.metaDescription,
      url: `${baseUrl}/use/${uc.slug}`,
    },
  };
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uc = getUseCaseBySlug(slug);
  if (!uc) notFound();

  const otherUseCases = USE_CASES.filter((x) => x.slug !== uc.slug).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/use/${uc.slug}/#webpage`,
        name: uc.metaTitle,
        description: uc.metaDescription,
        isPartOf: { "@id": `${baseUrl}/#website` },
        breadcrumb: { "@id": `${baseUrl}/use/${uc.slug}/#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/use/${uc.slug}/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Use Cases", item: `${baseUrl}/use` },
          { "@type": "ListItem", position: 3, name: uc.title },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: uc.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] -mb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">Home</Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <Link href="/use" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">Use Cases</Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <span className="font-medium text-slate-900 dark:text-white">{uc.title}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-white sm:px-12 sm:py-20 md:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(126,34,206,0.4),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 backdrop-blur-sm">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={uc.iconPath} />
            </svg>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {uc.heroHeadline}
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-slate-300/90 sm:text-xl">
            {uc.heroSubline}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500"
            >
              Try Kllivo Free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-slate-400 transition hover:text-white"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="mx-auto mt-16 max-w-4xl px-4 sm:mt-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Sound familiar?
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {uc.painPoints.map((pp, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-sm font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {i + 1}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{pp.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{pp.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How Kllivo Helps */}
      <section className="mx-auto mt-16 max-w-4xl px-4 sm:mt-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          How Kllivo solves this
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {uc.howKllivoHelps.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {i + 1}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3-Step Process */}
      <section className="mx-auto mt-16 max-w-3xl px-4 sm:mt-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Three steps. That&apos;s it.
        </h2>
        <div className="mt-10 space-y-6">
          {[
            { step: "01", title: "Upload your video", body: `Upload your ${uc.title.toLowerCase()} recording — MP4, MOV, AVI, or MKV. Or paste a YouTube URL.` },
            { step: "02", title: "AI finds the best moments", body: "Kllivo transcribes, detects topic changes, and scores each segment for hook strength and audience appeal." },
            { step: "03", title: "Download & post", body: "Review your clips, edit if you want, and download vertical videos ready for Reels, TikTok, and Shorts." },
          ].map((s) => (
            <div key={s.step} className="flex gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-700 text-sm font-bold text-white">
                {s.step}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      {uc.faqs.length > 0 && (
        <section className="mx-auto mt-16 max-w-3xl px-4 sm:mt-20 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Frequently asked questions
          </h2>
          <dl className="mt-10 space-y-4">
            {uc.faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
                <dt className="font-semibold text-slate-900 dark:text-white">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto mt-16 max-w-3xl px-4 text-center sm:mt-20 sm:px-6">
        <div className="rounded-3xl bg-slate-900 px-6 py-12 text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to try it?</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-400">
            Upload your first video for free. No credit card required.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500"
          >
            Get started free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Other Use Cases */}
      <section className="mx-auto mt-16 max-w-4xl px-4 pb-12 sm:mt-20 sm:px-6">
        <h2 className="text-center text-lg font-semibold text-slate-900 dark:text-white">
          Explore other use cases
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {otherUseCases.map((other) => (
            <Link
              key={other.slug}
              href={`/use/${other.slug}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-purple-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-600"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={other.iconPath} />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white">{other.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
