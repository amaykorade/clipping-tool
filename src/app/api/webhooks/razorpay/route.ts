import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/razorpay
 * Razorpay subscription webhook: subscription.activated, subscription.charged.
 * Update user plan and period from subscription payload.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!WEBHOOK_SECRET) {
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  type SubEntity = {
    id: string;
    plan_id: string;
    status: string;
    notes?: Record<string, string>;
    current_end?: number;
  };
  let payload: { event: string; payload?: { subscription?: { entity?: SubEntity }; payment?: { entity?: { notes?: Record<string, string> } } } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event;
  const sub = payload.payload?.subscription?.entity;
  const notes = sub?.notes ?? payload.payload?.payment?.entity?.notes;
  const userId = (notes?.userId as string) ?? null;

  if (event === "subscription.activated" || event === "subscription.charged") {
    if (!sub || !userId) {
      return NextResponse.json({ ok: true });
    }
    const planId = sub.plan_id;
    const periodEnd = sub.current_end;
    const plan =
      planId === process.env.RAZORPAY_PLAN_STARTER_ID ? "STARTER" : "PRO";
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        razorpaySubscriptionId: sub.id,
        subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      },
    });
  }

  if (
    event === "subscription.cancelled" ||
    event === "subscription.completed" ||
    event === "subscription.halted"
  ) {
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: "FREE",
          razorpaySubscriptionId: null,
          subscriptionCurrentPeriodEnd: null,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
