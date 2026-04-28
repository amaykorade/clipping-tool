import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { videoQueue } from "@/lib/queue";
import { JobType, JobStatus, VideoStatus } from "@/generated/prisma";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let videoId: string | null = null;
  let previousStatus: VideoStatus | null = null;
  let dbJobId: string | null = null;
  try {
    const params = await context.params;
    videoId = params.id;
    const session = await getSession();
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true, status: true },
    });
    if (!video || !canAccessVideo(video, session)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    previousStatus = video.status;

    if (session?.user?.id) {
      const rl = checkRateLimit(`generateClips:${session.user.id}`, RATE_LIMITS.generateClips);
      if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);
    }

    // Check if clip generation is already in progress
    if (video.status === "ANALYZING") {
      return NextResponse.json(
        { error: "Clip generation is already in progress" },
        { status: 409 },
      );
    }

    // Set status to ANALYZING so UI shows processing state (survives page refresh)
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "ANALYZING" },
    });

    // Enqueue background job for clip generation (avoids nginx 504 timeout)
    const dbJob = await prisma.job.create({
      data: {
        type: JobType.ANALYZE,
        status: JobStatus.QUEUED,
        videoId,
        progress: 0,
        maxRetries: 3,
      },
    });
    dbJobId = dbJob.id;

    await videoQueue.add(
      "analyze",
      { type: JobType.ANALYZE, videoId },
      { jobId: dbJob.id },
    );

    return NextResponse.json({ queued: true });
  } catch (err) {
    console.error("[generate-clips]", err);
    // If enqueue fails (Redis/queue outage), revert video status so user can retry.
    // Also mark the DB job as failed so we don't leave "QUEUED" jobs forever.
    if (videoId && previousStatus) {
      try {
        await prisma.video.update({
          where: { id: videoId },
          data: { status: previousStatus },
        });
      } catch (e) {
        console.error("[generate-clips] Failed to revert video status:", e);
      }
    }
    if (dbJobId) {
      try {
        await prisma.job.update({
          where: { id: dbJobId },
          data: { status: JobStatus.FAILED },
        });
      } catch (e) {
        console.error("[generate-clips] Failed to mark job failed:", e);
      }
    }
    const rawMsg = (err as Error).message || "";
    const status =
      rawMsg.includes("not found") ? 404
      : rawMsg.includes("transcribed") || rawMsg.includes("No transcript") ? 400
      : 500;
    const message = status < 500 ? rawMsg : getSafeApiErrorMessage(err as Error);
    return NextResponse.json({ error: message }, { status });
  }
}
