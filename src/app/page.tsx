import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const params = await searchParams;
  const showSignInPrompt = params?.upload === "signin";

  return (
    <div className="min-h-[calc(100vh-8rem)]">
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

      {/* Features */}
      <section className="mt-24 sm:mt-32">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          From one video to many clips
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          No editing timeline. No guessing where to cut. We do the heavy lifting.
        </p>
        <ul className="mx-auto mt-14 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Upload any long video",
              description: "Podcast, talk, vlog — MP4, MOV, AVI or MKV up to 500MB.",
              icon: "📤",
            },
            {
              title: "AI finds the best moments",
              description: "Transcription + semantic beats. We pick hooks, payoffs and one clear idea per clip.",
              icon: "✨",
            },
            {
              title: "9:16 ready in one click",
              description: "Clips are cropped and rendered for Reels, TikTok and Shorts. Download and post.",
              icon: "📱",
            },
            {
              title: "Saved to your account",
              description: "Sign in with Google. All your videos and clips in one place, on any device.",
              icon: "🔐",
            },
          ].map((item, i) => (
            <li
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <span className="text-2xl" aria-hidden>{item.icon}</span>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mt-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:mt-32 sm:p-12">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          How it works
        </h2>
        <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-10 sm:flex-row sm:gap-8">
          {[
            {
              step: "1",
              title: "Upload",
              body: "Drop your video and add a title. We validate the file and start processing.",
            },
            {
              step: "2",
              title: "Transcribe & segment",
              body: "We transcribe speech, detect topic beats, and build clip candidates (25–70s, one idea each).",
            },
            {
              step: "3",
              title: "Pick & render",
              body: "AI scores hooks and payoffs. You get a shortlist of clips; we render them in 9:16. Download and post.",
            },
          ].map((item) => (
            <div key={item.step} className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                {item.step}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 text-center sm:mt-32">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Ready to turn one video into many clips?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          Upload your first video and get clip suggestions in minutes.
        </p>
        <Link
          href="/upload"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          Upload video
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-24 border-t border-slate-200 py-8 sm:mt-32">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-semibold text-slate-700">Clipflow</span>
          <nav className="flex gap-6 text-sm text-slate-500">
            <Link href="/upload" className="transition hover:text-slate-900">
              Upload
            </Link>
            <Link href="/videos" className="transition hover:text-slate-900">
              My videos
            </Link>
          </nav>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400 sm:text-left">
          Long-form to short-form. Reels, TikTok, YouTube Shorts.
        </p>
      </footer>
    </div>
  );
}
