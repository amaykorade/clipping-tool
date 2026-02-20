import { JobType, JobStatus, VideoStatus } from "@/generated/prisma";
import {
  startTranscriptionFromBuffer,
  extractAudioAndStartTranscription,
  waitForTranscription,
} from "@/lib/ai/transcription";
import { prisma } from "@/lib/db";
import { VIDEO_QUEUE_NAME, videoQueue, VideoJobData } from "@/lib/queue";
import { getStorage } from "@/lib/storage";
import { finalizePendingUpload } from "@/lib/video/upload";
import { renderAndUploadClip } from "@/lib/video/clipRenderer";
import { generateClipsFromTranscript } from "@/lib/video/generateClipsFromTranscript";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";

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

async function handleVideoJob(job: Job<VideoJobData>) {
  const { type, videoId, clipId } = job.data;

  console.log(
    `[Worker] Processing job ${job.id} type=${type} videoId=${videoId} clipId=${clipId}`,
  );

  if (type === JobType.TRANSCRIBE) {
    if (!videoId) throw new Error("videoId required for TRANSCRIBE job");

    // Mark job as RUNNING in database
    const dbJob = await prisma.job.update({
      where: { id: job.id as string },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    let video = await prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    // If this was a fast-path upload (pending/), finalize first: ffmpeg + move to final storage
    if (video.storageKey.startsWith("pending/")) {
      console.log(`[Worker] Finalizing pending upload for video ${videoId}`);
      await finalizePendingUpload(videoId);
      video = await prisma.video.findUnique({ where: { id: videoId } });
      if (!video) throw new Error(`Video ${videoId} not found after finalize`);
    }

    // Get the file data from storage
    const storage = getStorage();
    const fileBuffer = await storage.download(video.storageKey);

    await job.updateProgress(10);
    await prisma.video.update({
      where: { id: videoId },
      data: { status: VideoStatus.TRANSCRIBING },
    });

    // Start transcription job with provider (upload file data directly)
    let externalId: string;
    let transcriptResult;
    try {
      const { id } = await startTranscriptionFromBuffer(fileBuffer);
      externalId = id;
      await job.updateProgress(30);
      transcriptResult = await waitForTranscription(externalId);
    } catch (err) {
      const msg = (err as Error).message || "";
      // Fallback: if provider claims the file has no audio, extract audio via ffmpeg and retry
      if (msg.includes("does not appear to contain audio")) {
        console.warn(
          "[Transcription] Provider reported no audio, extracting audio track and retrying...",
        );
        const { id } = await extractAudioAndStartTranscription(fileBuffer);
        externalId = id;
        await job.updateProgress(30);
        transcriptResult = await waitForTranscription(externalId);
      } else {
        throw err;
      }
    }

    const { transcript } = transcriptResult;
    await job.updateProgress(80);

    // Save transcript to DB
    await prisma.video.update({
      where: { id: videoId },
      data: {
        transcript: transcript as any,
        transcribedAt: new Date(),
        status: VideoStatus.READY,
      },
    });

    await prisma.job.update({
      where: { id: dbJob.id },
      data: {
        status: JobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
      },
    });

    await job.updateProgress(100);
    console.log(`[Worker] Transcription completed for video ${videoId}`);

    // Auto-generate short-form clips (9:16 for Insta Reels, TikTok, YT Shorts)
    try {
      const clips = await generateClipsFromTranscript(videoId, { maxClips: 10 });
      console.log(`[Worker] Generated ${clips.length} clips for video ${videoId}`);

      // Queue render job for each clip so they become ready-to-download shorts
      for (const clip of clips) {
        const dbRenderJob = await prisma.job.create({
          data: {
            type: JobType.GENERATE_CLIP,
            status: JobStatus.QUEUED,
            videoId,
            progress: 0,
          },
        });
        await videoQueue.add(
          "generate-clip",
          { type: JobType.GENERATE_CLIP, clipId: clip.id },
          { jobId: dbRenderJob.id },
        );
      }
      if (clips.length > 0) {
        console.log(`[Worker] Queued ${clips.length} clip render jobs for video ${videoId}`);
      }
    } catch (clipErr) {
      console.error(`[Worker] Clip generation failed for video ${videoId}:`, clipErr);
      // Don't fail the transcription job; clips can be generated manually later
    }

    return { videoId, externalId };
  }

  if (type === JobType.GENERATE_CLIP) {
    if (!clipId) throw new Error("clipId required for GENERATE_CLIP job");

    console.log(`[Worker] Rendering clip ${clipId}`);

    const dbJob = await prisma.job.update({
      where: { id: job.id as string },
      data: { status: JobStatus.RUNNING, startedAt: new Date() },
    });

    await job.updateProgress(10);

    const outputUrl = await renderAndUploadClip(clipId);

    await job.updateProgress(90);

    await prisma.job.update({
      where: { id: dbJob.id },
      data: {
        status: JobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
      },
    });

    await job.updateProgress(100);
    console.log(`[Worker] Clip rendered: ${outputUrl}`);

    return { clipId, outputUrl };
  }

  console.warn("[Worker] Unsupported job type", type);
}

export const videoWorker = new Worker<VideoJobData>(
  VIDEO_QUEUE_NAME,
  async (job) => {
    try {
      return await handleVideoJob(job);
    } catch (error) {
      console.error("[Worker] Job failed", job.id, error);
      await prisma.job.update({
        where: { id: job.id as string },
        data: {
          status: JobStatus.FAILED,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  },
  { connection },
);

videoWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

videoWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed`, err);
});
