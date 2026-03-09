import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessVideo } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { MAX_ACTIVE_JOBS_PER_USER, getPlanLimits } from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { JobType, JobStatus } from "@/generated/prisma";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  const video = await prisma.video.findUnique({
    where: { id },
    include: { clips: true, user: { select: { plan: true } } },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (!canAccessVideo(video, session)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (session?.user?.id) {
    const rl = checkRateLimit(`render:${session.user.id}`, RATE_LIMITS.render);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);
  }

  const pendingClips = video.clips.filter((c) => c.status === "PENDING");

  if (pendingClips.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No clips to render",
    });
  }

  try {
    // Check concurrent job limit
    if (video.userId) {
      const activeJobs = await prisma.job.count({
        where: {
          video: { userId: video.userId },
          status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
        },
      });
      if (activeJobs >= MAX_ACTIVE_JOBS_PER_USER) {
        return NextResponse.json(
          { error: `You have ${activeJobs} jobs in progress. Please wait for some to finish.` },
          { status: 429 },
        );
      }
    }

    const { videoQueue } = await import("@/lib/queue");
    const jobIds: string[] = [];

    for (const clip of pendingClips) {
      const dbJob = await prisma.job.create({
        data: {
          type: JobType.GENERATE_CLIP,
          status: JobStatus.QUEUED,
          videoId: video.id,
          clipId: clip.id,
          progress: 0,
        },
      });

      const priority = video.user ? getPlanLimits(video.user.plan).jobPriority : 3;
      await videoQueue.add(
        "generate-clip",
        {
          type: JobType.GENERATE_CLIP,
          clipId: clip.id,
        },
        { jobId: dbJob.id, priority },
      );

      jobIds.push(dbJob.id);
    }

    return NextResponse.json({
      success: true,
      count: pendingClips.length,
      jobIds,
    });
  } catch (error) {
    console.error("[API] Render all clips error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(error as Error) },
      { status: 500 },
    );
  }
}
