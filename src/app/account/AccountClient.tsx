"use client";

import Link from "next/link";
import { useState } from "react";

type Plan = "STARTER" | "PRO";

export default function AccountClient({
  plan,
  periodEnd,
}: {
  plan: Plan;
  periodEnd: Date | null;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You’ll keep access until the end of the current billing period, then switch to the free plan.")) {
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_at_cycle_end: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      setCancelSuccess(true);
      window.location.reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  if (cancelSuccess) {
    return (
      <p className="text-sm text-green-600">
        Subscription will cancel at the end of the billing period.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        You’re on the <strong>{plan}</strong> plan.
        {periodEnd && (
          <> Access until{" "}
            <strong>
              {new Date(periodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </strong>.
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Change plan
        </Link>
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {cancelling ? "Cancelling…" : "Cancel subscription"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Cancelling will stop future charges. You keep your current plan until the end of the billing period.
      </p>
    </div>
  );
}
