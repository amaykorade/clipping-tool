import { JobType } from "@/generated/prisma";
import { JobsOptions, Queue } from "bullmq";
import IORedis from "ioredis";

/** Transcription jobs (API-bound, slow) */
export const TRANSCRIBE_QUEUE_NAME = "video-transcription";
/** Clip rendering jobs (CPU-bound, parallelizable) */
export const RENDER_QUEUE_NAME = "clip-rendering";

/** @deprecated Use TRANSCRIBE_QUEUE_NAME or RENDER_QUEUE_NAME */
export const VIDEO_QUEUE_NAME = TRANSCRIBE_QUEUE_NAME;

export interface VideoJobData {
  type: JobType;
  videoId?: string;
  clipId?: string;
  /** Platform export preset ID (e.g. "tiktok", "instagram-reels") */
  presetId?: string;
}

// Lazy init: only create connection and queues when first used.
// Prevents ECONNREFUSED during Next.js build (Redis not needed for static generation).
let _connection: IORedis | null = null;
let _transcribeQueue: Queue<VideoJobData> | null = null;
let _renderQueue: Queue<VideoJobData> | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    _connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // Never "give up" reconnecting in production; a transient hiccup otherwise
      // leaves the app with a dead Redis socket (EPIPE/ECONNRESET on writes).
      retryStrategy(times) {
        return Math.min(Math.max(times, 1) * 500, 5000);
      },
      connectTimeout: 10_000,
      keepAlive: 1000,
      enableOfflineQueue: true,
      ...(redisUrl.startsWith("rediss://") && {
        tls: { rejectUnauthorized: true },
      }),
    });
    _connection.on("error", (err) => {
      console.error("[Queue] Redis connection error:", err.message);
    });
    _connection.on("reconnecting", () => {
      console.warn("[Queue] Redis reconnecting...");
    });
    _connection.on("ready", () => {
      console.log("[Queue] Redis connection ready");
    });
  }
  return _connection;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 10_000,
  },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500, age: 7 * 24 * 3600 },
};

function getTranscribeQueue(): Queue<VideoJobData> {
  if (!_transcribeQueue) {
    _transcribeQueue = new Queue<VideoJobData>(TRANSCRIBE_QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return _transcribeQueue;
}

function getRenderQueue(): Queue<VideoJobData> {
  if (!_renderQueue) {
    _renderQueue = new Queue<VideoJobData>(RENDER_QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return _renderQueue;
}

/** Smart proxy: routes jobs to the correct queue based on job type. */
export const videoQueue = {
  add: (name: string, data: VideoJobData, opts?: Parameters<Queue<VideoJobData>["add"]>[2]) => {
    if (data.type === JobType.GENERATE_CLIP || data.type === JobType.BATCH_EXPORT) {
      return getRenderQueue().add(name, data, opts);
    }
    return getTranscribeQueue().add(name, data, opts);
  },
};
