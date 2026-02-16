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

1. Create two **Plans** (Subscriptions → Plans): e.g. "Starter $19/mo" and "Pro $49/mo" (monthly, amount in your currency).
2. Copy plan IDs into `RAZORPAY_PLAN_STARTER_ID` and `RAZORPAY_PLAN_PRO_ID`.
3. Add webhook URL: `https://your-domain.com/api/webhooks/razorpay`
   - Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`.
4. Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`.

## Flow

- **Upgrade:** User clicks Upgrade on /pricing → `POST /api/subscription/create` with `{ plan: "STARTER" | "PRO" }` → creates Razorpay customer (if needed) and subscription → returns `shortUrl` → redirect to Razorpay checkout.
- **Webhook:** Razorpay sends `subscription.activated` / `subscription.charged` with `notes.userId` → we set `User.plan` and `subscriptionCurrentPeriodEnd`.
- **Cancel:** `subscription.cancelled` or `subscription.completed` → set user back to FREE.

## Limits enforced

- **Upload:** Video count and max duration checked in `processVideoUpload` (and plan limits in `src/lib/plans.ts`).
- **Clip download:** Free plan limited to 1 download per month; usage in `User.clipDownloadsUsedThisMonth` / `clipDownloadsPeriodStart`.
- **Watermark:** Free plan clips get a "Clipflow" drawtext overlay in `renderClip` (see `src/lib/video/processing.ts`).
- **Job priority:** Transcribe jobs get BullMQ priority from plan (Free=3, Starter=2, Pro=1; lower = run first).
