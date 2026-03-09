# Clipflow Roadmap & Issue Tracker

> Last updated: 2026-03-09
> Mark items with `[x]` when completed. Add completion date in parentheses.

---

## 1. BUGS (Fix Immediately)

- [x] **BUG-001**: Clip download quota period calculation broken at year boundaries (2026-03-09)
  - File: `src/app/api/clips/[id]/download/route.ts`
  - Issue: `now.getMonth() > periodStart.getMonth()` fails when crossing year boundary (Dec→Jan). Period never resets.
  - Fix: Compare `year * 12 + month` or use `!isSameMonth` check.

- [x] **BUG-002**: Legacy videos (userId=null) accessible without authentication (2026-03-09)
  - Files: `src/lib/auth.ts` → `canAccessVideo()`
  - Issue: `canAccessVideo()` returns `true` when `video.userId` is null, allowing unauthenticated users to trigger expensive render/delete jobs.
  - Fix: Add `requireAuth()` gate before `canAccessVideo()` on all mutation endpoints.

- [x] **BUG-003**: Webhook handler has no idempotency — duplicate events processed twice (2026-03-09)
  - File: `src/app/api/webhooks/razorpay/route.ts`
  - Issue: If Razorpay retries a webhook, quotas reset twice and subscription state can corrupt.
  - Fix: Store processed webhook event IDs in DB, skip duplicates.

- [x] **BUG-004**: `Storage.download()` loads entire file into memory (OOM on large files) (2026-03-09)
  - File: `src/lib/storage/index.ts` → `S3Storage.download()`
  - Issue: `Buffer.from(await res.Body.transformToByteArray())` loads full 3GB file into RAM.
  - Fix: Return `Readable` stream instead of `Buffer`.

- [x] **BUG-005**: ~~FFprobe runs twice per upload~~ — NOT A BUG (2026-03-09)
  - `validateVideo()` is only called once in `finalizePendingUpload()` (worker path). API layer only checks plan quota, not FFprobe. No fix needed.

---

## 2. SECURITY (High Priority)

- [x] **SEC-001**: No rate limiting on any API endpoint (2026-03-09)
  - Files: All routes in `src/app/api/`
  - Risk: Users can spam uploads, renders, subscription creation indefinitely.
  - Fix: Add Redis-based rate limiting (5 uploads/hr, 20 renders/hr, 10 subscription calls/hr per user).

- [x] **SEC-002**: No file extension whitelist on upload (2026-03-09)
  - File: `src/lib/video/upload.ts`
  - Risk: Arbitrary file extensions accepted (`.exe`, `.sh`, etc.).
  - Fix: Restrict to `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`.

- [x] **SEC-003**: No server-side MIME type validation (2026-03-09)
  - File: `src/lib/storage/index.ts`
  - Risk: Client-provided content type is trusted blindly.
  - Fix: Validate against allowed video MIME types before storage.

- [x] **SEC-004**: Razorpay error messages leak to client (2026-03-09)
  - File: `src/app/api/subscription/create/route.ts`
  - Risk: `err.message` containing "Razorpay" is returned directly, exposing internals.
  - Fix: Return sanitized generic messages.

- [x] **SEC-005**: No concurrent job limit per user (2026-03-09)
  - Files: `src/lib/queue/index.ts`, API routes that enqueue jobs
  - Risk: Single user can queue hundreds of expensive transcription/render jobs.
  - Fix: Check active job count before enqueuing, cap at 3-5 per user.

- [x] **SEC-006**: Subscription switching has race condition (2026-03-09)
  - File: `src/app/api/subscription/create/route.ts`
  - Risk: Two concurrent plan-switch requests can both succeed, creating duplicate subscriptions.
  - Fix: Use database transaction with row-level locking.

---

## 3. PERFORMANCE (Short Term)

