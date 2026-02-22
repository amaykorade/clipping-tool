/**
 * Razorpay API helpers (subscriptions).
 * Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_STARTER_ID, RAZORPAY_PLAN_PRO_ID.
 */

const BASE = "https://api.razorpay.com/v1";

function getRazorpayKeyId(): string {
  const raw =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.next_public_razorpay_key_id ||
    "";
  return raw.trim();
}

function getRazorpayKeySecret(): string {
  const raw =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.razorpay_key_secret ||
    "";
  return raw.trim();
}

function authHeader(): string {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
    );
  }
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export async function createCustomer(email: string, name: string | null): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ email, name: name || undefined }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay create customer failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { id: string };
  return data;
}

export async function createSubscription(params: {
  planId: string;
  customerId: string;
  notes: Record<string, string>;
  notifyEmail?: string;
}): Promise<{ id: string; short_url?: string }> {
  const res = await fetch(`${BASE}/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      plan_id: params.planId,
      customer_id: params.customerId,
      total_count: 120, // 120 months (~10 years) — effectively indefinite
      quantity: 1,
      customer_notify: 1,
      notes: params.notes,
      notify_info: params.notifyEmail ? { notify_email: params.notifyEmail } : undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay create subscription failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { id: string; short_url?: string };
  return data;
}

/** Cancel subscription. Pass true to cancel at end of billing cycle (user keeps access until then). */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true,
): Promise<void> {
  const res = await fetch(`${BASE}/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay cancel subscription failed: ${res.status} ${err}`);
  }
}

export function getPlanId(plan: "STARTER" | "PRO"): string {
  const id =
    plan === "STARTER"
      ? process.env.RAZORPAY_PLAN_STARTER_ID
      : process.env.RAZORPAY_PLAN_PRO_ID;
  if (!id) throw new Error(`Razorpay plan ID not configured for ${plan}`);
  return id;
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return signature === expected;
}
