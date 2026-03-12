import Link from "next/link";

export default function CompareNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        Comparison not found
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        We don&apos;t have a comparison page for that tool yet.
      </p>
      <Link
        href="/compare"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-600"
      >
        View all comparisons
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
          />
        </svg>
      </Link>
    </div>
  );
}
