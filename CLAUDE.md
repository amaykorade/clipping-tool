# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # prisma generate && next build
npm run start        # Production server
npm run lint         # ESLint (v9 flat config)
npm run worker            # BullMQ worker — both queues (dev default)
npm run worker:transcribe # Only transcription queue (API-bound)
npm run worker:render     # Only render queue (CPU-bound)
npx prisma generate       # Regenerate Prisma client after schema changes
npx prisma migrate dev    # Create + apply migration after schema changes
```

Build requires `prisma generate` first (handled automatically by build script and postinstall). No test framework is configured — there are no tests in this project.

## Architecture

**Clipflow (Kllivo)** is a Next.js 16 App Router SaaS that transforms long-form videos into short-form clips using AI. TypeScript throughout.

### Core Stack
- **Next.js 16** (App Router) + React 19 + Tailwind CSS v4
- **Prisma 7** with PostgreSQL (Neon serverless, driver adapter via `@prisma/adapter-pg`)
- **NextAuth v4** with Google OAuth (DB session strategy, 30-day max age)
- **BullMQ** + Redis/Upstash for background job queue
- **Razorpay** for subscriptions (not Stripe)
- **Email**: Pluggable transport (`src/lib/email/index.ts`) — console in dev, Resend API in prod (`EMAIL_PROVIDER=resend`)

### Two-Process Architecture
1. **Next.js server**: Handles API routes, serves UI, enqueues jobs
2. **BullMQ worker(s)**: Separate Node.js process(es). Two queues: `video-transcription` (API-bound, concurrency 2) and `clip-rendering` (CPU-bound, concurrency 3). Can run as single process or split via `WORKER_TYPE=transcribe|render` env var

### AI Pipeline (sequential)
1. **AssemblyAI** → speech-to-text with speaker labels
2. **Semantic segmentation** → topic boundary detection
3. **GPT-4o-mini** → clip scoring, title generation
4. **Clip refinement** → merge overlapping, extend to sentence boundaries
5. **FFmpeg** → render 9:16 vertical clips with captions

### Two-Phase Upload Pattern
- **Fast path** (API): Save file to pending storage, create Video record, respond immediately
- **Slow path** (Worker): Finalize, extract metadata via FFmpeg, run AI pipeline

### Storage Abstraction (`src/lib/storage/index.ts`)
- `IStorage` interface with Local and S3 implementations
- `STORAGE_TYPE` env var switches between them
- S3 mode uses presigned URLs for direct browser uploads
- Local mode serves files via `/upload/[...path]` catch-all route

### Subscription & Plans (`src/lib/plans.ts`)
- FREE / STARTER / PRO tiers with per-cycle video limits and upload size caps
- Yearly billing = 10 months price for 12 months
- Pending plan switches take effect at cycle end
- `totalVideosUploaded` is lifetime counter (deletes don't reduce it)

## Key Directories

- `src/app/api/` — API routes (videos, clips, subscription, webhooks)
- `src/lib/ai/` — AI integrations (transcription, scoring, segmentation, refinement)
- `src/lib/video/` — Upload handling, metadata extraction, clip rendering (FFmpeg)
- `src/lib/storage/` — Storage abstraction (Local/S3)
- `src/lib/queue/` — BullMQ setup with lazy Redis connection
- `src/lib/email/` — Notification emails (video ready, clips rendered, quota warning)
- `src/worker/` — Background job worker (transcription, clip generation)
- `prisma/schema.prisma` — Database schema (User, Account, Session, Video, Clip, Job, WebhookEvent)

## Key Patterns

- **Path alias**: `@/*` maps to `src/*`
- **Prisma generated client**: Output is `src/generated/prisma` (not `node_modules`). Import types/enums from `@/generated/prisma`
- **Auth helpers**: `requireAuth()` and `canAccessVideo()` in `src/lib/auth.ts`
- **Error mapping**: `toUserFriendlyError()` and `getSafeApiErrorMessage()` in `src/lib/errorMessages.ts` — never expose internal errors (Redis, API keys) to users
- **Prisma singleton**: `src/lib/db/index.ts` — uses driver adapter pattern for serverless compatibility
- **Lazy Redis**: Queue connection only initialized on first job enqueue (supports static builds)
- **Video status flow**: DOWNLOADING → UPLOADED → TRANSCRIBING → ANALYZING → READY (or ERROR). DOWNLOADING is for YouTube URL imports only; direct uploads start at UPLOADED
- **Clip status flow**: PENDING → PROCESSING → COMPLETED (or ERROR)
- **Zod validation**: Used for runtime schema validation on API inputs
- **Rate limiting**: In-memory sliding window per user (`src/lib/rateLimit.ts`) on upload, render, download, subscription endpoints
- **Webhook idempotency**: `WebhookEvent` model prevents duplicate Razorpay webhook processing
- **File validation**: Extension whitelist + MIME type checks on both upload paths
- **Circuit breaker**: `src/lib/circuitBreaker.ts` wraps AssemblyAI and OpenAI calls — opens after 5 failures, 60s cooldown
- **Clip editor**: Clips have optional `edited*` fields (start/end time, caption edits, position, scale, color) that override AI-generated values when present. Null = use original
- **Aspect ratios**: VERTICAL (9:16), SQUARE (1:1), LANDSCAPE (16:9) — stored as `AspectRatio` enum on Clip
- **Dark mode**: Class-based toggle with localStorage persistence (Tailwind v4 `@custom-variant dark`)

## Environment Variables

Required for local dev: `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ASSEMBLYAI_API_KEY`, `OPENAI_API_KEY`, `STORAGE_TYPE` (local/s3), `STORAGE_PATH`. Razorpay keys needed for billing. See `.env` for full list.
