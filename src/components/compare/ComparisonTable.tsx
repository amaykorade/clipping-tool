import type { CompetitorFeature } from "@/data/competitors";
import KllivoLogo from "@/components/ui/KllivoLogo";

function CellValue({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </span>
        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Yes</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/60">
          <svg className="h-3 w-3 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </span>
        <span className="text-slate-400 dark:text-slate-500">No</span>
      </span>
    );
  }
  return (
    <span className={highlight ? "font-medium" : ""}>
      {value}
    </span>
  );
}

/** Side-by-side comparison for individual competitor pages */
export function ComparisonTable({
  features,
  competitorName,
}: {
  features: CompetitorFeature[];
  competitorName: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-slate-700/60">
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Feature
            </th>
            <th className="relative px-5 py-4 text-left">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-purple-50/30 dark:from-purple-950/40 dark:to-purple-950/10" />
              <span className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                <KllivoLogo size="sm" showText textClassName="text-xs font-bold uppercase tracking-wider" />
              </span>
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {competitorName}
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((f, i) => (
            <tr
              key={f.name}
              className={`border-b border-slate-100/80 transition-colors hover:bg-slate-50/80 dark:border-slate-700/30 dark:hover:bg-slate-700/30 ${
                i % 2 === 0 ? "bg-white dark:bg-slate-800/80" : "bg-slate-50/40 dark:bg-slate-800/40"
              }`}
            >
              <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                {f.name}
              </td>
              <td className="relative px-5 py-3.5 text-slate-700 dark:text-slate-300">
                <div className="absolute inset-0 bg-purple-50/30 dark:bg-purple-950/10" />
                <span className="relative">
                  <CellValue value={f.kllivo} highlight />
                </span>
              </td>
              <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                <CellValue value={f.competitor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Multi-competitor comparison for hub page */
export function HubComparisonTable({
  rows,
  competitors,
}: {
  rows: { name: string; kllivo: string; values: Record<string, string> }[];
  competitors: { slug: string; name: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-slate-700/60">
            <th className="sticky left-0 z-10 bg-white px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
              Feature
            </th>
            <th className="relative px-5 py-4 text-left">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-purple-50/30 dark:from-purple-950/40 dark:to-purple-950/10" />
              <span className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                <KllivoLogo size="sm" showText textClassName="text-xs font-bold uppercase tracking-wider" />
              </span>
            </th>
            {competitors.map((c) => (
              <th key={c.slug} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap dark:text-slate-400">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.name}
              className={`border-b border-slate-100/80 transition-colors hover:bg-slate-50/80 dark:border-slate-700/30 dark:hover:bg-slate-700/30 ${
                i % 2 === 0 ? "bg-white dark:bg-slate-800/80" : "bg-slate-50/40 dark:bg-slate-800/40"
              }`}
            >
              <td className="sticky left-0 z-10 bg-inherit px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                {row.name}
              </td>
              <td className="relative px-5 py-3.5 whitespace-nowrap">
                <div className="absolute inset-0 bg-purple-50/30 dark:bg-purple-950/10" />
                <span className="relative font-semibold text-purple-700 dark:text-purple-300">
                  {row.kllivo}
                </span>
              </td>
              {competitors.map((c) => (
                <td key={c.slug} className="px-5 py-3.5 text-slate-600 whitespace-nowrap dark:text-slate-400">
                  {row.values[c.slug] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
