/**
 * Razorpay API helpers (subscriptions).
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
 *      RAZORPAY_PLAN_STARTER_ID, RAZORPAY_PLAN_PRO_ID (monthly),
 *      RAZORPAY_PLAN_STARTER_YEARLY_ID, RAZORPAY_PLAN_PRO_YEARLY_ID (optional; falls back to monthly if unset).
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
  /** Unix timestamp; if set, subscription starts then (plan switch at period end) */
  startAt?: number;
}): Promise<{ id: string; short_url?: string }> {
  const keyId = getRazorpayKeyId();
  const requestBody = {
    plan_id: params.planId,
    customer_id: params.customerId,
    total_count: 100,  // Razorpay max for given period/interval
    quantity: 1,
    customer_notify: 1,
    notes: params.notes,
    notify_info: params.notifyEmail ? { notify_email: params.notifyEmail } : undefined,
    ...(params.startAt != null && { start_at: params.startAt }),
  };
  console.log("[Razorpay] createSubscription — body:", JSON.stringify(requestBody));
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

/**
 * Map Razorpay plan_id to { plan, billingInterval }.
 * Returns null if plan_id doesn't match any configured plan.
 */
export function planIdToTierAndBilling(planId: string): {
  plan: "STARTER" | "PRO";
  billing: "monthly" | "yearly";
} | null {
  const starter = process.env.RAZORPAY_PLAN_STARTER_ID;
  const starterYearly = process.env.RAZORPAY_PLAN_STARTER_YEARLY_ID;
  const pro = process.env.RAZORPAY_PLAN_PRO_ID;
  const proYearly = process.env.RAZORPAY_PLAN_PRO_YEARLY_ID;
  if (planId === starter) return { plan: "STARTER", billing: "monthly" };
  if (planId === starterYearly) return { plan: "STARTER", billing: "yearly" };
  if (planId === pro) return { plan: "PRO", billing: "monthly" };
  if (planId === proYearly) return { plan: "PRO", billing: "yearly" };
  return null;
}

export function getPlanId(plan: "STARTER" | "PRO", billing: "monthly" | "yearly" = "monthly"): string {
  let id: string | undefined;
  if (plan === "STARTER") {
    id =
      billing === "yearly"
        ? (process.env.RAZORPAY_PLAN_STARTER_YEARLY_ID || process.env.RAZORPAY_PLAN_STARTER_ID)
        : process.env.RAZORPAY_PLAN_STARTER_ID;
  } else {
    id =
      billing === "yearly"
        ? (process.env.RAZORPAY_PLAN_PRO_YEARLY_ID || process.env.RAZORPAY_PLAN_PRO_ID)
        : process.env.RAZORPAY_PLAN_PRO_ID;
  }
  if (!id) throw new Error(`Razorpay plan ID not configured for ${plan} ${billing}`);
  return id;
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
