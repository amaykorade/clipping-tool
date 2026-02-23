import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getMaxVideosForCycle, PLAN_LIMITS } from "@/lib/plans";

/**
 * GET /api/subscription/status
 * Returns current user's plan and limits for the UI.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    // Raw SQL to avoid Next.js serving a stale Prisma client for User (custom output + bundling).
    const rows = await prisma.$queryRaw<
      {
        plan: string;
        billingInterval: string | null;
        subscriptionCurrentPeriodEnd: Date | null;
        clipDownloadsUsedThisMonth: number;
        clipDownloadsPeriodStart: Date | null;
        totalVideosUploaded: number;
      }[]
    >`
      SELECT u.plan, u."billingInterval", u."subscriptionCurrentPeriodEnd", u."clipDownloadsUsedThisMonth",
             u."clipDownloadsPeriodStart", u."totalVideosUploaded"
      FROM "User" u WHERE u.id = ${auth.id}
    `;
    const user = rows?.[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];
    const maxVideos = getMaxVideosForCycle(
      user.plan as keyof typeof PLAN_LIMITS,
      user.billingInterval === "yearly" ? "yearly" : user.billingInterval === "monthly" ? "monthly" : null
    );
    return NextResponse.json({
      plan: user.plan,
      label: limits.label,
      maxVideos,
      maxDurationMin: Math.floor(limits.maxDurationSec / 60),
      maxClipDownloadsPerMonth: limits.maxClipDownloadsPerMonth,
      watermark: limits.watermark,
      totalVideosUploaded: user.totalVideosUploaded,
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      clipDownloadsUsedThisMonth: user.clipDownloadsUsedThisMonth,
    });
  } catch (e) {
    const err = e as Error;
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }
    throw e;
  }
}
