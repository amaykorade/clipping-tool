import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Short clips from your videos
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Upload long-form video. We transcribe, pick the best moments, and export
          ready-to-post 9:16 clips for Reels, TikTok and YouTube Shorts.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/upload"
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500 sm:w-auto"
          >
            Upload video
          </Link>
        </div>
        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            How it works
          </h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                1
              </span>
              Upload your video (MP4, MOV, AVI, MKV).
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                2
              </span>
              We transcribe and AI picks the best short segments.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                3
              </span>
              Clips are rendered in 9:16 — download and post.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
