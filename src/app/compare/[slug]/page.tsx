import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import {
  getCompetitorBySlug,
  getAllCompetitorSlugs,
  COMPETITORS,
} from "@/data/competitors";
import { ComparisonTable } from "@/components/compare/ComparisonTable";
import { VerdictBox } from "@/components/compare/VerdictBox";
import { FAQSection } from "@/components/compare/FAQSection";
import { AnimateIn, AnimateInStagger, StaggerItem } from "@/components/compare/AnimateIn";
import KllivoLogo from "@/components/ui/KllivoLogo";

const baseUrl = getBaseUrl();

export function generateStaticParams() {
  return getAllCompetitorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompetitorBySlug(slug);
  if (!c) return {};

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${baseUrl}/compare/${c.slug}`,
    },
  };
}

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCompetitorBySlug(slug);
  if (!c) notFound();

  const otherCompetitors = COMPETITORS.filter((x) => x.slug !== c.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/compare/${c.slug}/#webpage`,
        name: c.metaTitle,
        description: c.metaDescription,
        isPartOf: { "@id": `${baseUrl}/#website` },
        breadcrumb: { "@id": `${baseUrl}/compare/${c.slug}/#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/compare/${c.slug}/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Compare",
            item: `${baseUrl}/compare`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `Kllivo vs ${c.name}`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: c.faqs.map((f) => ({
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
        <Link href="/" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">
          Home
        </Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <Link href="/compare" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">
          Compare
        </Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <span className="font-medium text-slate-900 dark:text-white">
          Kllivo vs {c.name}
        </span>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="noise-bg relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-18 text-white sm:px-12 sm:py-24 md:px-16">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(126,34,206,0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_100%_80%,rgba(126,34,206,0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        {/* Floating orbs */}
        <div className="animate-float absolute left-[12%] top-[25%] h-2 w-2 rounded-full bg-purple-400/30 blur-sm" />
        <div className="animate-float absolute right-[18%] top-[35%] h-3 w-3 rounded-full bg-purple-300/20 blur-sm" style={{ animationDelay: "1.5s" }} />

        <div className="relative mx-auto max-w-3xl text-center">
          {/* VS badge */}
          <AnimateIn>
            <div className="mb-8 inline-flex items-center gap-4">
              <KllivoLogo size="lg" className="shadow-lg shadow-purple-600/30 rounded-xl" />
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10 text-xs font-bold text-purple-300 backdrop-blur-sm">VS</span>
              <span className="flex h-10 items-center rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm font-bold text-slate-300 backdrop-blur-sm">{c.name}</span>
            </div>
          </AnimateIn>

          <AnimateIn delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Kllivo vs{" "}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent">
                {c.name}
              </span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={0.2}>
            <p className="mt-6 text-lg leading-relaxed text-slate-300/90 sm:text-xl">
              {c.overview.split("\n\n")[0]}
            </p>
          </AnimateIn>

          {/* Quick price comparison */}
          <AnimateIn delay={0.3}>
            <div className="mx-auto mt-10 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Kllivo</div>
                <div className="mt-0.5 text-lg font-bold text-purple-400">$19<span className="text-sm font-normal text-slate-400">/mo</span></div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">{c.name}</div>
                <div className="mt-0.5 text-lg font-bold text-slate-300">
                  {c.starterPrice ? `~$${c.starterPrice}` : "Free"}
                  <span className="text-sm font-normal text-slate-400">/mo</span>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ─── Verdict ─────────────────────────────────────────────── */}
      <section className="mx-auto mt-14 max-w-3xl px-4 sm:mt-18 sm:px-6">
        <AnimateIn>
          <VerdictBox verdict={c.verdict} />
        </AnimateIn>
      </section>

      {/* ─── Feature comparison table ───────────────────────────── */}
      <section className="mx-auto mt-20 max-w-4xl px-4 sm:mt-28 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              Feature comparison
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              How does Kllivo compare to {c.name}?
            </h2>
          </div>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <div className="mt-10">
            <ComparisonTable features={c.features} competitorName={c.name} />
          </div>
        </AnimateIn>
      </section>

      {/* ─── Pricing comparison ──────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-4xl px-4 sm:mt-32 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Pricing
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Pricing: Kllivo vs {c.name}
            </h2>
          </div>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {/* Kllivo pricing card */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-purple-200/80 bg-gradient-to-br from-purple-50 via-white to-purple-50/30 p-6 shadow-sm dark:border-purple-800/60 dark:from-purple-950/40 dark:via-slate-800/80 dark:to-purple-950/20 sm:p-7">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-purple-200/30 blur-2xl dark:bg-purple-600/10" />
              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <KllivoLogo size="md" className="shadow-md shadow-purple-700/25 rounded-lg" />
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-200">
                    Kllivo
                  </h3>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { plan: "Free", price: "$0/mo" },
                    { plan: "Starter", price: "$19/mo" },
                    { plan: "Pro", price: "$49/mo" },
                  ].map((p) => (
                    <div key={p.plan} className="flex items-baseline justify-between rounded-lg bg-purple-100/40 px-3 py-2 dark:bg-purple-900/20">
                      <span className="text-sm text-purple-700 dark:text-purple-300">{p.plan}</span>
                      <span className="text-sm font-bold text-purple-900 dark:text-purple-100">{p.price}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                  2 months free on annual billing
                </p>
              </div>
            </div>

            {/* Competitor pricing card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80 sm:p-7">
              <div className="relative">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {c.name}
                </h3>
                <div className="mt-5 space-y-3">
                  <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Free</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {c.hasFree ? "$0/mo" : "No free plan"}
                    </span>
                  </div>
                  {c.starterPrice && (
                    <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Starter</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">~${c.starterPrice}/mo</span>
                    </div>
                  )}
                  {c.proPrice && (
                    <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Pro</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">~${c.proPrice}/mo</span>
                    </div>
                  )}
                </div>
                {c.pricingNote && (
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    {c.pricingNote}
                  </p>
                )}
              </div>
            </div>
          </div>
        </AnimateIn>
      </section>

      {/* ─── Detailed analysis ───────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-3xl px-4 sm:mt-32 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Analysis
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Detailed comparison
            </h2>
          </div>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <article className="prose-compare mt-10 space-y-6">
            {c.overview.split("\n\n").map((paragraph, i) => (
              <p
                key={i}
                className={`text-base leading-relaxed ${
                  i === 0
                    ? "text-lg text-slate-800 dark:text-slate-200"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {paragraph}
              </p>
            ))}
          </article>
        </AnimateIn>

        {/* Kllivo advantages */}
        <AnimateIn delay={0.15}>
          <div className="mt-14 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80 sm:p-8">
            <h3 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-700 text-xs font-black text-white shadow-md shadow-purple-700/25">K</span>
              Why choose Kllivo over {c.name}
            </h3>
            <ul className="mt-5 space-y-3">
              {c.kllivoAdvantages.map((adv) => (
                <li
                  key={adv}
                  className="flex gap-3 rounded-lg bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:bg-slate-700/30 dark:text-slate-300"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </span>
                  {adv}
                </li>
              ))}
            </ul>
          </div>
        </AnimateIn>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-3xl px-4 sm:mt-32 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
              FAQ
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Kllivo vs {c.name}: FAQ
            </h2>
          </div>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <div className="mt-10">
            <FAQSection faqs={c.faqs} />
          </div>
        </AnimateIn>
      </section>

      {/* ─── Related comparisons ─────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-4xl px-4 sm:mt-32 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Other comparisons
            </h2>
          </div>
        </AnimateIn>
        <AnimateInStagger className="mt-8 flex flex-wrap justify-center gap-3">
          {otherCompetitors.map((x) => (
            <StaggerItem key={x.slug}>
              <Link
                href={`/compare/${x.slug}`}
                className="group inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-purple-200 hover:text-purple-700 hover:shadow-md hover:shadow-purple-500/5 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-purple-800 dark:hover:text-purple-400"
              >
                Kllivo vs {x.name}
                <svg className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-purple-500 dark:group-hover:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </StaggerItem>
          ))}
          <StaggerItem>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-200/80 bg-purple-50/80 px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition-all hover:bg-purple-100 hover:shadow-md dark:border-purple-800/60 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-950/50"
            >
              View all comparisons
            </Link>
          </StaggerItem>
        </AnimateInStagger>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6 mb-16">
        <AnimateIn>
          <div className="noise-bg relative overflow-hidden rounded-3xl bg-purple-700 px-8 py-18 text-center text-white sm:px-12 sm:py-22">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.18),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_0%_100%,rgba(168,85,247,0.3),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_100%_100%,rgba(168,85,247,0.3),transparent)]" />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Try Kllivo free
              </h2>
              <p className="mt-2 text-lg font-medium text-purple-200">
                No credit card required
              </p>
              <p className="mx-auto mt-4 max-w-xl text-purple-100/90">
                Upload your first video and get AI-generated clips in minutes.
                Topic-aware segmentation, sentence-boundary cuts, and 100+
                languages.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/upload"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-purple-700 shadow-lg shadow-purple-900/20 transition-all hover:bg-purple-50 hover:shadow-xl sm:w-auto"
                >
                  Get started free
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-purple-600/20 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-purple-600/40 hover:border-purple-400/60 sm:w-auto"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </AnimateIn>
      </section>
    </div>
  );
}
