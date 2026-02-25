import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { formatFileSize, PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/db";
import PricingClient from "./PricingClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple pricing for Kllivo. Start free, upgrade for more videos and faster processing. Reels, TikTok & YouTube Shorts.",
  openGraph: {
    title: "Pricing | Kllivo",
    description:
      "Start free. Upgrade when you need more videos and faster processing.",
  },
};

export default async function PricingPage() {
  const session = await getSession();

  let currentPlan: "FREE" | "STARTER" | "PRO" = "FREE";
  let currentBilling: "monthly" | "yearly" | null = null;
  if (session?.user?.id) {
    const rows = await prisma.$queryRaw<{ plan: string; billingInterval: string | null }[]>`
      SELECT plan, "billingInterval" FROM "User" WHERE id = ${session.user.id}
    `;
    const row = rows?.[0];
    const p = String(row?.plan ?? "").trim().toUpperCase();
    if (p === "STARTER" || p === "PRO") {
      currentPlan = p;
      const bi = String(row?.billingInterval ?? "").trim().toLowerCase();
      if (bi === "monthly" || bi === "yearly") currentBilling = bi;
    }
  }

  const plans = [
    {
      id: "FREE" as const,
      name: PLAN_LIMITS.FREE.label,
      priceMonthly: null as number | null,
      priceYearly: null as number | null,
      description: "Try it out",
      maxVideos: PLAN_LIMITS.FREE.maxVideos,
      maxDurationMin: Math.floor(PLAN_LIMITS.FREE.maxDurationSec / 60),
      maxUploadLabel: formatFileSize(PLAN_LIMITS.FREE.maxUploadSizeMB * 1024 * 1024),
      watermark: true,
      speed: "Standard",
      popular: false,
    },
    {
      id: "STARTER" as const,
      name: PLAN_LIMITS.STARTER.label,
      priceMonthly: PLAN_LIMITS.STARTER.priceMonthly,
      priceYearly: PLAN_LIMITS.STARTER.priceYearly,
      description: "For creators",
      maxVideos: PLAN_LIMITS.STARTER.maxVideos,
      maxDurationMin: Math.floor(PLAN_LIMITS.STARTER.maxDurationSec / 60),
      maxUploadLabel: formatFileSize(PLAN_LIMITS.STARTER.maxUploadSizeMB * 1024 * 1024),
      watermark: false,
      speed: "Fast",
      popular: true,
    },
    {
      id: "PRO" as const,
      name: PLAN_LIMITS.PRO.label,
      priceMonthly: PLAN_LIMITS.PRO.priceMonthly,
      priceYearly: PLAN_LIMITS.PRO.priceYearly,
      description: "For power users",
      maxVideos: PLAN_LIMITS.PRO.maxVideos,
      maxDurationMin: Math.floor(PLAN_LIMITS.PRO.maxDurationSec / 60),
      maxUploadLabel: formatFileSize(PLAN_LIMITS.PRO.maxUploadSizeMB * 1024 * 1024),
      watermark: false,
      speed: "Priority",
      popular: false,
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

      <PricingClient
        plans={plans}
        signedIn={!!session?.user}
        currentPlan={currentPlan}
        currentBilling={currentBilling}
      />
    </div>
  );
}
