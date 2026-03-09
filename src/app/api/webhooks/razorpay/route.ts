import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelSubscription, planIdToTierAndBilling, verifyWebhookSignature } from "@/lib/razorpay";

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
  let payload: { event: string; account_id?: string; payload?: { subscription?: { entity?: SubEntity }; payment?: { entity?: { id?: string; notes?: Record<string, string> } } } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Build a unique event ID from payment ID or subscription ID
  const paymentId = payload.payload?.payment?.entity?.id;
  const subId = payload.payload?.subscription?.entity?.id;
  const eventId = paymentId ?? subId;

  if (!eventId) {
    console.warn("[Webhook] No payment or subscription ID in webhook, skipping");
    return NextResponse.json({ ok: true });
  }

  // Idempotency: skip if we already processed this exact event
  // We check for duplicates first but only record AFTER successful processing
  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: "razorpay", eventId } },
  });
  if (existing) {
    console.log(`[Webhook] Duplicate event skipped: ${eventId} (${payload.event})`);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const event = payload.event;
  const sub = payload.payload?.subscription?.entity;
  const notes = sub?.notes ?? payload.payload?.payment?.entity?.notes;
  const userId = (notes?.userId as string) ?? null;

  if (event === "subscription.activated" || event === "subscription.charged") {
    if (!sub || !userId) {
      return NextResponse.json({ ok: true });
    }
    const tierAndBilling = planIdToTierAndBilling(sub.plan_id);
    if (!tierAndBilling) {
      return NextResponse.json({ ok: true });
    }
    const periodEnd = sub.current_end;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { razorpaySubscriptionId: true },
    });
    const oldSubId = existing?.razorpaySubscriptionId;

    if (oldSubId && oldSubId !== sub.id) {
      // User has existing subscription (switch billing): new subscription starts after current period ends
      // Store new sub as "next", cancel old at cycle end
      try {
        await cancelSubscription(oldSubId, true);
      } catch (e) {
        console.error("[Webhook] Failed to cancel old subscription at cycle end:", oldSubId, e);
      }
      await prisma.user.update({
        where: { id: userId },
        data: {
          nextRazorpaySubscriptionId: sub.id,
          nextPlan: tierAndBilling.plan,
          nextBillingInterval: tierAndBilling.billing,
          nextSubscriptionPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
        },
      });
    } else {
      // New subscription (no existing or same sub) or renewal: apply immediately, reset upload quota
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: tierAndBilling.plan,
          billingInterval: tierAndBilling.billing,
          razorpaySubscriptionId: sub.id,
          subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
          nextRazorpaySubscriptionId: null,
          nextPlan: null,
          nextBillingInterval: null,
          nextSubscriptionPeriodEnd: null,
          totalVideosUploaded: 0, // fresh quota each billing cycle
        },
      });
    }
  }

  if (event === "subscription.completed") {
    // Subscription has ended. Switch to "next" if any, else set FREE.
    const completedSubId = sub?.id;
    const completedUserId = userId ?? (sub?.notes?.userId as string | undefined);
    if (!completedSubId || !completedUserId) {
      return NextResponse.json({ ok: true });
    }
    const user = await prisma.user.findUnique({
      where: { id: completedUserId },
      select: {
        razorpaySubscriptionId: true,
        nextRazorpaySubscriptionId: true,
        nextPlan: true,
        nextBillingInterval: true,
        nextSubscriptionPeriodEnd: true,
      },
    });
    if (!user || user.razorpaySubscriptionId !== completedSubId) {
      return NextResponse.json({ ok: true });
    }
    if (user.nextRazorpaySubscriptionId && (user.nextPlan === "STARTER" || user.nextPlan === "PRO")) {
      // Switch to pending subscription; reset upload quota for new cycle
      await prisma.user.update({
        where: { id: completedUserId },
        data: {
          plan: user.nextPlan,
          billingInterval: user.nextBillingInterval,
          razorpaySubscriptionId: user.nextRazorpaySubscriptionId,
          subscriptionCurrentPeriodEnd: user.nextSubscriptionPeriodEnd,
          nextRazorpaySubscriptionId: null,
          nextPlan: null,
          nextBillingInterval: null,
          nextSubscriptionPeriodEnd: null,
          subscriptionCancelledAtPeriodEnd: false,
          totalVideosUploaded: 0,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: completedUserId },
        data: {
          plan: "FREE",
          billingInterval: null,
          razorpaySubscriptionId: null,
          subscriptionCurrentPeriodEnd: null,
          subscriptionCancelledAtPeriodEnd: false,
        },
      });
    }
  }

  if (event === "subscription.cancelled" || event === "subscription.halted") {
    // Only set FREE if this is current sub AND no pending switch (immediate cancel)
    const cancelledSubId = sub?.id;
    const cancelledUserId = userId ?? (sub?.notes?.userId as string | undefined);
    if (!cancelledSubId || !cancelledUserId) {
      return NextResponse.json({ ok: true });
    }
    const user = await prisma.user.findUnique({
      where: { id: cancelledUserId },
      select: { razorpaySubscriptionId: true, nextRazorpaySubscriptionId: true },
    });
    if (!user || user.razorpaySubscriptionId !== cancelledSubId || user.nextRazorpaySubscriptionId) {
      return NextResponse.json({ ok: true });
    }
    await prisma.user.update({
      where: { id: cancelledUserId },
      data: {
        plan: "FREE",
        billingInterval: null,
        razorpaySubscriptionId: null,
        subscriptionCurrentPeriodEnd: null,
        subscriptionCancelledAtPeriodEnd: false,
      },
    });
  }

  // Record successful processing (idempotency: future retries will be skipped)
  try {
    await prisma.webhookEvent.create({
      data: { provider: "razorpay", eventId, eventType: event },
    });
  } catch (err: unknown) {
    // P2002 = race condition: another request processed it concurrently — that's fine
    if (!(err && typeof err === "object" && "code" in err && err.code === "P2002")) {
      console.error("[Webhook] Failed to record idempotency:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
