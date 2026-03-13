import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessVideo } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { MAX_ACTIVE_JOBS_PER_USER, getPlanLimits } from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { JobType, JobStatus } from "@/generated/prisma";
import { getPreset, validatePreset } from "@/lib/video/presets";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  // Optional preset for platform-specific rendering
  let presetId: string | null = null;
  try {
    const body = await _req.json();
    if (typeof body?.presetId === "string") presetId = body.presetId;
  } catch { /* no body */ }
  const preset = presetId ? getPreset(presetId) : undefined;
  if (presetId && !preset) {
    return NextResponse.json({ error: `Unknown preset "${presetId}"` }, { status: 400 });
  }

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

  let pendingClips = video.clips.filter((c) => c.status === "PENDING");

  // If a preset is specified and no pending clips, allow re-rendering completed clips in the new format
  if (pendingClips.length === 0 && preset) {
    const completedClips = video.clips.filter((c) => c.status === "COMPLETED");
    if (completedClips.length > 0) {
      await prisma.clip.updateMany({
        where: { id: { in: completedClips.map((c) => c.id) }, videoId: id },
        data: { status: "PENDING", outputUrl: null, thumbnailUrl: null },
      });
      pendingClips = completedClips.map((c) => ({ ...c, status: "PENDING" as const }));
    }
  }

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

    // Filter out clips that exceed the preset's max duration
    const clipsToRender = preset
      ? pendingClips.filter((c) => !validatePreset(preset, c.endTime - c.startTime))
      : pendingClips;

    if (clipsToRender.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: preset
          ? `No clips fit within ${preset.label}'s ${preset.maxDurationSec}s limit`
          : "No clips to render",
      });
    }

    for (const clip of clipsToRender) {
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
          ...(preset && { presetId: preset.id }),
        },
        { jobId: dbJob.id, priority },
      );

      jobIds.push(dbJob.id);
    }

    return NextResponse.json({
      success: true,
      count: clipsToRender.length,
      jobIds,
      ...(preset && clipsToRender.length < pendingClips.length && {
        skipped: pendingClips.length - clipsToRender.length,
        message: `${pendingClips.length - clipsToRender.length} clip(s) skipped — exceeds ${preset.label}'s ${preset.maxDurationSec}s limit`,
      }),
    });
  } catch (error) {
    console.error("[API] Render all clips error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(error as Error) },
      { status: 500 },
    );
  }
}
