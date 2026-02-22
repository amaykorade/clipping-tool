"use client";

import Link from "next/link";
import { useState } from "react";

type PlanId = "FREE" | "STARTER" | "PRO";
type BillingPeriod = "monthly" | "yearly";

type PlanRow = {
  id: PlanId;
  name: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  description: string;
  maxVideos: number;
  maxDurationMin: number;
  watermark: boolean;
  speed: string;
  popular?: boolean;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PLAN_RANK: Record<PlanId, number> = { FREE: 0, STARTER: 1, PRO: 2 };

export default function PricingClient({
  plans,
  signedIn,
  currentPlan = "FREE",
}: {
  plans: PlanRow[];
  signedIn: boolean;
  currentPlan?: PlanId;
}) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState<PlanId | null>(null);

  async function handleUpgrade(plan: PlanId) {
    if (plan === "FREE") return;
    setLoading(plan);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway. Please try again.");

      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subscription");

      const { subscriptionId } = data;
      if (!subscriptionId) throw new Error("No subscription ID returned");

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscriptionId,
        name: "Kllivo",
        description: `${plan.charAt(0) + plan.slice(1).toLowerCase()} Plan — ${billing === "yearly" ? "Annual" : "Monthly"}`,
        handler: function () {
          window.location.href = "/account?payment=success";
        },
        modal: {
          ondismiss: function () {
            setLoading(null);
          },
        },
        theme: { color: "#4f46e5" },
      });

      rzp.on("payment.failed", function () {
        alert("Payment failed. Please try again.");
        setLoading(null);
      });

      rzp.open();
    } catch (e) {
      alert((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <div>
      {/* Monthly / Yearly toggle */}
      <div className="mb-10 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            billing === "monthly"
              ? "bg-indigo-600 text-white shadow"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
            billing === "yearly"
              ? "bg-indigo-600 text-white shadow"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Yearly
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              billing === "yearly"
                ? "bg-white/20 text-white"
                : "bg-green-100 text-green-700"
            }`}
          >
            Save 33%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((p) => {
          const price = billing === "yearly" ? p.priceYearly : p.priceMonthly;
          const monthlyEquiv =
            billing === "yearly" && p.priceYearly != null
              ? Math.round((p.priceYearly / 12) * 100) / 100
              : null;

          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border-2 p-6 ${
                p.popular
                  ? "border-indigo-500 bg-indigo-50/30 shadow-lg"
                  : "border-slate-200 bg-white"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{p.description}</p>

                {/* Price display */}
                <div className="mt-4">
                  {price != null ? (
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">${price}</span>
                        <span className="text-slate-500">
                          /{billing === "yearly" ? "yr" : "mo"}
                        </span>
                      </div>
                      {monthlyEquiv != null && (
                        <p className="mt-0.5 text-sm text-green-600 font-medium">
                          ${monthlyEquiv}/mo — 2 months free
                        </p>
                      )}
                      {billing === "yearly" && p.priceMonthly != null && (
                        <p className="text-xs text-slate-400 line-through">
                          ${p.priceMonthly * 12}/yr billed monthly
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-3xl font-bold text-slate-900">Free</span>
                  )}
                </div>

                <ul className="mt-6 space-y-2 text-sm text-slate-700">
                  <li>{p.maxVideos} video{p.maxVideos !== 1 ? "s" : ""} max</li>
                  <li>Up to {p.maxDurationMin} min per video</li>
                  <li>Unlimited clip downloads</li>
                  <li>{p.watermark ? "Watermark on clips" : "No watermark"}</li>
                  <li>Processing: {p.speed}</li>
                </ul>

                <div className="mt-8">
                  {!signedIn ? (
                    <Link
                      href="/"
                      className="block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                      Sign in to get started
                    </Link>
                  ) : p.id === currentPlan ? (
                    <div className="flex w-full items-center justify-center rounded-xl border-2 border-indigo-500 py-3 text-sm font-semibold text-indigo-600">
                      Current plan
                    </div>
                  ) : p.id === "FREE" ? (
                    <Link
                      href="/account"
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                    >
                      Downgrade to Free
                    </Link>
                  ) : PLAN_RANK[p.id] > PLAN_RANK[currentPlan] ? (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(p.id)}
                      disabled={loading !== null}
                      className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition ${
                        p.popular
                          ? "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70"
                          : "bg-slate-800 hover:bg-slate-700 disabled:opacity-70"
                      }`}
                    >
                      {loading === p.id ? "Opening payment…" : `Upgrade to ${p.name}`}
                    </button>
                  ) : (
                    <Link
                      href="/account"
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                    >
                      Downgrade to {p.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
