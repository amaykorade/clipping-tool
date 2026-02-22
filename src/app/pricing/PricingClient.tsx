"use client";

import Link from "next/link";
import { useState } from "react";

type PlanId = "FREE" | "STARTER" | "PRO";

type PlanRow = {
  id: PlanId;
  name: string;
  price: number | null;
  description: string;
  maxVideos: number;
  maxDurationMin: number;
  downloads: string;
  watermark: boolean;
  speed: string;
  popular?: boolean;
};

export default function PricingClient({
  plans,
  signedIn,
}: {
  plans: PlanRow[];
  signedIn: boolean;
}) {
  const [loading, setLoading] = useState<PlanId | null>(null);

  async function handleUpgrade(plan: PlanId) {
    if (plan === "FREE") return;
    setLoading(plan);
    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.shortUrl) {
        window.location.href = data.shortUrl;
        return;
      }
      throw new Error("No checkout URL");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {plans.map((p) => (
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
            <div className="mt-4 flex items-baseline gap-1">
              {p.price != null ? (
                <>
                  <span className="text-3xl font-bold text-slate-900">₹{p.price}</span>
                  <span className="text-slate-500">/month</span>
                </>
              ) : (
                <span className="text-3xl font-bold text-slate-900">Free</span>
              )}
            </div>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li>{p.maxVideos} video{p.maxVideos !== 1 ? "s" : ""} max</li>
              <li>Up to {p.maxDurationMin} min per video</li>
              <li>{p.downloads}</li>
              <li>{p.watermark ? "Watermark on clips" : "No watermark"}</li>
              <li>Processing: {p.speed}</li>
            </ul>
            <div className="mt-8">
              {p.id === "FREE" ? (
                <Link
                  href={signedIn ? "/upload" : "/"}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {signedIn ? "Use free plan" : "Get started"}
                </Link>
              ) : signedIn ? (
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
                  {loading === p.id ? "Redirecting…" : `Upgrade to ${p.name}`}
                </button>
              ) : (
                <Link
                  href="/"
                  className="block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Sign in to upgrade
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
