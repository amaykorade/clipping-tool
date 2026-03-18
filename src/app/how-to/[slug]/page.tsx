import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import { getHowToBySlug, getAllHowToSlugs, HOW_TO_GUIDES } from "@/data/howTo";

const baseUrl = getBaseUrl();

export function generateStaticParams() {
  return getAllHowToSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getHowToBySlug(slug);
  if (!guide) return {};
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    keywords: guide.keywords,
    openGraph: { title: guide.metaTitle, description: guide.metaDescription, url: `${baseUrl}/how-to/${guide.slug}` },
  };
}

export default async function HowToPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getHowToBySlug(slug);
  if (!guide) notFound();

  const otherGuides = HOW_TO_GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/how-to/${guide.slug}/#webpage`,
        name: guide.metaTitle,
        description: guide.metaDescription,
        isPartOf: { "@id": `${baseUrl}/#website` },
        breadcrumb: { "@id": `${baseUrl}/how-to/${guide.slug}/#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/how-to/${guide.slug}/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "How-To Guides", item: `${baseUrl}/how-to` },
          { "@type": "ListItem", position: 3, name: guide.title },
        ],
      },
      {
        "@type": "HowTo",
        name: guide.title,
        description: guide.intro,
        step: guide.steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.title,
          text: s.description,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((f) => ({
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
        <Link href="/how-to" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">How-To Guides</Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <span className="font-medium text-slate-900 dark:text-white">{guide.title}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-white sm:px-12 sm:py-18 md:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(126,34,206,0.35),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-300 backdrop-blur-sm">
            Step-by-step guide
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300/90">{guide.intro}</p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
        <div className="space-y-5">
          {guide.steps.map((step, i) => (
            <div key={i} className="flex gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-700 text-sm font-bold text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">{step.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      {guide.tips.length > 0 && (
        <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pro tips</h2>
          <ul className="mt-5 space-y-3">
            {guide.tips.map((tip, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 dark:border-slate-700 dark:bg-slate-800">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{tip}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {guide.faqs.length > 0 && (
        <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
          <dl className="mt-5 space-y-4">
            {guide.faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
                <dt className="font-semibold text-slate-900 dark:text-white">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto mt-14 max-w-3xl px-4 text-center sm:mt-18 sm:px-6">
        <div className="rounded-3xl bg-slate-900 px-6 py-12 text-white sm:px-12">
          <h2 className="text-2xl font-bold">Ready to try it yourself?</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-400">Upload your first video free. No credit card required.</p>
          <Link href="/upload" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500">
            Get started free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>
      </section>

      {/* More guides */}
      <section className="mx-auto mt-14 max-w-4xl px-4 pb-12 sm:mt-18 sm:px-6">
        <h2 className="text-center text-lg font-semibold text-slate-900 dark:text-white">More how-to guides</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {otherGuides.map((g) => (
            <Link key={g.slug} href={`/how-to/${g.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-purple-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-600">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{g.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{g.intro}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
