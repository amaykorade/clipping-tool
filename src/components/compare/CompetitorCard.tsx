import Link from "next/link";
import type { Competitor } from "@/data/competitors";

export function CompetitorCard({ c }: { c: Competitor }) {
  return (
    <Link
      href={`/compare/${c.slug}`}
      className="gradient-border group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5 dark:border-slate-700/60 dark:bg-slate-800/80 dark:hover:shadow-purple-500/10"
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/0 to-transparent transition-all duration-300 group-hover:via-purple-400/60" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {c.name}
          </h3>
          <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">
            {c.tagline}
          </p>
        </div>
        {/* Price badge */}
        {c.starterPrice && (
          <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
            ${c.starterPrice}/mo
          </span>
        )}
      </div>

      {/* Advantage highlight */}
      <div className="mt-4 rounded-xl bg-purple-50/60 px-4 py-3 dark:bg-purple-950/20">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
          Kllivo advantage
        </p>
        <p className="mt-1 text-sm leading-snug text-purple-900 dark:text-purple-200">
          {c.kllivoAdvantages[0]}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-purple-700 transition-colors group-hover:text-purple-600 dark:text-purple-400 dark:group-hover:text-purple-300">
        <span>Compare with Kllivo</span>
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </Link>
  );
}
