---
name: Infrastructure Scaling Plan — Lambda vs EC2
description: Cost comparison of Lambda vs EC2 for clip rendering at different user scales, with decision on when to migrate
type: project
---

## Current Setup (as of 2026-03-25)
- Running on EC2 (t3.medium), costs ~$15-30/month
- ~0-10 users, ~5 videos/month, ~25 clips/month
- Each clip render: ~30 seconds of compute

## Lambda vs EC2 Cost Comparison

| Users | Clips/Month | Lambda Cost | EC2 Cost |
|-------|-------------|-------------|----------|
| 5 | 25 | $0.07 | $30 (t3.medium) |
| 50 | 500 | $1.50 | $30 (t3.medium) |
| 200 | 2,000 | $6 | $30 (t3.medium) |
| 500 | 5,000 | $15 | $60 (t3.large) |
| 1,000 | 10,000 | $30 | $120+ (bigger instance) |

**Lambda is cheaper at every scale until ~1,000 users**, when costs converge. Lambda also auto-scales (100 simultaneous renders = no problem).

## Why NOT to Migrate Now

1. **Complexity** — Lambda + FFmpeg layer + S3 triggers + callbacks = 2-3 days of work
2. **Debugging is harder** — CloudWatch logs vs simple pm2 logs
3. **0 paying users** — $30/mo EC2 saving isn't worth the engineering time right now
4. **More things to break** — IAM roles, Lambda timeouts, cold starts, deployment pipeline

**Why:** The $30/mo saving doesn't justify 2-3 days of engineering + added operational complexity at the current stage. Focus on getting paying users first.

**How to apply:** Revisit Lambda migration when reaching ~50+ active users or when EC2 starts becoming a bottleneck (concurrent renders queueing up). Until then, stick with EC2 + BullMQ worker.
