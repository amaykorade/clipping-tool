export function FAQSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <dl className="space-y-3">
      {faqs.map((faq, i) => (
        <details
          key={faq.q}
          className="group rounded-xl border border-slate-200/80 bg-white transition-all duration-200 open:bg-slate-50/50 open:shadow-sm hover:border-slate-300/80 dark:border-slate-700/60 dark:bg-slate-800/60 dark:open:bg-slate-800/80 dark:hover:border-slate-600/60"
        >
          <summary className="flex cursor-pointer items-center gap-4 px-5 py-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100/80 text-xs font-bold text-purple-700 transition-colors group-open:bg-purple-700 group-open:text-white dark:bg-purple-900/40 dark:text-purple-400 dark:group-open:bg-purple-600 dark:group-open:text-white">
              {i + 1}
            </span>
            <span className="flex-1 text-[15px] font-semibold text-slate-900 dark:text-white">
              {faq.q}
            </span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 transition-all group-open:rotate-180 group-open:bg-purple-100 dark:bg-slate-700/60 dark:group-open:bg-purple-900/40">
              <svg
                className="h-4 w-4 text-slate-500 transition-colors group-open:text-purple-600 dark:text-slate-400 dark:group-open:text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </summary>
          <dd className="faq-answer px-5 pb-5 pl-16 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {faq.a}
          </dd>
        </details>
      ))}
    </dl>
  );
}
