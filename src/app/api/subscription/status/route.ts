import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";

/**
 * GET /api/subscription/status
 * Returns current user's plan and limits for the UI.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        plan: true,
        subscriptionCurrentPeriodEnd: true,
        clipDownloadsUsedThisMonth: true,
        clipDownloadsPeriodStart: true,
        _count: { select: { videos: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limits = PLAN_LIMITS[user.plan];
    return NextResponse.json({
      plan: user.plan,
      label: limits.label,
      maxVideos: limits.maxVideos,
      maxDurationMin: Math.floor(limits.maxDurationSec / 60),
      maxClipDownloadsPerMonth: limits.maxClipDownloadsPerMonth,
      watermark: limits.watermark,
      currentVideoCount: user._count.videos,
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
