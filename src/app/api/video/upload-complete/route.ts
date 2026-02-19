import { JobStatus, JobType } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CompleteSchema = z.object({
  videoId: z.string().min(1, "videoId is required"),
});

/**
 * POST /api/video/upload-complete
 * Called after the client has finished uploading the file directly to S3.
 * Creates the job and adds it to the queue for processing.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = CompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 },
      );
    }
    const { videoId } = parsed.data;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true, storageKey: true },
    });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (video.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userWithPlan = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });
    const { getPlanLimits } = await import("@/lib/plans");
    const priority = userWithPlan
      ? getPlanLimits(userWithPlan.plan).jobPriority
      : 1;

    const dbJob = await prisma.job.create({
      data: {
        type: JobType.TRANSCRIBE,
        status: JobStatus.QUEUED,
        videoId,
        progress: 0,
        maxRetries: 3,
      },
    });

    const { videoQueue } = await import("@/lib/queue");
    await videoQueue.add(
      "transcribe",
      { type: JobType.TRANSCRIBE, videoId },
      { jobId: dbJob.id, priority },
    );

    const videoFull = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true, fileName: true, storageKey: true },
    });
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();

    return NextResponse.json({
      success: true,
      video: {
        id: videoFull!.id,
        title: videoFull!.title,
        url: storage.getUrl(videoFull!.storageKey),
        thumbnailUrl: null,
        metadata: { duration: 0, fileSize: 0 },
      },
    });
  } catch (error) {
    const err = error as Error;
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }
    console.error("[API] Upload complete error:", error);
    return NextResponse.json(
      { error: err.message || "Failed to complete upload" },
      { status: 500 },
    );
  }
}
