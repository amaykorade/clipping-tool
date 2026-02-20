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
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-20 text-white sm:px-12 sm:py-28 md:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.35),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-indigo-300">
            Long-form → Short-form
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Turn your videos into
            <span className="block text-indigo-400">clip-ready shorts</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-300 sm:text-xl">
            Upload once. We transcribe, find the best moments with AI, and give you
            ready-to-post 9:16 clips for Reels, TikTok and YouTube Shorts.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 sm:w-auto"
            >
              Get started — Upload video
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-500 bg-slate-800/50 px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-700/50 sm:w-auto"
            >
              How it works
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Sign in with Google to save your projects and access them anywhere.
          </p>
        </div>
      </section>

      {/* Features — What you get */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-indigo-700">
            What you get
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            From one video to many clips
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 sm:text-lg">
            No timeline, no guesswork. Upload once and get platform-ready shorts in minutes.
          </p>
        </div>
        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-8">
          {[
            {
              title: "Upload any long video",
              description: "Podcasts, talks, vlogs — MP4, MOV, AVI or MKV up to 500MB. We validate and process in the background.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              ),
            },
            {
              title: "AI finds the best moments",
              description: "Transcription, topic beats, and one clear idea per clip. We score hooks and payoffs so you get the highlights.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              ),
            },
            {
              title: "9:16 ready to post",
              description: "Clips are cropped and rendered for Reels, TikTok and Shorts. Download and publish without extra editing.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              ),
            },
            {
              title: "Your library, everywhere",
              description: "Sign in with Google. All videos and clips stay in your account and sync across devices.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
              ),
            },
          ].map((item, i) => (
            <li
              key={i}
              className="group relative flex flex-col rounded-xl border border-slate-200/80 bg-white p-6 transition hover:border-slate-300 hover:bg-slate-50/50 sm:p-7"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 transition group-hover:border-indigo-200 group-hover:bg-indigo-100">
                {item.icon}
              </span>
              <h3 className="mt-5 text-base font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-indigo-600">
          Process
        </p>
        <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          How it works
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
          Three steps from upload to ready-to-post clips.
        </p>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Upload",
              body: "Add your video and a title. We validate the file and start processing in the background. You can leave the page — we’ll keep working.",
            },
            {
              step: "02",
              title: "Transcribe & segment",
              body: "We transcribe speech, detect topic beats, and build clip candidates (about 25–70 seconds each, one idea per clip).",
            },
            {
              step: "03",
              title: "Review & download",
              body: "AI scores hooks and payoffs. You get a shortlist of clips; we render them in 9:16. Download and post to Reels, TikTok or Shorts.",
            },
          ].map((item) => (
            <div key={item.step} className="relative flex flex-col">
              <span className="text-4xl font-bold tracking-tight text-slate-200">
                {item.step}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {item.body}
              </p>
              {item.step !== "03" && (
                <span className="absolute -right-4 top-8 hidden text-slate-200 sm:block" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-24 max-w-3xl px-4 sm:mt-32 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-8 py-16 text-center sm:px-12 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ready to turn one video into many clips?
          </h2>
          <p className="mt-4 text-slate-600">
            Upload your first video and get clip suggestions in minutes. No credit card required to start.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500 sm:w-auto"
            >
              Upload video
            </Link>
            <Link
              href="/pricing"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — full viewport width (break out of main’s padding) */}
      <footer className="mt-24 sm:mt-32">
        <div className="relative w-screen max-w-none bg-slate-900 px-6 py-14 sm:px-8 sm:py-16 ml-[calc((100vw-100%)/-2)]">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center gap-10 border-b border-slate-700/60 pb-12 sm:flex-row sm:items-start sm:justify-between sm:pb-14">
              <Link href="/" className="text-xl font-semibold tracking-tight text-white">
                Kllivo
              </Link>
              <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1 sm:justify-end">
                <Link href="/upload" className="text-sm text-slate-400 transition hover:text-white">Upload</Link>
                <Link href="/videos" className="text-sm text-slate-400 transition hover:text-white">My videos</Link>
                <Link href="/pricing" className="text-sm text-slate-400 transition hover:text-white">Pricing</Link>
                <Link href="/" className="text-sm text-slate-400 transition hover:text-white">Home</Link>
                <a href="#how-it-works" className="text-sm text-slate-400 transition hover:text-white">How it works</a>
              </nav>
            </div>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-sm text-slate-500 sm:text-left">
                Long-form to short-form. Reels, TikTok, YouTube Shorts.
              </p>
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} Kllivo
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
