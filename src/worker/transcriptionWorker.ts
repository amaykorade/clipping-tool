import { JobType, JobStatus, VideoStatus, ClipStatus } from "@/generated/prisma";
import {
  startTranscriptionFromFile,
  extractAudioAndStartTranscriptionFromFile,
  waitForTranscription,
} from "@/lib/ai/transcription";
import { prisma } from "@/lib/db";
import { TRANSCRIBE_QUEUE_NAME, RENDER_QUEUE_NAME, VideoJobData, videoQueue } from "@/lib/queue";
import path from "path";
import { getStorage } from "@/lib/storage";
import { getPlanLimits } from "@/lib/plans";
import { finalizePendingUpload } from "@/lib/video/upload";
import { renderAndUploadClip } from "@/lib/video/clipRenderer";
import { generateClipsFromTranscript } from "@/lib/video/generateClipsFromTranscript";
import { downloadYouTubeVideo } from "@/lib/video/youtube";
import { sendVideoReadyEmail, sendClipsRenderedEmail } from "@/lib/email";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Never "give up" reconnecting; workers should recover from transient Redis hiccups.
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

connection.on("error", (err) => {
  console.error("[Worker] Redis connection error:", err.message);
});
connection.on("reconnecting", () => {
  console.warn("[Worker] Redis reconnecting...");
});
connection.on("ready", () => {
  console.log("[Worker] Redis connection ready");
});

