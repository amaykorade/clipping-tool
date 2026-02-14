import { JobType } from "@/generated/prisma";
import { JobsOptions, Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    // Required by BullMQ when using ioredis
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
);

export const VIDEO_QUEUE_NAME = "video-processing";

export interface VideoJobData {
  type: JobType;
  videoId?: string;
  clipId?: string;
}

export const videoQueue = new Queue<VideoJobData>(VIDEO_QUEUE_NAME, {
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

export const videoQueueEvents = new QueueEvents(VIDEO_QUEUE_NAME, {
  connection,
});
