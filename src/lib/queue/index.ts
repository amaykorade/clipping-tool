import { JobType } from "@/generated/prisma";
import { JobsOptions, Queue } from "bullmq";
import IORedis from "ioredis";

export const VIDEO_QUEUE_NAME = "video-processing";

export interface VideoJobData {
  type: JobType;
  videoId?: string;
  clipId?: string;
}

// Lazy init: only create connection and queue when first used.
// Prevents ECONNREFUSED during Next.js build (Redis not needed for static generation).
let _videoQueue: Queue<VideoJobData> | null = null;

function getVideoQueue(): Queue<VideoJobData> {
  if (!_videoQueue) {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 500, 5000);
        return delay;
      },
      enableOfflineQueue: true,
      ...(redisUrl.startsWith("rediss://") && {
        tls: { rejectUnauthorized: true },
      }),
    });
    _videoQueue = new Queue<VideoJobData>(VIDEO_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 10_000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      } as JobsOptions,
    });
  }
  return _videoQueue;
}

export const videoQueue = {
  add: (...args: Parameters<Queue<VideoJobData>["add"]>) =>
    getVideoQueue().add(...args),
};