async function handleVideoJob(job: Job<VideoJobData>) {
  const { type, videoId, clipId, presetId } = job.data;

  console.log(
    `[Worker] Processing job ${job.id} type=${type} videoId=${videoId} clipId=${clipId}`,
  );

  if (type === JobType.DOWNLOAD) {
    if (!videoId) throw new Error("videoId required for DOWNLOAD job");

    const dbJob = await prisma.job.update({
      where: { id: job.id as string },
      data: { status: JobStatus.RUNNING, startedAt: new Date() },
    });

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new Error(`Video ${videoId} not found`);
    if (!video.originalUrl) throw new Error(`Video ${videoId} has no originalUrl`);

    await prisma.video.update({
      where: { id: videoId },
      data: { status: VideoStatus.DOWNLOADING },
    });

    const tmpPath = `/tmp/yt-${videoId}.mp4`;
    try {
      // Download YouTube video (0-60% of job progress)
      const { fileSize } = await downloadYouTubeVideo(
        video.originalUrl,
        tmpPath,
        async (pct) => {
          const overall = Math.round(pct * 0.6);
          await job.updateProgress(overall);
        },
      );
      await job.updateProgress(65);

      // Upload to pending storage (stream from disk to avoid OOM on large files)
      const pendingKey = `pending/${videoId}.mp4`;
      const storage = getStorage();
      const { createReadStream: createRS } = await import("fs");
      const fileStream = createRS(tmpPath);
      await storage.upload(fileStream, pendingKey, { contentType: "video/mp4", fileSize });
      await job.updateProgress(80);

      // Update video record
      await prisma.video.update({
        where: { id: videoId },
        data: { storageKey: pendingKey, fileSize, status: VideoStatus.UPLOADED },
      });

      // Mark download job completed
      await prisma.job.update({
        where: { id: dbJob.id },
        data: { status: JobStatus.COMPLETED, progress: 100, completedAt: new Date() },
      });
      await job.updateProgress(100);

      // Chain: enqueue TRANSCRIBE job
      const userForPriority = video.userId
        ? await prisma.user.findUnique({ where: { id: video.userId }, select: { plan: true } })
        : null;
      const priority = userForPriority ? getPlanLimits(userForPriority.plan).jobPriority : 3;

      const transcribeJob = await prisma.job.create({
        data: {
          type: JobType.TRANSCRIBE,
          status: JobStatus.QUEUED,
          videoId,
          progress: 0,
          maxRetries: 3,
        },
      });

      await videoQueue.add(
        "transcribe",
        { type: JobType.TRANSCRIBE, videoId },
        { jobId: transcribeJob.id, priority },
      );

      console.log(`[Worker] YouTube download completed for video ${videoId} (${Math.round(fileSize / 1024 / 1024)}MB), transcribe job queued`);
      return { videoId };
    } finally {
      const fs = await import("fs/promises");
      fs.unlink(tmpPath).catch(() => {});
    }
  }

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

    // Download video to temp file — avoids loading entire file into memory
    const storage = getStorage();
    const tmpTranscribePath = `/tmp/${videoId}-transcribe${path.extname(video.fileName) || ".mp4"}`;
    await storage.downloadToFile(video.storageKey, tmpTranscribePath);

    await job.updateProgress(10);
    await prisma.video.update({
      where: { id: videoId },
      data: { status: VideoStatus.TRANSCRIBING },
    });

    // Start transcription job with provider (stream file from disk)
    let externalId: string;
    let transcriptResult;
    try {
      const { id } = await startTranscriptionFromFile(tmpTranscribePath);
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
        const { id } = await extractAudioAndStartTranscriptionFromFile(tmpTranscribePath);
        externalId = id;
        await job.updateProgress(30);
        transcriptResult = await waitForTranscription(externalId);
      } else {
        throw err;
      }
    }

    const { transcript } = transcriptResult;
    await job.updateProgress(80);

    // Build plain-text for full-text search
    const transcriptText = (transcript as any)?.sentences?.length
      ? (transcript as any).sentences.map((s: { text: string }) => s.text).join(" ")
      : (transcript as any)?.words?.map((w: { text: string }) => w.text).join(" ") ?? "";

    // Save transcript to DB
    await prisma.video.update({
      where: { id: videoId },
      data: {
        transcript: transcript as any,
        transcriptText: transcriptText || null,
        transcribedAt: new Date(),
        status: VideoStatus.READY,
      },
    });

    // Estimate cost: AssemblyAI ~$0.37/hr = 0.62 cents/min
    const durationMin = (video.duration || 0) / 60;
    const transcriptionCostCents = Math.ceil(durationMin * 0.62);
    // OpenAI clip scoring ~$0.01 per call (GPT-4o-mini is very cheap)
    const scoringCostCents = 2; // rough estimate for 2 API calls
    const totalCostCents = transcriptionCostCents + scoringCostCents;

    await prisma.job.update({
      where: { id: dbJob.id },
      data: {
        status: JobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        externalCostCents: totalCostCents,
      },
    });

    await job.updateProgress(100);
    console.log(`[Worker] Transcription completed for video ${videoId} (est. cost: ${totalCostCents}¢)`);

    // Generate clip suggestions (9:16 for Insta Reels, TikTok, YT Shorts).
    // Rendering is on-demand: user clicks "Create video files" or "Render clip" to queue jobs.
    // Reuse the temp file from transcription for audio energy analysis during clip scoring.
    try {
      const clips = await generateClipsFromTranscript(videoId, {
        maxClips: 10,
        videoFilePath: tmpTranscribePath,
      });
      console.log(`[Worker] Generated ${clips.length} clips for video ${videoId} (render on demand)`);
    } catch (clipErr) {
      console.error(`[Worker] Clip generation failed for video ${videoId}:`, clipErr);
      // Don't fail the transcription job; clips can be generated manually later
    } finally {
      // Clean up temp file
      const fs = await import("fs/promises");
      fs.unlink(tmpTranscribePath).catch(() => {});
    }

    // Send email notification
    const videoForEmail = await prisma.video.findUnique({
      where: { id: videoId },
      select: { title: true, user: { select: { email: true } } },
    });
    if (videoForEmail?.user?.email) {
      sendVideoReadyEmail(videoForEmail.user.email, videoForEmail.title, videoId).catch(() => {});
    }

    return { videoId, externalId };
  }

  if (type === JobType.ANALYZE) {
    if (!videoId) throw new Error("videoId required for ANALYZE job");

    const dbJob = await prisma.job.update({
      where: { id: job.id as string },
      data: { status: JobStatus.RUNNING, startedAt: new Date() },
    });

    // Download video to temp file for audio energy analysis
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { storageKey: true },
    });
    const tmpPath = `/tmp/${videoId}-analyze.mp4`;
    let videoFilePath: string | undefined;
    try {
      if (video?.storageKey) {
        const storage = getStorage();
        await storage.downloadToFile(video.storageKey, tmpPath);
        videoFilePath = tmpPath;
      }
    } catch { /* proceed without audio energy */ }

    await job.updateProgress(10);

    try {
      const clips = await generateClipsFromTranscript(videoId, {
        maxClips: 10,
        videoFilePath,
      });
      console.log(`[Worker] Generated ${clips.length} clips for video ${videoId} (re-generation)`);

      await prisma.video.update({
        where: { id: videoId },
        data: { status: VideoStatus.READY },
      });

      await prisma.job.update({
        where: { id: dbJob.id },
        data: { status: JobStatus.COMPLETED, progress: 100, completedAt: new Date() },
      });
      await job.updateProgress(100);
    } catch (err) {
      console.error(`[Worker] Clip generation failed for video ${videoId}:`, err);
      // Restore to READY so user can retry (don't set ERROR — clips are optional)
      await prisma.video.update({
        where: { id: videoId },
        data: { status: VideoStatus.READY },
      });
      await prisma.job.update({
        where: { id: dbJob.id },
        data: { status: JobStatus.FAILED, error: (err as Error).message },
      });
    } finally {
      const fs = await import("fs/promises");
      fs.unlink(tmpPath).catch(() => {});
    }

    return { videoId };
  }

  if (type === JobType.GENERATE_CLIP) {
    if (!clipId) throw new Error("clipId required for GENERATE_CLIP job");

    console.log(`[Worker] Rendering clip ${clipId}`);

    const dbJob = await prisma.job.update({
      where: { id: job.id as string },
      data: { status: JobStatus.RUNNING, startedAt: new Date() },
    });

    await job.updateProgress(10);

    const outputUrl = await renderAndUploadClip(clipId, async (ffmpegPct) => {
      // Map FFmpeg 0-100% to overall job 10-90%
      const overall = Math.round(10 + (ffmpegPct * 0.8));
      await job.updateProgress(overall);
      await prisma.job.update({
        where: { id: dbJob.id },
        data: { progress: overall },
      }).catch(() => {});
    }, presetId);

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

    // Check if all clips for this video are now rendered, and send email
    if (clipId) {
      const clipRecord = await prisma.clip.findUnique({
        where: { id: clipId },
        select: { video: { select: { id: true, title: true, user: { select: { email: true } }, clips: { select: { status: true } } } } },
      });
      if (clipRecord?.video) {
        const allDone = clipRecord.video.clips.every((c) => c.status === "COMPLETED" || c.status === "ERROR");
        const completedCount = clipRecord.video.clips.filter((c) => c.status === "COMPLETED").length;
        if (allDone && completedCount > 0 && clipRecord.video.user?.email) {
          sendClipsRenderedEmail(clipRecord.video.user.email, clipRecord.video.title, clipRecord.video.id, completedCount).catch(() => {});
        }
      }
    }

    return { clipId, outputUrl };
  }

  console.warn("[Worker] Unsupported job type", type);
}

