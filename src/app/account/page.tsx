import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import AccountClient from "./AccountClient";

// Raw SQL for User/plan so we avoid Next.js serving a stale Prisma client (custom output + bundling).
type AccountUserRow = {
  name: string | null;
  email: string | null;
  image: string | null;
  plan: string;
  subscriptionCurrentPeriodEnd: Date | null;
  razorpaySubscriptionId: string | null;
  video_count: number;
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const rows = await prisma.$queryRaw<AccountUserRow[]>`
    SELECT u.name, u.email, u.image, u.plan,
           u."subscriptionCurrentPeriodEnd", u."razorpaySubscriptionId",
           (SELECT COUNT(*)::int FROM "Video" v WHERE v."userId" = u.id) as video_count
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
    _count: { videos: raw.video_count },
  };
  const limits = PLAN_LIMITS[user.plan];
  const isPaid = user.plan === "STARTER" || user.plan === "PRO";

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Account
        </h1>
        <p className="mt-1 text-slate-600">
          Your plan and subscription settings.
        </p>
      </header>

      <div className="space-y-6">
        {/* Profile summary */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
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
              <p className="font-medium text-slate-900">{user.name ?? "—"}</p>
              <p className="text-sm text-slate-500">{user.email ?? "—"}</p>
            </div>
          </div>
        </section>

        {/* Current plan */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
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
            </span>
            {user.subscriptionCurrentPeriodEnd && isPaid && (
              <span className="text-sm text-slate-500">
                Renews / ends{" "}
                {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(
                  undefined,
                  { dateStyle: "medium" }
                )}
              </span>
            )}
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
            <li>{limits.maxVideos} video{limits.maxVideos !== 1 ? "s" : ""} max</li>
            <li>Up to {Math.floor(limits.maxDurationSec / 60)} min per video</li>
            <li>{limits.watermark ? "Watermark on clips" : "No watermark"}</li>
            <li>Processing: {limits.jobPriority === 1 ? "Priority" : limits.jobPriority === 2 ? "Fast" : "Standard"}</li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            {user._count.videos} of {limits.maxVideos} videos used
          </p>
        </section>

        {/* Manage subscription */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Subscription
          </h2>
          <div className="mt-4">
            {isPaid && user.razorpaySubscriptionId ? (
              <AccountClient
                plan={user.plan}
                periodEnd={user.subscriptionCurrentPeriodEnd}
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
