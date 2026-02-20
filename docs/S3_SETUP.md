# S3 Setup Guide for Kllivo

This guide walks you through setting up AWS S3 for direct-to-cloud video uploads. With S3, the browser uploads files **directly** to S3 (bypassing your server), which eliminates 504 timeouts and reduces server load.

---

## 1. Create an S3 Bucket

1. Go to **AWS Console** → **S3** → **Create bucket**
2. **Bucket name:** `kllivo-uploads` (or your preferred name; must be globally unique)
3. **Region:** Choose one close to your users (e.g. `ap-south-1` for India)
4. **Block Public Access:** Keep **all 4** checkboxes **enabled** (we use presigned URLs, no public access needed)
5. **Bucket Versioning:** Disabled (optional)
6. Click **Create bucket**

---

## 2. Configure CORS on the Bucket

The browser needs to `PUT` files directly to S3. You must add CORS rules:

1. Open your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://kllivo.com", "https://www.kllivo.com", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

Replace `kllivo.com` with your domain. Add `http://localhost:3000` for local dev.

4. **Save changes**

---

## 3. Create an IAM User for S3 Access

1. Go to **IAM** → **Users** → **Create user**
2. **User name:** `kllivo-s3`
3. Click **Next**
4. **Attach policies:** Choose **Create policy** (opens new tab)
   - Service: **S3**
   - Actions: `GetObject`, `PutObject`, `DeleteObject`, `HeadObject`
   - Resources: Select your bucket (`arn:aws:s3:::kllivo-uploads/*`)
   - Policy name: `KllivoS3Policy`
   - Create policy
5. Go back to the user creation tab, refresh policies, select `KllivoS3Policy`
6. **Create user**
7. Open the user → **Security credentials** → **Create access key**
   - Use case: **Application running outside AWS**
   - Create. **Copy the Access Key ID and Secret Access Key** (you won’t see the secret again).

---

## 4. Add Environment Variables

On your **EC2 server** (and locally for testing), add to `.env`:

```env
STORAGE_TYPE=s3
AWS_S3_BUCKET=kllivo-uploads
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

- **`AWS_REGION`** should match the bucket region
- Remove or comment out `STORAGE_PATH` when using S3

---

## 5. Deploy and Test

1. Push code, pull on EC2, rebuild, restart:

```bash
cd ~/clipping-tool
git pull
npm install
npm run build
pm2 restart kllivo-web kllivo-worker
```

2. Upload a video. The flow should be:
   - Click Upload → instant response with "Uploading…" and progress bar
   - File uploads directly to S3
   - "Processing…" → worker picks up the job
   - Video becomes Ready when transcription/clips complete

---

## 6. Cost Notes

- **Storage:** ~$0.023/GB/month
- **PUT/GET:** Very low cost for typical usage
- **Data transfer out:** First 100GB/month free (to internet); after that ~$0.09/GB

For a small app with a few GB of videos, expect under a few dollars per month.

---

## Switching Back to Local Storage

To use local storage again (e.g. for dev):

```env
STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

Remove or leave the AWS vars; they’re only used when `STORAGE_TYPE=s3`.
