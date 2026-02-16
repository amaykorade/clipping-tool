import Link from "next/link";
import { getSession } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import PricingClient from "./PricingClient";

export default async function PricingPage() {
  const session = await getSession();

  const plans = [
    {
      id: "FREE" as const,
      name: PLAN_LIMITS.FREE.label,
      price: null,
      description: "Try it out",
      maxVideos: PLAN_LIMITS.FREE.maxVideos,
      maxDurationMin: Math.floor(PLAN_LIMITS.FREE.maxDurationSec / 60),
      downloads: "1 download / month",
      watermark: true,
      speed: "Standard",
    },
    {
      id: "STARTER" as const,
      name: PLAN_LIMITS.STARTER.label,
      price: PLAN_LIMITS.STARTER.priceMonthly,
      description: "For creators",
      maxVideos: PLAN_LIMITS.STARTER.maxVideos,
      maxDurationMin: Math.floor(PLAN_LIMITS.STARTER.maxDurationSec / 60),
      downloads: "Unlimited",
      watermark: false,
      speed: "Fast",
    },
    {
      id: "PRO" as const,
      name: PLAN_LIMITS.PRO.label,
      price: PLAN_LIMITS.PRO.priceMonthly,
      description: "For power users",
      maxVideos: PLAN_LIMITS.PRO.maxVideos,
      maxDurationMin: Math.floor(PLAN_LIMITS.PRO.maxDurationSec / 60),
      downloads: "Unlimited",
      watermark: false,
      speed: "Priority",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Simple pricing
        </h1>
        <p className="mt-3 text-slate-600">
          Start free. Upgrade when you need more videos and faster processing.
        </p>
      </header>

      <PricingClient plans={plans} signedIn={!!session?.user} />
    </div>
  );
}
