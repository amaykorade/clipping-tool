import Link from "next/link";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import {
  COMPETITORS,
  KLLIVO_HUB_FEATURES,
  HUB_FEATURE_ROWS,
  HUB_PRICING_ROWS,
} from "@/data/competitors";
import { HubComparisonTable } from "@/components/compare/ComparisonTable";
import { CompetitorCard } from "@/components/compare/CompetitorCard";
import { FAQSection } from "@/components/compare/FAQSection";
import { AnimateIn, AnimateInStagger, StaggerItem } from "@/components/compare/AnimateIn";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "Best AI Video Clipping Tools Compared (2026)",
  description:
    "Compare Kllivo with Opus Clip, Vizard, Klap, Vidyo AI, Descript, Kapwing & GetMunch. Feature-by-feature comparison with pricing, AI capabilities, and language support.",
  keywords: [
    "best ai video clipping tool",
    "opus clip alternative",
    "ai video clip generator",
    "video to shorts",
    "ai video repurposing",
    "klap alternative",
    "vizard alternative",
  ],
  openGraph: {
    title: "Best AI Video Clipping Tools Compared (2026) | Kllivo",
    description:
      "Feature-by-feature comparison of the top AI video clipping tools. Compare pricing, AI capabilities, language support, and more.",
    url: `${baseUrl}/compare`,
  },
};

const hubFaqs = [
  {
    q: "What is the best AI video clipping tool in 2026?",
    a: "It depends on your needs. Kllivo is the best for clip quality — it uses topic-aware semantic segmentation and sentence-boundary cuts. Opus Clip has the most features. Klap is the easiest with YouTube URL paste. Kapwing is the most versatile browser editor. Kllivo also supports 100+ languages, the most in the category.",
  },
  {
    q: "What is the cheapest AI video clipper?",
    a: "Opus Clip starts at $15/mo, Vizard at ~$16/mo, and Kllivo at $19/mo. All offer free plans. Kllivo's free plan lets you process 1 video up to 20 minutes with no clip expiry — Opus Clip's free clips expire after 3 days.",
  },
  {
    q: "Which AI clipper supports the most languages?",
    a: "Kllivo supports 100+ languages through AssemblyAI, the broadest in the category. Kapwing supports 70+ for subtitles. Vidyo AI supports 30+. Opus Clip supports 25+.",
  },
  {
    q: "Do AI video clippers produce good clips?",
    a: "Quality varies significantly. Most tools cut by silence, timestamps, or basic engagement signals — resulting in clips that may mix topics or end mid-sentence. Kllivo uses topic-aware semantic segmentation to ensure each clip covers one complete idea and ends at a natural sentence boundary.",
  },
  {
    q: "Can I use AI clippers for non-English videos?",
    a: "Yes, most support multiple languages. Kllivo leads with 100+ languages. The quality of transcription and clip detection varies by tool and language. English generally has the highest accuracy across all platforms.",
  },
  {
    q: "Are there free AI video clipping tools?",
    a: "Yes. All major tools offer free plans: Kllivo (1 video/mo, no expiry), Opus Clip (60 credits, clips expire in 3 days), Vizard (~30 min/mo), Kapwing (4 min video limit), and others. Free plans typically include a watermark.",
  },
];

