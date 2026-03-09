import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createCustomer, createSubscription, getPlanId } from "@/lib/razorpay";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { z } from "zod";

const BodySchema = z.object({
  plan: z.enum(["STARTER", "PRO"]),
  billing: z.enum(["monthly", "yearly"]).default("monthly"),
});

/**
 * POST /api/subscription/create
 * Creates a Razorpay subscription for the given plan and returns the checkout short_url.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const rl = checkRateLimit(`subscription:${auth.id}`, RATE_LIMITS.subscription);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { plan, billing } = parsed.data;
    const planId = getPlanId(plan, billing);

    // Use SELECT FOR UPDATE to prevent concurrent subscription switches
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: string;
          email: string | null;
          name: string | null;
          razorpayCustomerId: string | null;
          plan: string;
          billingInterval: string | null;
          razorpaySubscriptionId: string | null;
          subscriptionCurrentPeriodEnd: Date | null;
        }[]
      >`SELECT id, email, name, "razorpayCustomerId", plan, "billingInterval",
        "razorpaySubscriptionId", "subscriptionCurrentPeriodEnd"
        FROM "User" WHERE id = ${auth.id} FOR UPDATE`;
      const user = rows?.[0];
      if (!user) return { error: "User not found", status: 404 } as const;

      const currentPlan = (user.plan ?? "").toUpperCase() as "STARTER" | "PRO";
      const currentBilling = (user.billingInterval ?? "").toLowerCase() as "monthly" | "yearly";
      const isSwitch =
        user.razorpaySubscriptionId &&
        user.subscriptionCurrentPeriodEnd &&
        (currentPlan !== plan || currentBilling !== billing);

      const startAt =
        isSwitch && user.subscriptionCurrentPeriodEnd
          ? Math.floor(user.subscriptionCurrentPeriodEnd.getTime() / 1000)
          : undefined;

      // Treat the literal string "NULL" (from a previous bad DB write) as missing
      let customerId =
        user.razorpayCustomerId && user.razorpayCustomerId !== "NULL"
          ? user.razorpayCustomerId
          : null;

      if (!customerId) {
        const customer = await createCustomer(user.email ?? "", user.name ?? null);
        customerId = customer.id;
        await tx.$executeRaw`UPDATE "User" SET "razorpayCustomerId" = ${customerId} WHERE id = ${user.id}`;
      }

      const subscription = await createSubscription({
        planId,
        customerId,
        notes: { userId: user.id },
        notifyEmail: user.email ?? undefined,
        startAt,
      });

      return { subscriptionId: subscription.id, shortUrl: subscription.short_url } as const;
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (e) {
    const err = e as Error;
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }
    if (err.message?.includes("Razorpay") || err.message?.includes("plan ID") || err.message?.includes("not configured")) {
      console.error("[API] Subscription config error:", err.message);
      return NextResponse.json({ error: "Payment service is temporarily unavailable. Please try again later." }, { status: 400 });
    }
    console.error("[API] Subscription create error:", e);
    return NextResponse.json(
      { error: "Failed to create subscription. Please try again." },
      { status: 500 }
    );
  }
}