- [x] **PERF-001**: No pagination on video list API (2026-03-09)
  - File: `src/app/api/videos/route.ts`
  - Issue: Returns ALL videos for a user. Breaks with 200+ videos.
  - Fix: Add `?page=1&limit=20` with total count in response.

- [x] **PERF-002**: Missing composite database indexes (2026-03-09)
  - File: `prisma/schema.prisma`
  - Add:
    - `Video: @@index([userId, createdAt])`
    - `Clip: @@index([videoId, status])`
    - `Job: @@index([videoId, status])`

- [x] **PERF-003**: Job priority field exists but is never used (2026-03-09)
  - Files: `src/lib/plans.ts`, `src/worker/transcriptionWorker.ts`
  - Issue: `getPlanLimits()` returns `jobPriority` (1/2/3) but BullMQ doesn't read it.
  - Fix: Pass priority when adding jobs, configure worker to respect it.

- [x] **PERF-004**: Monolithic worker handles both transcription and rendering (2026-03-09)
  - File: `src/worker/transcriptionWorker.ts`
  - Issue: Slow transcription (API-bound) blocks clip rendering (CPU-bound).
  - Fix: Split into `transcription-worker` and `rendering-worker` processes.

- [x] **PERF-005**: No dead letter queue for failed jobs (2026-03-09)
  - File: `src/lib/queue/index.ts`
  - Issue: Jobs retry 3 times then disappear. No way to inspect or retry.
  - Fix: Configure BullMQ's built-in DLQ.

- [x] **PERF-006**: No video compression on upload (2026-03-09)
  - Issue: Source videos stored as-is. 3GB file stays 3GB.
  - Fix: Compress during finalization (H.264 CRF 23 at 5Mbps) — can reduce 80%.

---

## 4. UX POLISH (Short Term)

- [x] **UX-001**: Inconsistent feedback patterns across pages (2026-03-09)
  - Issue: Mix of `alert()`, custom toasts, and inline errors.
  - Fix: Standardize everything to a global toast notification system.

- [x] **UX-002**: Clip rendering shows spinner but no progress percentage (2026-03-09)
  - Issue: Unlike transcription which shows %, clip rendering is just a spinner.
  - Fix: Add progress tracking to render jobs.

- [x] **UX-003**: All pages use plain spinners instead of skeleton loading (2026-03-09)
  - Fix: Add skeleton screens (content placeholders) for videos grid, clip cards, account page.

- [x] **UX-004**: No dark mode (2026-03-09)
  - Fix: Add Tailwind dark mode support. Many creators work late at night.

- [x] **UX-005**: Toast notifications not screen-reader accessible (2026-03-09)
  - Issue: Missing `role="alert"` and `aria-live="polite"` attributes.
  - Fix: Add ARIA attributes to toast component.

- [x] **UX-006**: Status badges rely on color alone (2026-03-09)
  - Issue: Colorblind users can't distinguish status.
  - Fix: Add icons alongside color indicators.

---

## 5. FEATURES — Tier 1 (High Impact, Differentiators)

- [ ] **FEAT-001**: Direct social media publishing
  - Connect TikTok, Instagram, YouTube accounts.
  - Publish clips directly from dashboard.
  - Schedule clips for optimal posting times.
  - Why: Eliminates the download→re-upload workflow creators hate.

- [ ] **FEAT-002**: Clip editor (browser-based)
  - Trim start/end points of AI-generated clips.
  - Choose caption style (font, color, position, animation).
  - Pick aspect ratio per clip.
  - Add intro/outro overlays or brand logos.
  - Preview before rendering.
  - Why: Turns "decent AI output" into "exactly what I want."

- [x] **FEAT-003**: Platform-specific export presets (2026-03-09)
  - TikTok: 9:16, 1080x1920, <60s
  - Instagram Reels: 9:16, 1080x1920, <90s
  - YouTube Shorts: 9:16, 1080x1920, <60s
  - Twitter/X: 16:9 or 1:1, <2:20
  - LinkedIn: 1:1 or 16:9, <10 min
  - Auto-adjust resolution, duration, encoding per platform.

