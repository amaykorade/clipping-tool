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
    const body = await res.json() as { error?: { description?: string; code?: string } };
    // If customer already exists, fetch them by email instead
    if (body?.error?.description?.includes("Customer already exists")) {
      const existing = await fetchCustomerByEmail(email);
      if (existing) return existing;
    }
    throw new Error(`Razorpay create customer failed: ${res.status} ${JSON.stringify(body)}`);
  }
  const data = (await res.json()) as { id: string };
  return data;
}

async function fetchCustomerByEmail(email: string): Promise<{ id: string } | null> {
  const res = await fetch(
    `${BASE}/customers?email=${encodeURIComponent(email)}&count=1`,
    { headers: { Authorization: authHeader() } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: { id: string }[] };
  return data?.items?.[0] ?? null;
}

export async function createSubscription(params: {
  planId: string;
  customerId: string;
  notes: Record<string, string>;
  notifyEmail?: string;
  callbackUrl?: string;
}): Promise<{ id: string; short_url?: string }> {
  const keyId = getRazorpayKeyId();
  const baseUrl = process.env.NEXTAUTH_URL || "";
  const requestBody = {
    plan_id: params.planId,
    customer_id: params.customerId,
    total_count: 120,
    quantity: 1,
    customer_notify: 1,
    notes: params.notes,
    notify_info: params.notifyEmail ? { notify_email: params.notifyEmail } : undefined,
    callback_url: params.callbackUrl || `${baseUrl}/api/subscription/callback`,
    callback_method: "get",
  };
  console.log("[Razorpay] createSubscription — keyId:", keyId, "body:", JSON.stringify(requestBody));
  const res = await fetch(`${BASE}/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(requestBody),
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
