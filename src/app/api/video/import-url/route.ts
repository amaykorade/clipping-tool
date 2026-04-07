import { JobStatus, JobType, VideoStatus } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import {
  canUploadVideo,
  formatFileSize,
  getMaxUploadSizeBytes,
  getPlanLimits,
  MAX_ACTIVE_JOBS_PER_USER,
} from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import {
  isValidYouTubeUrl,
  getYouTubeVideoInfo,
  YouTubeError,
} from "@/lib/video/youtube";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ImportUrlSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  title: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const rl = checkRateLimit(`upload:${user.id}`, RATE_LIMITS.upload);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);

    const body = await request.json();
    const validation = ImportUrlSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { url, title } = validation.data;

    if (!isValidYouTubeUrl(url)) {
      return NextResponse.json(
        { error: "Only YouTube URLs are supported. Paste a youtube.com or youtu.be link." },
        { status: 400 },
      );
    }

    // Fetch metadata (fast, no download)
    let info;
    try {
      info = await getYouTubeVideoInfo(url);
    } catch (err) {
      console.error("[Import URL] YouTube fetch failed:", (err as Error).message);
      if (err instanceof YouTubeError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    if (info.isLive) {
      return NextResponse.json(
        { error: "Live streams cannot be imported. Wait until the stream ends." },
        { status: 400 },
      );
    }

    // Check plan limits
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        plan: true,
        totalVideosUploaded: true,
        billingInterval: true,
      },
    });
    const plan = (userRecord?.plan ?? "FREE") as "FREE" | "STARTER" | "PRO";
    const limits = getPlanLimits(plan);

    // Duration check
    const uploadCheck = canUploadVideo(
      plan,
      userRecord?.totalVideosUploaded ?? 0,
      info.duration,
      userRecord?.billingInterval as "monthly" | "yearly" | null | undefined,
    );
    if (!uploadCheck.ok) {
      return NextResponse.json({ error: uploadCheck.error }, { status: 400 });
    }

    // Size check (approximate — allow 30% tolerance since yt-dlp estimates are imprecise)
    const maxBytes = getMaxUploadSizeBytes(plan);
    if (info.filesizeApprox > maxBytes * 1.3) {
      return NextResponse.json(
        {
          error: `This video is approximately ${formatFileSize(info.filesizeApprox)}. Your plan allows up to ${formatFileSize(maxBytes)} per video.`,
        },
        { status: 400 },
      );
    }

    // Concurrent job limit
    const activeJobs = await prisma.job.count({
      where: {
        video: { userId: user.id },
        status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
      },
    });
    if (activeJobs >= MAX_ACTIVE_JOBS_PER_USER) {
      return NextResponse.json(
        { error: `You have ${activeJobs} jobs in progress. Please wait for some to finish.` },
        { status: 429 },
      );
    }

    // Create video record + increment upload counter
    const videoTitle = title || info.title || "Untitled";
    const videoId = crypto.randomUUID();

    await prisma.$transaction([
      prisma.video.create({
        data: {
          id: videoId,
          title: videoTitle,
          originalUrl: url,
          fileName: `youtube-${info.id}.mp4`,
          fileSize: info.filesizeApprox || 0,
          duration: info.duration || 0,
          storageKey: `pending/yt-${videoId}.mp4`,
          thumbnailUrl: info.thumbnail || null,
          status: VideoStatus.DOWNLOADING,
          userId: user.id,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { totalVideosUploaded: { increment: 1 } },
      }),
    ]);

    // Create download job and enqueue
    const dbJob = await prisma.job.create({
      data: {
        type: JobType.DOWNLOAD,
        status: JobStatus.QUEUED,
        videoId,
        progress: 0,
        maxRetries: 2,
      },
    });

    const priority = limits.jobPriority;
    const { videoQueue } = await import("@/lib/queue");
    await videoQueue.add(
      "download",
      { type: JobType.DOWNLOAD, videoId },
      { jobId: dbJob.id, priority },
    );

    return NextResponse.json({
      success: true,
      video: {
        id: videoId,
        title: videoTitle,
        status: "DOWNLOADING",
        thumbnail: info.thumbnail,
        duration: info.duration,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("[API] Import URL error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(err) },
      { status: err?.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