- [x] **FEAT-004**: Multi-speaker detection & per-speaker clips (2026-03-09)
  - Store AssemblyAI speaker labels (currently discarded).
  - Generate clips featuring specific speakers.
  - Filter clips by speaker in UI.
  - Show speaker names in clip browser.
  - Why: Essential for podcast/interview content.

- [x] **FEAT-005**: Transcript search across all videos (2026-03-09)
  - Store transcript as searchable text field in DB.
  - Search across ALL videos: "Find every time I talked about pricing."
  - Jump to timestamp from search results.
  - Why: Alone justifies a PRO subscription.

---

## 6. FEATURES — Tier 2 (Retention Drivers)

- [x] **FEAT-006**: Analytics dashboard (2026-03-09)
  - User-facing: Videos processed vs. plan limit, avg clips/video, storage used, top clips by score, download history.
  - Admin-facing: Revenue/user, churn indicators, API costs/user, queue health.

- [x] **FEAT-007**: Batch download as ZIP (2026-03-09)
  - "Download All Clips" button on video detail page.
  - Generate ZIP with all rendered clips.
  - Why: Users with 8-10 clips per video don't want 10 separate downloads.

- [x] **FEAT-008**: SRT/VTT subtitle export (2026-03-09)
  - Export transcripts as `.srt`, `.vtt`, `.txt`.
  - Word-level timestamps already exist.
  - Why: Creators use subtitles in Premiere, DaVinci, CapCut.

- [x] **FEAT-009**: Custom branding / watermark (PRO tier) (2026-03-09)
  - Replace hardcoded "Kllivo" watermark with user's own logo.
  - Upload logo, set position, transparency.
  - Why: Classic SaaS upsell that PRO users expect.

- [x] **FEAT-010**: Clip regeneration with feedback (2026-03-09)
  - "I don't like this clip" / "More like this one" buttons.
  - Feed user feedback into LLM prompt for next generation.
  - Why: Creates per-user improvement loop.

- [ ] **FEAT-011**: Team / workspace support
  - Multiple users under one subscription.
  - Shared video library and clips.
  - Role-based access (admin, editor, viewer).
  - Why: Unlocks agency/enterprise pricing ($99-299/mo).

---

## 7. FEATURES — Tier 3 (Polish & Growth)

- [x] **FEAT-012**: Email notifications (2026-03-09)
  - "Your video is ready" (processing complete).
  - "Your clips are rendered."
  - Weekly digest: "You have 3 unused uploads this month."
  - Quota warnings: "You've used 8/10 videos."

- [ ] **FEAT-013**: Promo codes & trial periods
  - 7-day free trial of STARTER plan.
  - Promo codes for partnerships / influencer deals.
  - Referral program ("Give a friend 1 month free, get 1 month free").

- [x] **FEAT-014**: Video chapters / timestamps (2026-03-09)
  - Generate YouTube-style chapter timestamps from semantic segmentation.
  - Copy-paste into YouTube description.
  - Why: Free feature that drives organic traffic.

- [x] **FEAT-015**: Thumbnail generation for clips (2026-03-09)
  - Auto-generate thumbnail images (best frame detection).
  - Useful for social media posting.

- [ ] **FEAT-016**: Public API for power users
  - REST API: Upload videos, poll for clips, download programmatically.
  - API keys, rate limits, usage tracking.
  - Zapier/Make integration.
  - Why: Unlocks automation workflows.

- [ ] **FEAT-017**: Multi-language UI
  - Translate UI to Hindi, Spanish, Portuguese, Japanese.
  - AI already handles multi-language transcription.

- [ ] **FEAT-018**: Admin panel
  - User management (search, view plans, usage).
  - Subscription diagnostics (failed webhooks, stuck jobs).
  - Queue health monitoring.
  - Revenue metrics.
  - Manual plan overrides for support cases.

