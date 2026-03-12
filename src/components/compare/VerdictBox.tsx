export function VerdictBox({ verdict }: { verdict: string }) {
  // Split verdict into "Choose Kllivo if..." and "Choose X if..." parts
  const parts = verdict.split(/(?=Choose )/g).filter(Boolean);

  return (
    <aside className="relative overflow-hidden rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50 via-white to-purple-50/40 p-6 shadow-sm dark:border-purple-800/60 dark:from-purple-950/40 dark:via-slate-800/80 dark:to-purple-950/20 sm:p-8">
      {/* Decorative glow */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-purple-300/20 blur-3xl dark:bg-purple-600/10" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-200/20 blur-3xl dark:bg-purple-700/10" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-700 shadow-md shadow-purple-700/25">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick verdict</h2>
        </div>

        {parts.length > 1 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {parts.map((part, i) => {
              const isKllivo = part.includes("Kllivo if");
              return (
                <div
                  key={i}
                  className={`rounded-xl p-4 ${
                    isKllivo
                      ? "bg-purple-100/60 ring-1 ring-purple-200/60 dark:bg-purple-900/20 dark:ring-purple-700/40"
                      : "bg-slate-100/60 ring-1 ring-slate-200/60 dark:bg-slate-700/30 dark:ring-slate-600/40"
                  }`}
                >
                  <p className={`text-sm leading-relaxed ${
                    isKllivo
                      ? "text-purple-900 dark:text-purple-200"
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {part.trim()}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-purple-900 dark:text-purple-200">
            {verdict}
          </p>
        )}
      </div>
    </aside>
  );
}
