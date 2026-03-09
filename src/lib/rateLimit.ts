import { NextResponse } from "next/server";

/**
 * Simple in-memory sliding window rate limiter.
 * Uses a Map of userId → timestamps[]. Entries are cleaned up on each check.
 *
 * For a single-server setup this is sufficient. For multi-server, switch to Redis
 * (e.g., store counts in Redis with TTL keys).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3600_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60_000);

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Check if a request is within rate limits.
 * Returns { ok: true } if allowed, { ok: false, retryAfterMs } if blocked.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.max) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  entry.timestamps.push(now);
  return { ok: true };
}

/**
 * Rate limit presets for different endpoints.
 */
export const RATE_LIMITS = {
  upload: { max: 10, windowMs: 60 * 60_000 } as RateLimitConfig, // 10 per hour
  render: { max: 30, windowMs: 60 * 60_000 } as RateLimitConfig, // 30 per hour
  subscription: { max: 10, windowMs: 60 * 60_000 } as RateLimitConfig, // 10 per hour
  download: { max: 100, windowMs: 60 * 60_000 } as RateLimitConfig, // 100 per hour
  generateClips: { max: 20, windowMs: 60 * 60_000 } as RateLimitConfig, // 20 per hour
} as const;

/**
 * Helper: return a 429 response with Retry-After header.
 */
export function rateLimitResponse(retryAfterMs: number): NextResponse {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
