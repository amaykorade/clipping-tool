import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createCustomer, createSubscription, getPlanId } from "@/lib/razorpay";
import { z } from "zod";

const BodySchema = z.object({ plan: z.enum(["STARTER", "PRO"]) });

/**
 * POST /api/subscription/create
 * Creates a Razorpay subscription for the given plan and returns the checkout short_url.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Raw SQL to avoid Next.js serving a stale Prisma client for User (custom output + bundling).
    const rows = await prisma.$queryRaw<
      { id: string; email: string | null; name: string | null; razorpayCustomerId: string | null }[]
    >`SELECT id, email, name, "razorpayCustomerId" FROM "User" WHERE id = ${auth.id}`;
    const user = rows?.[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { plan } = parsed.data;
    const planId = getPlanId(plan);

    // Treat the literal string "NULL" (from a previous bad DB write) as missing
    let customerId =
      user.razorpayCustomerId && user.razorpayCustomerId !== "NULL"
        ? user.razorpayCustomerId
        : null;

    if (!customerId) {
      const customer = await createCustomer(user.email ?? "", user.name ?? null);
      customerId = customer.id;
      await prisma.$executeRaw`UPDATE "User" SET "razorpayCustomerId" = ${customerId} WHERE id = ${user.id}`;
    }

    const subscription = await createSubscription({
      planId,
      customerId,
      notes: { userId: user.id },
      notifyEmail: user.email ?? undefined,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
    });
  } catch (e) {
    const err = e as Error;
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }
    if (err.message?.includes("Razorpay") || err.message?.includes("plan ID") || err.message?.includes("not configured")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[API] Subscription create error:", e);
    return NextResponse.json(
      { error: err.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
