/**
 * Plan limits and metadata.
 * Free, Starter ($19/mo), Pro ($49/mo).
 */

import type { Plan } from "@/generated/prisma";

export const PLAN_LIMITS: Record<
  Plan,
  {
    maxVideos: number;
    maxDurationSec: number;
    /** null = unlimited */
    maxClipDownloadsPerMonth: number | null;
    watermark: boolean;
    /** BullMQ priority: lower = run first. 3=standard, 2=fast, 1=priority */
    jobPriority: number;
    label: string;
    priceMonthly: number | null;
  }
> = {
  FREE: {
    maxVideos: 1,
    maxDurationSec: 20 * 60, // 20 min
    maxClipDownloadsPerMonth: 1,
    watermark: true,
    jobPriority: 3, // standard (lowest)
    label: "Free",
    priceMonthly: null,
  },
  STARTER: {
    maxVideos: 5,
    maxDurationSec: 60 * 60, // 60 min
    maxClipDownloadsPerMonth: null,
    watermark: false,
    jobPriority: 2, // fast
    label: "Starter",
    priceMonthly: 19,
  },
  PRO: {
    maxVideos: 15,
    maxDurationSec: 3 * 60 * 60, // 3 hours
    maxClipDownloadsPerMonth: null,
    watermark: false,
    jobPriority: 1, // priority (highest)
    label: "Pro",
    priceMonthly: 49,
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

export function canUploadVideo(plan: Plan, currentVideoCount: number, durationSec: number): { ok: boolean; error?: string } {
  const limits = getPlanLimits(plan);
  if (currentVideoCount >= limits.maxVideos) {
    return { ok: false, error: `Plan limit: ${limits.maxVideos} video${limits.maxVideos === 1 ? "" : "s"} max. Upgrade to add more.` };
  }
  if (durationSec > limits.maxDurationSec) {
    const maxMin = Math.floor(limits.maxDurationSec / 60);
    return { ok: false, error: `Video must be ${maxMin} minutes or less on your plan. Upgrade for longer videos.` };
  }
  return { ok: true };
}

export function canDownloadClip(plan: Plan, usedThisMonth: number, periodStart: Date | null): { ok: boolean; error?: string } {
  const limits = getPlanLimits(plan);
  if (limits.maxClipDownloadsPerMonth === null) return { ok: true };
  // If period not set or we're in a new month, treat as 0 used
  const now = new Date();
  const periodYear = periodStart?.getFullYear() ?? 0;
  const periodMonth = periodStart?.getMonth() ?? 0;
  if (periodStart == null || now.getFullYear() > periodYear || now.getMonth() > periodMonth) {
    return { ok: true };
  }
  if (usedThisMonth >= limits.maxClipDownloadsPerMonth) {
    return { ok: false, error: "Download limit reached this month. Upgrade for unlimited downloads." };
  }
  return { ok: true };
}