---

## 8. INFRASTRUCTURE (Scale)

- [ ] **INFRA-001**: CDN for clip delivery
  - Serve rendered clips via CloudFront/Cloudflare instead of direct S3.
  - Reduces latency and bandwidth costs.

- [x] **INFRA-002**: Circuit breakers for external APIs (2026-03-09)
  - If AssemblyAI or OpenAI goes down, system keeps failing.
  - Short-circuit after 5 consecutive failures, retry after 60s.

- [ ] **INFRA-003**: GDPR compliance
  - Data export (download all my data).
  - Account deletion (purge everything).
  - Required for EU users.

- [ ] **INFRA-004**: Audit logging
  - Track plan changes, video deletions, subscription modifications.
  - Required for billing dispute resolution.

- [x] **INFRA-005**: Cost tracking per job (2026-03-09)
  - Add `externalApiCost` field to Job model.
  - Track AssemblyAI, OpenAI, and storage costs per user.
  - Calculate per-user profitability.

---

## 9. COMPLETION SUMMARY

> Updated: 2026-03-09

### Completed (36/46)

| Category | Items | Done |
|----------|-------|------|
| Bugs | BUG-001 to BUG-005 | 5/5 |
| Security | SEC-001 to SEC-006 | 6/6 |
| Performance | PERF-001 to PERF-006 | 6/6 |
| UX Polish | UX-001 to UX-006 | 6/6 |
| Features — Tier 1 | FEAT-003, FEAT-004, FEAT-005 | 3/5 |
| Features — Tier 2 | FEAT-006 to FEAT-010 | 5/6 |
| Features — Tier 3 | FEAT-012, FEAT-014, FEAT-015 | 3/6 |
| Infrastructure | INFRA-002, INFRA-005 | 2/5 |

### Remaining (10/46)

**Features — High Impact (2):**
- [ ] FEAT-001 — Direct social media publishing (TikTok/Instagram/YouTube OAuth, scheduling)
- [ ] FEAT-002 — Browser-based clip editor (trim, captions, aspect ratio, preview)

**Features — Retention (1):**
- [ ] FEAT-011 — Team/workspace support (multi-user, roles, shared library)

**Features — Growth (3):**
- [ ] FEAT-013 — Promo codes & trial periods (7-day trial, referral program)
- [ ] FEAT-016 — Public API (REST API, API keys, Zapier/Make)
- [ ] FEAT-017 — Multi-language UI (Hindi, Spanish, Portuguese, Japanese)
- [ ] FEAT-018 — Admin panel (user management, diagnostics, revenue metrics)

**Infrastructure (3):**
- [ ] INFRA-001 — CDN for clip delivery (CloudFront/Cloudflare)
- [ ] INFRA-003 — GDPR compliance (data export, account deletion)
- [ ] INFRA-004 — Audit logging (plan changes, deletions, billing disputes)

### Suggested Next Priorities

| Priority | Item | Rationale |
|----------|------|-----------|
| **1** | FEAT-018 (Admin panel) | Needed for support, debugging, revenue visibility |
| **2** | INFRA-003 (GDPR) | Legal requirement for EU users |
| **3** | FEAT-013 (Promos/trials) | Growth lever — free trials convert well |
| **4** | FEAT-001 (Social publishing) | Biggest differentiator, but largest effort |
| **5** | FEAT-011 (Teams) | Unlocks enterprise pricing tier |
| **6** | FEAT-002 (Clip editor) | High value but significant frontend effort |
| **7** | INFRA-001 (CDN) | Performance/cost optimization — do when scale demands |
| **8** | FEAT-016 (Public API) | Power user feature — do after core is polished |
| **9** | INFRA-004 (Audit logging) | Nice-to-have for billing disputes |
| **10** | FEAT-017 (Multi-language) | Market expansion — do when entering new markets |
