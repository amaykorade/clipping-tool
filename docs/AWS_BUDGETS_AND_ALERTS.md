# AWS Budgets and Alerts – Complete Setup Guide

This guide walks you through setting up cost monitoring and alerts so you know when AWS spend goes up and can avoid surprise bills.

---

## Before You Start

- You need an **AWS account** (the same one where your S3 bucket is)
- You need **root account access** or an IAM user with billing permissions
- Have your **email address** ready for alerts

---

## Part 1: Access the Billing Console

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Click your **account name** (top-right corner)
3. Click **Billing and Cost Management**
   - Or search for "Billing" in the top search bar and open it

If you don’t see Billing, your IAM user may not have billing access. Switch to the root account or ask the account owner to grant billing permissions.

---

## Part 2: Enable Billing Alerts (Important)

Before budgets can send email alerts, AWS must be allowed to contact you.

1. In the left sidebar, click **Billing preferences**
2. Under **Cost Management preferences**, enable:
   - ☑️ **Receive Free Tier Usage Alerts** – alerts when free tier limits are near
   - ☑️ **Receive Billing Alerts** – required for cost alerts
3. Click **Save preferences**

---

## Part 3: Create Your First Budget (Monthly Cost Alert)

### Step 3.1: Open Budgets

1. In the left sidebar, click **Budgets**
2. Click the orange **Create budget** button

### Step 3.2: Choose Budget Type

1. Select **Cost budget**
2. Click **Next**

### Step 3.3: Set Budget Details

1. **Budget name**  
   Example: `kllivo-monthly`  
   (Any name that helps you identify it)

2. **Period**  
   Select **Monthly**

3. **Budgeted amount**  
   - Choose **Fixed**
   - Enter your monthly cap (e.g. `50` for $50, `100` for $100)
   - This is the amount you’re okay spending per month

4. **Budget start date**  
   Leave as **First day of current month** unless you want something different

5. Click **Next**

### Step 3.4: Configure Alerts

You’ll add alert thresholds so AWS emails you before you hit your limit.

**Alert 1 – Early warning (80%):**

1. Under **Alert 1**, fill in:
   - **Alert name**: `80-percent-used`
   - **Condition**: `Actual` costs
   - **Threshold**: `80` percent
   - **Email recipients**: Add your email (e.g. `you@example.com`)
2. ☑️ Check **Also trigger for forecasted costs** if you want to be warned based on predicted spend

**Alert 2 – Critical (100%):**

1. Click **Add alert threshold**
2. Fill in:
   - **Alert name**: `100-percent-used`
   - **Condition**: `Actual` costs
   - **Threshold**: `100` percent
   - **Email recipients**: Same email (or add more)

**Alert 3 – Forecasted (optional but useful):**

1. Click **Add alert threshold**
2. Fill in:
   - **Alert name**: `forecasted-exceeds-budget`
   - **Condition**: `Forecasted` costs
   - **Threshold**: `100` percent
   - **Email recipients**: Same email

3. Click **Next**

### Step 3.5: Review and Create

1. Review the summary
2. Click **Create budget**

You’ll see “Budget created successfully”.

---

## Part 4: S3-Specific Budget (Optional but Recommended)

Since Kllivo uses S3 for video storage, it helps to track S3 spend separately.

1. Click **Create budget** again
2. Choose **Cost budget** → **Next**

### Budget Details

1. **Budget name**: `kllivo-s3`
2. **Period**: **Monthly**
3. **Budgeted amount**: `30` (or whatever cap you want for S3)
4. Click **Configure filters** (optional)
   - **Filter by**: Service
   - **Service**: Select **Amazon Simple Storage Service**
   - This limits the budget to S3 only
5. Click **Next**

### Alerts

Add the same kinds of alerts as before (80%, 100%, and optionally forecasted) and your email. Click **Next** → **Create budget**.

---

## Part 5: Confirm Your Email (Very Important)

AWS sends a verification email for each budget alert.

1. Check your inbox for emails from **no-reply@aws.amazon.com** or **no-reply@sns.amazonaws.com**
2. Check the **spam/junk** folder
3. Open each email and click **Confirm subscription** or the confirmation link
4. You should see “You have confirmed your subscription”

Until you confirm, you will **not** receive any budget alerts.

---

## Part 6: Legacy Billing Alarms (Alternative/Extra)

AWS also supports older-style billing alarms via CloudWatch. You can use these in addition to budgets.

### Step 6.1: Enable Billing Metrics

1. Go to **Billing and Cost Management** → **Billing preferences**
2. Ensure **Receive Billing Alerts** is enabled
3. Save

### Step 6.2: Create an SNS Topic

1. Open **CloudWatch** (search “CloudWatch” in the console)
2. In the left sidebar, expand **Application management** → click **Topics**
3. Click **Create topic**
4. **Type**: Standard
5. **Name**: `billing-alerts`
6. **Email subscription**:
   - Click **Create subscription**
   - **Protocol**: Email
   - **Endpoint**: your email
7. Click **Create topic**
8. Check your email and **confirm the subscription** for the SNS topic

### Step 6.3: Create the Billing Alarm

1. In CloudWatch, go to **Alarms** → **Alarms** (or **All alarms**)
2. Click **Create alarm**
3. Click **Select metric**
4. Open **Billing** → **Total estimated charges**
5. Select **EstimatedCharges** (there may be only one row)
6. Click **Select metric**
7. Under **Conditions**:
   - **Threshold type**: Static
   - **Whenever EstimatedCharges is…**: Greater
   - **than…**: Enter an amount (e.g. `25` for $25)
8. Click **Next**
9. **Notification**:
   - **Send notification to**: Select the `billing-alerts` SNS topic
10. Click **Next**
11. **Alarm name**: `total-aws-charges-over-25`
12. Click **Create alarm**

---

## Part 7: Where to See Your Costs

### Billing Dashboard

1. **Billing and Cost Management** → **Bills**
2. View current month charges by service

### Cost Explorer

1. **Billing and Cost Management** → **Cost Explorer**
2. (First-time setup can take up to 24 hours)
3. Use filters for:
   - **Service** (S3, EC2, etc.)
   - **Time range** (daily, monthly)

### Budgets Overview

1. **Billing and Cost Management** → **Budgets**
2. See each budget’s:
   - Current spend
   - Forecasted spend
   - Progress bar vs. limit

---

## Part 8: Recommended Setup for Kllivo

| Budget/Alarm       | Amount | Purpose                      |
|--------------------|--------|------------------------------|
| Monthly cost       | $50–100| Overall AWS cap              |
| S3-only            | $20–30 | Track storage/transfer costs |
| CloudWatch alarm   | $25–50 | Extra safety net             |

---

## Troubleshooting

**I’m not getting email alerts**

- Check spam/junk
- Confirm you clicked the verification links
- Wait a few hours; first alerts may be delayed

**I don’t see Billing in the menu**

- Use the root account, or
- Give your IAM user billing permissions (e.g. `aws-portal:*Billing`)

**Cost Explorer says “not available”**

- It can take 24 hours to populate after first use
- Billing data must exist for at least a few days

**I want to add more emails**

- Edit the budget → **Edit** → add more email addresses under each alert

---

## Quick Checklist

- [ ] Billing preferences: alerts enabled
- [ ] Monthly budget created
- [ ] 80% and 100% alerts configured
- [ ] S3 budget created (optional)
- [ ] All alert emails confirmed
- [ ] CloudWatch billing alarm created (optional)
