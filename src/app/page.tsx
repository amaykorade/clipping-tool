import Link from "next/link";
import { getBaseUrl } from "@/lib/seo";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const params = await searchParams;
  const showSignInPrompt = params?.upload === "signin";
  const baseUrl = getBaseUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Kllivo",
        description: "Turn long-form video into Reels, TikTok & YouTube Shorts.",
        publisher: { "@id": `${baseUrl}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/#application`,
        name: "Kllivo",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        description: "AI-powered video clip generator. Upload long-form videos, get 9:16 clips for Reels, TikTok and YouTube Shorts.",
        url: baseUrl,
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Kllivo",
        url: baseUrl,
      },
    ],
  };

  const features = [
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      ),
      title: "Upload any long video",
      description: "Podcasts, interviews, webinars, vlogs — MP4, MOV, AVI or MKV up to 3 GB. We handle the rest in the background.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      ),
      title: "AI finds the best moments",
      description: "We transcribe speech, detect topic beats, and score each segment for hook strength and payoff. You get the highlights, not random cuts.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      ),
      title: "9:16 ready to post",
      description: "Clips are cropped, rendered and sized for Reels, TikTok and YouTube Shorts. Download and publish — no extra editing needed.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
        </svg>
      ),
      title: "Complete thoughts, not fragments",
      description: "Every clip starts with a strong hook and ends with a complete idea. No awkward cuts, no mid-sentence endings.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      title: "Background processing",
      description: "Upload and leave. We transcribe and generate clips in the background. Come back when they're ready — no waiting around.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
        </svg>
      ),
      title: "Your library, everywhere",
      description: "Sign in with Google. All your videos and clips are saved in your account and accessible from any device.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Upload your video",
      body: "Add your long-form video — podcast, talk, webinar or vlog. We validate and start processing immediately in the background.",
    },
    {
      step: "02",
      title: "AI transcribes & finds clips",
      body: "We transcribe speech, detect topic beats, and score segments for hook strength and payoff. You get up to 10 clip suggestions.",
    },
    {
      step: "03",
      title: "Review, render & download",
      body: "Review clip suggestions, render the ones you want, and download 9:16 videos ready to post on Reels, TikTok or Shorts.",
    },
  ];

  const useCases = [
    {
      icon: "🎙️",
      title: "Podcasters",
      description: "Turn 60-minute episodes into 10 shareable clips. Grow your audience on short-form without re-recording anything.",
    },
    {
      icon: "🎤",
      title: "Speakers & coaches",
      description: "Repurpose keynotes, workshops and webinars into bite-sized clips that showcase your expertise.",
    },
    {
      icon: "📹",
      title: "YouTubers & vloggers",
      description: "Extract the best moments from long vlogs and tutorials. Drive traffic back to your full videos.",
    },
    {
      icon: "🏢",
      title: "Businesses & brands",
      description: "Turn product demos, interviews and events into social content without a video editing team.",
    },
  ];

  const faqs = [
    {
      q: "What video formats are supported?",
      a: "We support MP4, MOV, AVI and MKV. Files up to 500 MB on the free plan, up to 1.5 GB on Starter, and up to 3 GB on Pro.",
    },
    {
      q: "How long does processing take?",
      a: "Transcription typically takes 2–5 minutes for a 30-minute video. Clip generation happens right after. You can leave the page — we'll keep working.",
    },
    {
      q: "What makes Kllivo different from other clipping tools?",
      a: "Most tools cut by silence or timestamps. Kllivo analyzes the transcript for topic beats, hook strength, and complete ideas — so every clip starts strong and ends at a natural point.",
    },
    {
      q: "Are the clips really ready to post?",
      a: "Yes. We crop and render in 9:16 (1080×1920) for Reels, TikTok and YouTube Shorts. Download and upload directly to your platform.",
    },
    {
      q: "Do I need a credit card to start?",
      a: "No. Sign in with Google and upload your first video for free. No credit card required.",
    },
    {
      q: "Can I use Kllivo for videos in languages other than English?",
      a: "Yes. Our transcription provider supports 100+ languages. Clip scoring and segmentation work on any language.",
    },
  ];

  const stats = [
    { value: "10×", label: "more clips from one video" },
    { value: "< 5 min", label: "average processing time" },
    { value: "9:16", label: "ready for every platform" },
    { value: "100+", label: "languages supported" },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] -mb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {showSignInPrompt && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Please sign in with Google to upload videos. Use the button in the top right to sign in, then try again.
        </div>
      )}

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-20 text-white sm:px-12 sm:py-32 md:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(99,102,241,0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            AI-powered short-form video
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Turn long videos into
            <span className="block bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              viral short clips
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-300 sm:text-xl">
            Upload once. We transcribe, find the best moments with AI, and deliver
            ready-to-post 9:16 clips for Reels, TikTok and YouTube Shorts — in minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 sm:w-auto"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Get started free
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/60 px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-700/60 sm:w-auto"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-sm text-slate-400">
            Free to start · No credit card required · Sign in with Google
          </p>
        </div>
      </section>

      {/* ─── Stats bar ────────────────────────────────────────────── */}
      <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-slate-100">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-4 text-center">
              <span className="text-2xl font-bold text-indigo-600 sm:text-3xl">{s.value}</span>
              <span className="text-xs text-slate-500 sm:text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Everything you need
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            From one video to many clips
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 sm:text-lg">
            No timeline, no guesswork. Upload once and get platform-ready shorts in minutes.
          </p>
        </div>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, i) => (
            <li
              key={i}
              className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                {item.icon}
              </span>
              <h3 className="mt-5 text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Process
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Three steps to ready-to-post clips
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            No editing skills needed. Upload your video and let Kllivo do the work.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((item, i) => (
            <div key={item.step} className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span className="absolute right-0 top-10 hidden -translate-y-1/2 translate-x-1/2 text-slate-300 sm:block" aria-hidden>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                )}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Use cases ────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Who it's for
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Built for creators who publish long-form content
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Whether you're a podcaster, speaker, YouTuber or brand — Kllivo turns your long videos into short-form content automatically.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((uc) => (
            <div key={uc.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-200 hover:shadow-sm transition">
              <span className="text-3xl">{uc.icon}</span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{uc.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{uc.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Why Kllivo (differentiator) ──────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-slate-900 text-white">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="px-8 py-12 sm:px-12 sm:py-16">
              <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Why Kllivo
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                Clips that actually make sense
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Most clipping tools cut by silence or timestamps. Kllivo analyzes the full transcript, detects topic changes, and scores each segment for hook strength and payoff.
              </p>
              <p className="mt-4 leading-relaxed text-slate-300">
                The result: clips that start with a strong opening and end at a natural point — not mid-sentence, not mid-thought.
              </p>
              <Link
                href="/upload"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
              >
                Try it free
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
            <div className="border-t border-slate-700/60 px-8 py-12 sm:px-12 sm:py-16 lg:border-l lg:border-t-0">
              <ul className="space-y-6">
                {[
                  { label: "Topic-aware segmentation", desc: "Clips stay within one idea — no mixing two topics in one clip." },
                  { label: "Hook & payoff scoring", desc: "AI scores each segment for how strong the opening is and whether it ends with a payoff." },
                  { label: "Sentence-boundary cuts", desc: "We never cut mid-sentence. Every clip ends at a natural punctuation point." },
                  { label: "Multi-language support", desc: "Works with 100+ languages including Hindi, Spanish, French and more." },
                ].map((item) => (
                  <li key={item.label} className="flex gap-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-0.5 text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing teaser ───────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Pricing
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Start free. Upgrade when you need more videos and faster processing.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              period: "",
              description: "Try it out",
              features: ["1 video per month", "Up to 20 min per video", "Up to 500 MB", "Watermark on clips"],
              cta: "Get started",
              href: "/upload",
              highlight: false,
            },
            {
              name: "Starter",
              price: "$19",
              period: "/month",
              description: "For creators",
              features: ["10 videos per month", "Up to 60 min per video", "Up to 1.5 GB", "No watermark", "Fast processing"],
              cta: "Start Starter",
              href: "/pricing",
              highlight: true,
            },
            {
              name: "Pro",
              price: "$49",
              period: "/month",
              description: "For power users",
              features: ["25 videos per month", "Up to 3 hours per video", "Up to 3 GB", "No watermark", "Priority processing"],
              cta: "Start Pro",
              href: "/pricing",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border-2 p-6 ${
                plan.highlight
                  ? "border-indigo-500 bg-indigo-50/30 shadow-lg"
                  : "border-slate-200 bg-white"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-500">{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <svg className="h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                  plan.highlight
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          All plans include unlimited clip downloads.{" "}
          <Link href="/pricing" className="text-indigo-600 underline-offset-2 hover:underline">
            See full pricing →
          </Link>
        </p>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-3xl px-4 sm:mt-32 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            FAQ
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Frequently asked questions
          </h2>
        </div>
        <dl className="mt-12 divide-y divide-slate-200">
          {faqs.map((faq) => (
            <div key={faq.q} className="py-6">
              <dt className="text-base font-semibold text-slate-900">{faq.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-indigo-600 px-8 py-16 text-center text-white sm:px-12 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Start turning your videos into clips today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-indigo-100">
              Upload your first video and get clip suggestions in minutes. Free to start — no credit card required.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/upload"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-indigo-600 shadow-lg transition hover:bg-indigo-50 sm:w-auto"
              >
                Upload your first video
              </Link>
              <Link
                href="/pricing"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/50 bg-indigo-500/30 px-8 py-4 text-base font-semibold text-white transition hover:bg-indigo-500/50 sm:w-auto"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="mt-24 sm:mt-32">
        <div className="relative w-screen max-w-none bg-slate-900 px-6 py-16 sm:px-8 sm:py-20 ml-[calc((100vw-100%)/-2)]">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 border-b border-slate-700/60 pb-12 sm:grid-cols-4 sm:pb-14">
              <div className="sm:col-span-2">
                <Link href="/" className="text-xl font-bold tracking-tight text-white">
                  Kllivo
                </Link>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                  Turn long-form videos into short-form clips for Reels, TikTok and YouTube Shorts — powered by AI.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</h4>
                <ul className="mt-4 space-y-3">
                  <li><Link href="/upload" className="text-sm text-slate-400 transition hover:text-white">Upload video</Link></li>
                  <li><Link href="/videos" className="text-sm text-slate-400 transition hover:text-white">My videos</Link></li>
                  <li><Link href="/pricing" className="text-sm text-slate-400 transition hover:text-white">Pricing</Link></li>
                  <li><a href="#how-it-works" className="text-sm text-slate-400 transition hover:text-white">How it works</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</h4>
                <ul className="mt-4 space-y-3">
                  <li><Link href="/account" className="text-sm text-slate-400 transition hover:text-white">Account</Link></li>
                  <li><Link href="/pricing" className="text-sm text-slate-400 transition hover:text-white">Upgrade plan</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-slate-500">
                Long-form to short-form. Reels, TikTok, YouTube Shorts.
              </p>
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} Kllivo. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
