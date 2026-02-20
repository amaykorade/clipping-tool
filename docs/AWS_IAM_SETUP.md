# AWS IAM User Setup Guide for Kllivo

This guide helps you:
1. Check whether you're using the root account or an IAM user
2. Create an IAM user (if you don't have one)
3. Give it the right permissions for Kllivo (S3, billing, etc.)
4. Use it safely going forward

---

## Part 1: Check If You're Using Root or IAM

### When you're logged in:

1. Click your **account name** (top-right corner) in the AWS Console
2. Look at what it shows:

| What you see | Meaning |
|--------------|---------|
| A 12-digit number like `123456789012` | You're logged in as the **root account** |
| A name/alias (e.g. "Root", your email) | Likely the **root account** |
| A specific username (e.g. `kllivo-admin`, `ubuntu`) | You're using an **IAM user** |

3. You can also check:
   - Top-right: **Account name** or **IAM user name**
   - If it says "Root" or your sign-in email, that's root

**Root account** = The master account you created when you signed up. You should avoid using it for daily work.

**IAM user** = A separate user with its own login and limited permissions. Safer for daily use.

---

## Part 2: Should You Create an IAM User?

**Yes, create an IAM user if:**
- You're currently using the root account for everything
- You want to limit what can be changed (e.g. only S3, no billing changes)
- You want to share access with a team member without giving root

**You can skip if:**
- You're the only person and you're okay using root (not ideal but works)
- You already have an IAM user you use

---

## Part 3: Create an IAM User (Step by Step)

### Step 3.1: Open IAM

1. Search for **IAM** in the top AWS search bar
2. Click **IAM** (Identity and Access Management)
3. You should see the IAM dashboard

### Step 3.2: Add User

1. In the left sidebar, click **Users**
2. Click the orange **Create user** button
3. **User name**: e.g. `kllivo-admin` or `kllivo-deploy`
4. **Provide user access to the AWS Management Console**:
   - Select **Yes**
   - Choose **I want to create an IAM user**
   - **Console password**: Choose **Custom password** and set a strong password (save it somewhere safe)
   - Optionally: ☑️ **Users must create a new password at next sign-in** (forces a password change on first login)
5. Click **Next**

### Step 3.3: Set Permissions

You have 3 options. We'll use **Attach policies directly** for clarity.

1. Select **Attach policies directly**
2. In the search box, type and select these policies (one by one):

| Policy Name | Purpose |
|-------------|---------|
| **AmazonS3FullAccess** | Full S3 access (upload, download, delete for Kllivo videos) |
| **Billing** | View and manage billing, budgets, and cost explorer |

**If you host on EC2:**
- Add **AmazonEC2ReadOnlyAccess** (to view EC2)  
  **or**  
- Add **AmazonEC2FullAccess** (if you need to start/stop/restart instances)

3. Click **Next**
4. Review and click **Create user**

### Step 3.4: Save the Sign-in URL

1. After the user is created, you'll see a **Sign-in URL** like:
   ```
   https://YOUR-ACCOUNT-ID.signin.aws.amazon.com/console
   ```
2. **Save this URL** – you'll use it to log in as this IAM user instead of root
3. The IAM user signs in with:
   - **Account ID** (or alias)
   - **User name** (e.g. `kllivo-admin`)
   - **Password** (the one you set)

---

## Part 4: Policy Options Explained

### Option A: Use Built-in Policies (Easiest)

| Policy | What it does | Use for |
|--------|--------------|---------|
| **AmazonS3FullAccess** | Full access to all S3 buckets | Kllivo video storage |
| **Billing** | Create budgets, view costs, billing alerts | Cost monitoring |

### Option B: Custom Policy (More Restrictive, Recommended for Production)

Instead of `AmazonS3FullAccess`, you can limit access to only your Kllivo bucket:

1. In IAM, go to **Policies** → **Create policy**
2. Choose **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

3. Replace `YOUR-BUCKET-NAME` with your actual S3 bucket name (e.g. `kllivo-videos-prod`)
4. Click **Next**
5. **Policy name**: `KllivoS3BucketAccess`
6. Click **Create policy**
7. Go back to your IAM user → **Add permissions** → **Attach policies** → search for `KllivoS3BucketAccess` and attach it

---

## Part 5: Getting Access Keys (For EC2 / CLI / Apps)

If your app runs on an EC2 instance and uses env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), you need **access keys** for the IAM user.

### Create Access Keys

1. Go to **IAM** → **Users**
2. Click your user (e.g. `kllivo-admin`)
3. Open the **Security credentials** tab
4. Scroll to **Access keys**
5. Click **Create access key**
6. Choose **Application running outside AWS** (or **EC2** if you prefer)
7. Optionally add a description: `kllivo-production`
8. Click **Create access key**
9. **IMPORTANT**: Copy the **Access key ID** and **Secret access key** immediately
   - The secret is shown only once; you can't see it again
   - Store them in your `.env` or secrets manager

### Update Your Server

On your EC2 instance, update the env vars:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

Then restart your app (e.g. `pm2 restart all`).

---

## Part 6: Billing Access for IAM Users

By default, IAM users **cannot** access Billing and Cost Management.

To allow your IAM user to create budgets and view costs:

1. Go to **Billing and Cost Management** (as root)
2. In the left sidebar: **Billing preferences** (or **Account**)
3. Look for **IAM user and role access to Billing information**
4. Enable **Activate IAM access**
5. Click **Update**

After this, any IAM user with the **Billing** policy can use Billing and Cost Management.

---

## Part 7: Summary – What to Do

### If you're using root and want an IAM user:

1. [ ] Create IAM user (Part 3)
2. [ ] Attach `AmazonS3FullAccess` and `Billing` (Part 3.3)
3. [ ] Enable IAM billing access (Part 6)
4. [ ] Create access keys for the app (Part 5)
5. [ ] Update `.env` on the server with new keys
6. [ ] Sign in with the IAM user for daily work

### If you already have an IAM user:

1. [ ] Add `AmazonS3FullAccess` (or custom S3 policy) if missing
2. [ ] Add `Billing` if you want to manage budgets
3. [ ] Ensure IAM billing access is enabled (Part 6)

### Security best practices:

- Don't use root for daily tasks
- Use IAM users with only the permissions they need
- Rotate access keys periodically (e.g. every 90 days)
- Enable MFA on the root account and on IAM users

---

## Troubleshooting

**"You don't have permission to access Billing"**
- Enable IAM access to Billing (Part 6)
- Attach the **Billing** policy to your IAM user

**"Access Denied" when uploading to S3**
- Attach `AmazonS3FullAccess` or the custom S3 policy
- Ensure the bucket name in the policy matches your bucket

**Can't find IAM in the console**
- Search for "IAM" in the top search bar
- Or: Services → Security, Identity, & Compliance → IAM