async function jobHandler(job: Job<VideoJobData>) {
  try {
    return await handleVideoJob(job);
  } catch (error) {
    console.error("[Worker] Job failed", job.id, error);
    const errMsg = (error as Error).message;
    await prisma.job.update({
      where: { id: job.id as string },
      data: {
        status: JobStatus.FAILED,
        error: errMsg,
      },
    });
    // Update Video to ERROR so the frontend stops polling and shows the failure
    if (job.data.videoId) {
      await prisma.video.update({
        where: { id: job.data.videoId },
        data: { status: VideoStatus.ERROR },
      }).catch(() => {});
    }
    // Update Clip to ERROR if this was a clip render job
    if (job.data.clipId) {
      await prisma.clip.update({
        where: { id: job.data.clipId },
        data: { status: ClipStatus.ERROR },
      }).catch(() => {});
    }
    throw error;
  }
}

function attachListeners(worker: Worker<VideoJobData>, label: string) {
  worker.on("completed", (job) => {
    console.log(`[${label}] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[${label}] Job ${job?.id} failed`, err);
  });
}

// Determine which queues to process based on WORKER_TYPE env var:
//   "transcribe" — only transcription jobs
//   "render"     — only clip rendering jobs
//   unset/""     — both (default, backward compatible)
const workerType = process.env.WORKER_TYPE || "";

const workers: Worker<VideoJobData>[] = [];

if (!workerType || workerType === "transcribe") {
  const transcribeWorker = new Worker<VideoJobData>(TRANSCRIBE_QUEUE_NAME, jobHandler, {
    connection,
    concurrency: 2,
    drainDelay: 30,
  });
  attachListeners(transcribeWorker, "Transcribe");
  workers.push(transcribeWorker);
  console.log("[Worker] Listening on transcription queue");
}

if (!workerType || workerType === "render") {
  const renderWorker = new Worker<VideoJobData>(RENDER_QUEUE_NAME, jobHandler, {
    connection,
    concurrency: 3,
    drainDelay: 30,
  });
  attachListeners(renderWorker, "Render");
  workers.push(renderWorker);
  console.log("[Worker] Listening on render queue");
}

// Graceful shutdown: let in-flight jobs finish, then close connections
async function shutdown(signal: string) {
  console.log(`[Worker] ${signal} received, shutting down gracefully...`);
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  console.log("[Worker] All workers closed");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { workers };