export default function ComparePage() {
  const competitorList = COMPETITORS.map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/compare/#webpage`,
        name: "Best AI Video Clipping Tools Compared (2026)",
        description: "Feature-by-feature comparison of the top AI video clipping tools.",
        isPartOf: { "@id": `${baseUrl}/#website` },
        breadcrumb: { "@id": `${baseUrl}/compare/#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/compare/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Compare AI Video Clippers" },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: hubFaqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "SoftwareApplication",
        name: "Kllivo",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "49",
          priceCurrency: "USD",
          offerCount: 3,
        },
      },
    ],
  };

  const stats = [
    { value: "100+", label: "Languages" },
    { value: "8", label: "Tools compared" },
    { value: "$0", label: "Free to start" },
    { value: "0", label: "Clips expired" },
  ];

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
        <span className="font-medium text-slate-900 dark:text-white">Compare</span>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="noise-bg relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-20 text-white sm:px-12 sm:py-28 md:px-16">
        {/* Layered gradient effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(126,34,206,0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(126,34,206,0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        {/* Floating orbs */}
        <div className="animate-float absolute left-[15%] top-[20%] h-2 w-2 rounded-full bg-purple-400/30 blur-sm" />
        <div className="animate-float absolute right-[20%] top-[30%] h-3 w-3 rounded-full bg-purple-300/20 blur-sm" style={{ animationDelay: "1s" }} />
        <div className="animate-float absolute left-[60%] bottom-[25%] h-2.5 w-2.5 rounded-full bg-purple-400/25 blur-sm" style={{ animationDelay: "2s" }} />

        <div className="relative mx-auto max-w-3xl text-center">
          <AnimateIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-glow absolute inline-flex h-full w-full rounded-full bg-purple-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
              </span>
              Updated for 2026
            </div>
          </AnimateIn>

          <AnimateIn delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Best AI Video Clipping{" "}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent animate-shimmer">
                Tools Compared
              </span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={0.2}>
            <p className="mt-6 text-lg leading-relaxed text-slate-300/90 sm:text-xl">
              Kllivo uses topic-aware semantic segmentation to create clips
              that cover complete ideas and never cut mid-sentence. See how it compares to Opus Clip,
              Vizard, Klap, Vidyo AI, Descript, Kapwing, and GetMunch.
            </p>
          </AnimateIn>

          {/* Stats bar */}
          <AnimateIn delay={0.3}>
            <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm sm:px-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold text-white sm:text-2xl">{s.value}</div>
                  <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ─── Feature comparison table ───────────────────────────── */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              Feature comparison
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              How does Kllivo compare?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
              A side-by-side look at the features that matter most for AI video clipping.
            </p>
          </div>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <div className="mt-10">
            <HubComparisonTable rows={HUB_FEATURE_ROWS} competitors={competitorList} />
          </div>
        </AnimateIn>
      </section>

      {/* ─── Pricing comparison table ───────────────────────────── */}
      <section className="mx-auto mt-24 max-w-6xl px-4 sm:mt-32 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Pricing
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Pricing comparison
            </h2>
          </div>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <div className="mt-10">
            <HubComparisonTable rows={HUB_PRICING_ROWS} competitors={competitorList} />
          </div>
        </AnimateIn>
      </section>

      {/* ─── Competitor cards ───────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              Detailed comparisons
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Kllivo vs. each competitor
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
              Dive deeper into how Kllivo compares to each tool.
            </p>
          </div>
        </AnimateIn>
        <AnimateInStagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COMPETITORS.map((c) => (
            <StaggerItem key={c.slug}>
              <CompetitorCard c={c} />
            </StaggerItem>
          ))}
        </AnimateInStagger>
      </section>

      {/* ─── Why Kllivo ─────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <AnimateIn>
          <div className="noise-bg relative overflow-hidden rounded-3xl bg-slate-900 text-white">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_-10%,rgba(126,34,206,0.2),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_90%_100%,rgba(126,34,206,0.15),transparent)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

            <div className="relative px-8 py-14 sm:px-12 sm:py-18">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-300">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Why Kllivo
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                What makes Kllivo different
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-300/90">
                Most AI clippers cut by silence, timestamps, or basic engagement signals. Kllivo
                understands what your content is about.
              </p>

              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {KLLIVO_HUB_FEATURES.highlights.map((h) => (
                  <div
                    key={h.title}
                    className="group rounded-xl border border-white/5 bg-white/5 px-5 py-4 backdrop-blur-sm transition-colors hover:border-purple-500/20 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 transition-colors group-hover:bg-purple-600/30">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                      <div>
                        <p className="font-semibold text-white">{h.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">{h.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              Frequently asked questions
            </h2>
          </div>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <div className="mt-10">
            <FAQSection faqs={hubFaqs} />
          </div>
        </AnimateIn>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6 mb-16">
        <AnimateIn>
          <div className="noise-bg relative overflow-hidden rounded-3xl bg-purple-700 px-8 py-18 text-center text-white sm:px-12 sm:py-22">
            {/* Background effects */}
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
                Upload your first video and get AI-generated clips in minutes. Topic-aware segmentation,
                sentence-boundary cuts, and 100+ languages.
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
