import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cancelSubscription } from "@/lib/razorpay";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";

/**
 * POST /api/subscription/cancel
 * Cancels the current user's Razorpay subscription (at end of billing cycle by default).
 * User keeps access until period end; webhook (subscription.completed) will set FREE.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const cancelAtCycleEnd = body.cancel_at_cycle_end !== false;

    const rows = await prisma.$queryRaw<
      { razorpaySubscriptionId: string | null }[]
    >`SELECT "razorpaySubscriptionId" FROM "User" WHERE id = ${auth.id}`;
    const user = rows?.[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription to cancel" },
        { status: 400 }
      );
    }

    await cancelSubscription(user.razorpaySubscriptionId, cancelAtCycleEnd);

    if (cancelAtCycleEnd) {
      await prisma.$executeRaw`
        UPDATE "User" SET "subscriptionCancelledAtPeriodEnd" = true WHERE id = ${auth.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "User"
        SET plan = 'FREE', "billingInterval" = NULL, "razorpaySubscriptionId" = NULL,
            "subscriptionCurrentPeriodEnd" = NULL, "subscriptionCancelledAtPeriodEnd" = false
        WHERE id = ${auth.id}
      `;
    }

    return NextResponse.json({
      ok: true,
      message: cancelAtCycleEnd
        ? "Subscription will cancel at the end of the current billing period. You keep access until then."
        : "Subscription cancelled.",
    });
  } catch (e) {
    const err = e as Error;
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }
    console.error("[API] Cancel subscription error:", err);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(err) },
      { status: 500 }
    );
  }
}
