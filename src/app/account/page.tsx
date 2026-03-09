import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMaxVideosForCycle, PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

// Raw SQL for User/plan so we avoid Next.js serving a stale Prisma client (custom output + bundling).
type AccountUserRow = {
  name: string | null;
  email: string | null;
  image: string | null;
  plan: string;
  billingInterval: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
  razorpaySubscriptionId: string | null;
  nextPlan: string | null;
  nextBillingInterval: string | null;
  nextSubscriptionPeriodEnd: Date | null;
  subscriptionCancelledAtPeriodEnd: boolean;
  total_videos_uploaded: number;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const rows = await prisma.$queryRaw<AccountUserRow[]>`
    SELECT u.name, u.email, u.image, u.plan, u."billingInterval",
           u."subscriptionCurrentPeriodEnd", u."razorpaySubscriptionId",
           u."nextPlan", u."nextBillingInterval", u."nextSubscriptionPeriodEnd",
           u."subscriptionCancelledAtPeriodEnd", u."totalVideosUploaded" as total_videos_uploaded
    FROM "User" u WHERE u.id = ${session.user.id}
  `;
  const raw = rows?.[0];
  if (!raw) {
    redirect("/");
  }

  const user = {
    name: raw.name,
    email: raw.email,
    image: raw.image,
    plan: raw.plan as Plan,
    subscriptionCurrentPeriodEnd: raw.subscriptionCurrentPeriodEnd,
    razorpaySubscriptionId: raw.razorpaySubscriptionId,
    _count: { videos: raw.total_videos_uploaded },
  };
  const limits = PLAN_LIMITS[user.plan];
  const maxVideos = getMaxVideosForCycle(
    user.plan,
    raw.billingInterval === "yearly" ? "yearly" : raw.billingInterval === "monthly" ? "monthly" : null
  );
  const isPaid = user.plan === "STARTER" || user.plan === "PRO";

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Account
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Your plan and subscription settings.
        </p>
      </header>

      <div className="space-y-6">
        {/* Profile summary */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Profile
          </h2>
          <div className="mt-4 flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="h-14 w-14 rounded-full border border-slate-200"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-medium text-slate-600">
                {(user.name ?? user.email ?? "?")[0]}
              </span>
            )}
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{user.name ?? "—"}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email ?? "—"}</p>
            </div>
          </div>
        </section>

        {/* Current plan */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Current plan
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                user.plan === "PRO"
                  ? "bg-indigo-100 text-indigo-800"
                  : user.plan === "STARTER"
                    ? "bg-slate-200 text-slate-800"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {limits.label}
              {raw.billingInterval === "yearly" && ` (Annual)`}
              {raw.billingInterval === "monthly" && isPaid && ` (Monthly)`}
            </span>
            {user.subscriptionCurrentPeriodEnd && isPaid && (
              <span className="text-sm text-slate-500">
                {raw.subscriptionCancelledAtPeriodEnd
                  ? "Ends "
                  : raw.nextPlan
                    ? `Switches to ${raw.nextPlan} (${raw.nextBillingInterval === "yearly" ? "Annual" : "Monthly"}) on `
                    : "Renews "}
                {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(
                  undefined,
                  { dateStyle: "medium" }
                )}
              </span>
            )}
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
            <li>{maxVideos} video{maxVideos !== 1 ? "s" : ""} max{raw.billingInterval === "yearly" ? " per year" : ""}</li>
            <li>Up to {Math.floor(limits.maxDurationSec / 60)} min per video</li>
            <li>{limits.watermark ? "Watermark on clips" : "No watermark"}</li>
            <li>Processing: {limits.jobPriority === 1 ? "Priority" : limits.jobPriority === 2 ? "Fast" : "Standard"}</li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            {user._count.videos} of {maxVideos} videos uploaded
          </p>
        </section>

        {/* Manage subscription */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Subscription
          </h2>
          {params?.downgrade === "free" && isPaid && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">Switching to Free</p>
              <p className="mt-1 text-amber-700">
                To switch to the free plan, cancel your subscription below. You’ll keep access until
                the end of your billing period. No further charges will be made.
              </p>
            </div>
          )}
          <div className="mt-4">
            {isPaid && user.razorpaySubscriptionId ? (
              <AccountClient
                plan={user.plan}
                periodEnd={user.subscriptionCurrentPeriodEnd}
                cancelledAtPeriodEnd={raw.subscriptionCancelledAtPeriodEnd}
              />
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-600">
                  You’re on the free plan. Upgrade for more videos and faster processing.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  View plans
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
