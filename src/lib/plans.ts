/**
 * Plan limits and metadata.
 * Free, Starter ($19/mo or $190/yr), Pro ($49/mo or $490/yr).
 * Yearly: 2 months free (pay for 10, get 12).
 */

export type Plan = "FREE" | "STARTER" | "PRO";
export type BillingPeriod = "monthly" | "yearly";

/** Pay for 10 months, get 12 — 2 months free */
export const YEARLY_MONTHS_PAID = 10;

export const PLAN_LIMITS: Record<
  Plan,
  {
    maxVideos: number; // per billing cycle; resets on renewal
    maxDurationSec: number;
    maxUploadSizeMB: number;
    maxClipDownloadsPerMonth: number | null;
    watermark: boolean;
    jobPriority: number;
    label: string;
    priceMonthly: number | null;
    priceYearly: number | null;
  }
> = {
  FREE: {
    maxVideos: 1,
    maxDurationSec: 20 * 60,
    maxUploadSizeMB: 500,
    maxClipDownloadsPerMonth: null,
    watermark: true,
    jobPriority: 3,
    label: "Free",
    priceMonthly: null,
    priceYearly: null,
  },
  STARTER: {
    maxVideos: 10,
    maxDurationSec: 60 * 60,
    maxUploadSizeMB: 1500,
    maxClipDownloadsPerMonth: null,
    watermark: false,
    jobPriority: 2,
    label: "Starter",
    priceMonthly: 19,
    priceYearly: 19 * YEARLY_MONTHS_PAID, // $190/yr
  },
  PRO: {
    maxVideos: 25,
    maxDurationSec: 3 * 60 * 60,
    maxUploadSizeMB: 3000,
    maxClipDownloadsPerMonth: null,
    watermark: false,
    jobPriority: 1,
    label: "Pro",
    priceMonthly: 49,
    priceYearly: 49 * YEARLY_MONTHS_PAID, // $490/yr
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

/** Max upload size in bytes for the given plan. */
export function getMaxUploadSizeBytes(plan: Plan): number {
  return PLAN_LIMITS[plan].maxUploadSizeMB * 1024 * 1024;
}

/** Format bytes for display (e.g. "1.5 GB", "500 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Next plan with higher upload limit, or null if already max (PRO). */
export function getNextPlanWithHigherUpload(plan: Plan): Plan | null {
  if (plan === "PRO") return null;
  if (plan === "FREE") return "STARTER";
  return "PRO";
}

/** Effective video limit for the billing cycle. Yearly = monthly_limit * 12. */
export function getMaxVideosForCycle(
  plan: Plan,
  billingInterval: "monthly" | "yearly" | null
): number {
  const limits = getPlanLimits(plan);
  if (plan === "FREE" || billingInterval !== "yearly") {
    return limits.maxVideos;
  }
  return limits.maxVideos * 12;
}

/** totalVideosUploaded = uploads this billing cycle (resets when subscription renews) */
export function canUploadVideo(
  plan: Plan,
  totalVideosUploaded: number,
  durationSec: number,
  billingInterval?: "monthly" | "yearly" | null
): { ok: boolean; error?: string } {
  const limits = getPlanLimits(plan);
  const maxVideos = getMaxVideosForCycle(plan, billingInterval ?? null);
  if (totalVideosUploaded >= maxVideos) {
    return { ok: false, error: `Plan limit: ${maxVideos} video${maxVideos === 1 ? "" : "s"} per billing cycle. Upgrade to add more.` };
  }
  if (durationSec > limits.maxDurationSec) {
    const maxMin = Math.floor(limits.maxDurationSec / 60);
    return { ok: false, error: `Video must be ${maxMin} minutes or less on your plan. Upgrade for longer videos.` };
  }
  return { ok: true };
}

/** Max concurrent active jobs (QUEUED + RUNNING) per user. */
export const MAX_ACTIVE_JOBS_PER_USER = 5;

/** Check if two dates fall in the same calendar month. */
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function canDownloadClip(plan: Plan, usedThisMonth: number, periodStart: Date | null): { ok: boolean; error?: string } {
  const limits = getPlanLimits(plan);
  if (limits.maxClipDownloadsPerMonth === null) return { ok: true };
  // If period not set or we're in a new month, treat as 0 used
  const now = new Date();
  if (!periodStart || !isSameMonth(now, periodStart)) {
    return { ok: true };
  }
  if (usedThisMonth >= limits.maxClipDownloadsPerMonth) {
    return { ok: false, error: "Download limit reached this month. Upgrade for unlimited downloads." };
  }
  return { ok: true };
}
