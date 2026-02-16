# Google Login Setup

Clipflow uses **NextAuth.js** with **Google OAuth** so users can sign in and have their videos saved under their account.

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Add **Authorized redirect URIs**:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Copy the **Client ID** and **Client Secret**.

## 2. Environment variables

Add to your `.env`:

```env
# Google OAuth (from step 1)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# NextAuth (required for sessions)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_string_32_chars_min
```

For production, set `NEXTAUTH_URL` to your app URL (e.g. `https://clipflow.vercel.app`).  
Generate a secret: `openssl rand -base64 32`.

## 3. Database migration

Run the auth migration (adds `User`, `Account`, `Session`, `VerificationToken`, and `Video.userId`):

```bash
npx prisma migrate dev --name add_google_auth
```

If you prefer to apply the migration SQL manually, use the file in `prisma/migrations/20260215080000_add_google_auth/migration.sql`.

## 4. Behavior

- **Upload** requires sign-in; new videos are linked to the logged-in user (`Video.userId`).
- **My videos** (`/videos`) lists only the current user’s videos.
- **Video detail** (`/videos/[id]`) and related APIs (transcript, generate-clips, render) only allow access to videos you own (or legacy videos with no owner).
- Existing videos in the DB without `userId` remain accessible to everyone (legacy); new uploads are private to the user.
