# Payments & plans (Razorpay)

## Plans

| Plan    | Price   | Videos | Max duration | Downloads      | Watermark | Processing |
|---------|---------|--------|--------------|----------------|-----------|------------|
| Free    | $0      | 1      | 20 min       | 1 / month      | Yes       | Standard   |
| Starter | $19/mo  | 5      | 60 min       | Unlimited      | No        | Fast       |
| Pro     | $49/mo  | 15     | 3 hours      | Unlimited      | No        | Priority   |

## Env vars

```env
# Razorpay (dashboard: https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_PLAN_STARTER_ID=plan_...   # Create monthly plan for $19 in dashboard
RAZORPAY_PLAN_PRO_ID=plan_...       # Create monthly plan for $49 in dashboard
RAZORPAY_WEBHOOK_SECRET=...         # From Webhooks → Add secret
```

## Razorpay setup

### 1. Create plans (Subscriptions)

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com) → **Subscriptions** → **Plans** (or **Settings** → **Subscriptions** → **Plans**).
2. Click **Create Plan** (or **+ New Plan**).

**Starter plan ($19/month):**

- **Plan name:** e.g. `Clipflow Starter` or `Starter $19/mo`
- **Amount:**  
  - INR: `1900` (₹19 = 1900 paise)  
  - USD: `1900` (if using USD, $19 = 1900 cents — check your account currency)
- **Billing cycle:** `Monthly`
- **Interval:** `1` month
- Save and copy the **Plan ID** (starts with `plan_`). Put it in `.env` as `RAZORPAY_PLAN_STARTER_ID`.

**Pro plan ($49/month):**

- Create another plan the same way.
- **Plan name:** e.g. `Clipflow Pro` or `Pro $49/mo`
- **Amount:**  
  - INR: `4900` (₹49)  
  - USD: `4900` ($49 in cents if applicable)
- **Billing cycle:** `Monthly`
- Copy the **Plan ID** → `RAZORPAY_PLAN_PRO_ID` in `.env`.

### 2. Get API keys

- **Settings** → **API Keys** (or **Configurations** → **API Keys**).
- Generate or copy **Key ID** (`rzp_...`) and **Key Secret**.
- In `.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (and optionally `NEXT_PUBLIC_RAZORPAY_KEY_ID` for the frontend if you show the key there).

### 3. Set up the webhook

1. In Razorpay: **Settings** → **Webhooks** (or **Configurations** → **Webhooks**).
2. Click **+ Add New Webhook**.
3. **Webhook URL:**  
   `https://your-domain.com/api/webhooks/razorpay`  
   (Replace `your-domain.com` with your real domain, e.g. `app.clipflow.com`. For local testing you can use a tunnel like ngrok: `https://abc123.ngrok.io/api/webhooks/razorpay`.)
4. **Alert email:** Your email (for delivery failures).
5. **Active events** — enable these four:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
6. Save. Razorpay will show a **Secret** (or you can add a secret and copy it). Copy that value into `.env` as `RAZORPAY_WEBHOOK_SECRET`.

### 4. Env summary

```env
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_PLAN_STARTER_ID=plan_...
RAZORPAY_PLAN_PRO_ID=plan_...
RAZORPAY_WEBHOOK_SECRET=...
```

## Flow

- **Upgrade:** User clicks Upgrade on /pricing → `POST /api/subscription/create` with `{ plan: "STARTER" | "PRO" }` → creates Razorpay customer (if needed) and subscription → returns `shortUrl` → redirect to Razorpay checkout.
- **Webhook:** Razorpay sends `subscription.activated` / `subscription.charged` with `notes.userId` → we set `User.plan` and `subscriptionCurrentPeriodEnd`.
- **Cancel:** `subscription.cancelled` or `subscription.completed` → set user back to FREE.

## Limits enforced

- **Upload:** Video count and max duration checked in `processVideoUpload` (and plan limits in `src/lib/plans.ts`).
- **Clip download:** Free plan limited to 1 download per month; usage in `User.clipDownloadsUsedThisMonth` / `clipDownloadsPeriodStart`.
- **Watermark:** Free plan clips get a "Clipflow" drawtext overlay in `renderClip` (see `src/lib/video/processing.ts`).
- **Job priority:** Transcribe jobs get BullMQ priority from plan (Free=3, Starter=2, Pro=1; lower = run first).
