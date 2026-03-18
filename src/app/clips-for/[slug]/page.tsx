import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import { getPlatformBySlug, getAllPlatformSlugs, PLATFORMS } from "@/data/platforms";

const baseUrl = getBaseUrl();

export function generateStaticParams() {
  return getAllPlatformSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPlatformBySlug(slug);
  if (!p) return {};
  return {
    title: p.metaTitle,
    description: p.metaDescription,
    keywords: p.keywords,
    openGraph: { title: p.metaTitle, description: p.metaDescription, url: `${baseUrl}/clips-for/${p.slug}` },
  };
}

export default async function PlatformPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPlatformBySlug(slug);
  if (!p) notFound();

  const otherPlatforms = PLATFORMS.filter((x) => x.slug !== p.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/clips-for/${p.slug}/#webpage`,
        name: p.metaTitle,
        description: p.metaDescription,
        isPartOf: { "@id": `${baseUrl}/#website` },
        breadcrumb: { "@id": `${baseUrl}/clips-for/${p.slug}/#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/clips-for/${p.slug}/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Platforms", item: `${baseUrl}/clips-for` },
          { "@type": "ListItem", position: 3, name: p.name },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] -mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">Home</Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <Link href="/clips-for" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">Platforms</Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-white sm:px-12 sm:py-18 md:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(126,34,206,0.35),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-300 backdrop-blur-sm">
            {p.name}
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{p.heroHeadline}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300/90">{p.heroSubline}</p>
          <Link href="/upload" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500">
            Create {p.name} clips free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>
      </section>

      {/* Platform specs */}
      <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{p.name} video specs</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Aspect ratio", value: p.specs.aspectRatio },
            { label: "Resolution", value: p.specs.resolution },
            { label: "Max duration", value: p.specs.maxDuration },
            { label: "Best performing length", value: p.specs.bestLength },
          ].map((spec) => (
            <div key={spec.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{spec.label}</div>
              <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{spec.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Best practices */}
      <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{p.name} best practices</h2>
        <ul className="mt-5 space-y-3">
          {p.bestPractices.map((tip, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 dark:border-slate-700 dark:bg-slate-800">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{tip}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How Kllivo helps */}
      <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">How Kllivo makes {p.name} clips easy</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {p.howKllivoHelps.map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{i + 1}</div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
        <dl className="mt-5 space-y-4">
          {p.faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
              <dt className="font-semibold text-slate-900 dark:text-white">{faq.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-14 max-w-3xl px-4 text-center sm:mt-18 sm:px-6">
        <div className="rounded-3xl bg-slate-900 px-6 py-12 text-white sm:px-12">
          <h2 className="text-2xl font-bold">Start creating {p.name} clips</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-400">Upload your first video free. No credit card required.</p>
          <Link href="/upload" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500">
            Get started free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>
      </section>

      {/* Other platforms */}
      <section className="mx-auto mt-14 max-w-4xl px-4 pb-12 sm:mt-18 sm:px-6">
        <h2 className="text-center text-lg font-semibold text-slate-900 dark:text-white">Create clips for other platforms</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {otherPlatforms.map((other) => (
            <Link key={other.slug} href={`/clips-for/${other.slug}`} className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-medium text-slate-900 transition hover:border-purple-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-purple-600">
              {other.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
