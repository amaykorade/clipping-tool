"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { Plan } from "@/lib/plans";
import { useToast } from "@/components/ui/Toast";

export default function AccountClient({
  plan,
  periodEnd,
  cancelledAtPeriodEnd = false,
}: {
  plan: Plan;
  periodEnd: Date | null;
  cancelledAtPeriodEnd?: boolean;
}) {
  const { showToast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setPaymentSuccess(true);
      window.history.replaceState({}, "", "/account");
    }
  }, []);

  async function handleCancel() {
    setCancelling(true);
    setShowCancelModal(false);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_at_cycle_end: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      setCancelSuccess(true);
      showToast("success", "Subscription cancelled. You'll keep access until the end of your billing period.");
    } catch (e) {
      showToast("error", (e as Error).message || "Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  }

  if (cancelSuccess || cancelledAtPeriodEnd) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Subscription will end on{" "}
            {periodEnd
              ? new Date(periodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })
              : "the current period end"}.
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            You'll keep access until then. No further charges will be made.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Change plan
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {paymentSuccess && (
        <div role="alert" aria-live="polite" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-700/50 dark:bg-green-950/40 dark:text-green-300">
          Payment successful! Your plan has been upgraded.
        </div>
      )}
      <p className="text-sm text-slate-600 dark:text-slate-400">
        You're on the <strong className="text-slate-900 dark:text-white">{plan}</strong> plan.
        {periodEnd && (
          <> Access until{" "}
            <strong className="text-slate-900 dark:text-white">
              {new Date(periodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </strong>.
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Change plan
        </Link>
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          disabled={cancelling}
          className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-700/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {cancelling ? "Cancelling..." : "Cancel subscription"}
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Cancelling will stop future charges. You keep your current plan until the end of the billing period.
      </p>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Cancel your subscription?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              You'll keep access until the end of your current billing period
              {periodEnd ? ` (${new Date(periodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })})` : ""}, then switch to the Free plan.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
              >
                Cancel subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
