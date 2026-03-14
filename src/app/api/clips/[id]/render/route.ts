import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessVideo } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { MAX_ACTIVE_JOBS_PER_USER, getPlanLimits } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { JobType, JobStatus } from "@/generated/prisma";
import { getPreset, validatePreset } from "@/lib/video/presets";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  const clip = await prisma.clip.findUnique({
    where: { id },
    include: { video: { include: { user: { select: { plan: true } } } } },
  });

  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }
  if (!clip.video || !canAccessVideo(clip.video, session)) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  if (session?.user?.id) {
    const rl = checkRateLimit(`render:${session.user.id}`, RATE_LIMITS.render);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);
  }

  // Optional preset for platform-specific rendering (query param or JSON body)
  let presetId = _req.nextUrl.searchParams.get("preset");
  if (!presetId) {
    try {
      const body = await _req.json();
      if (typeof body?.presetId === "string") presetId = body.presetId;
    } catch { /* no body */ }
  }
  const preset = presetId ? getPreset(presetId) : undefined;
  if (presetId && !preset) {
    return NextResponse.json({ error: `Unknown preset "${presetId}"` }, { status: 400 });
  }
  if (preset) {
    const clipDuration = clip.endTime - clip.startTime;
    const err = validatePreset(preset, clipDuration);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  // Allow re-rendering in a different format; skip if same format already rendered
  if (clip.status === "COMPLETED" && !preset) {
    return NextResponse.json({
      success: true,
      message: "Clip already rendered",
      outputUrl: clip.outputUrl,
    });
  }

  try {
    // Check concurrent job limit
    if (clip.video.userId) {
      const activeJobs = await prisma.job.count({
        where: {
          video: { userId: clip.video.userId },
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

    // Atomic: reset clip status + create job in one transaction
    const dbJob = await prisma.$transaction(async (tx) => {
      if (clip.status === "COMPLETED" && preset) {
        await tx.clip.update({
          where: { id },
          data: { status: "PENDING", outputUrl: null, thumbnailUrl: null },
        });
      }
      return tx.job.create({
        data: {
          type: JobType.GENERATE_CLIP,
          status: JobStatus.QUEUED,
          videoId: clip.videoId,
          clipId: clip.id,
          progress: 0,
        },
      });
    });

    const { videoQueue } = await import("@/lib/queue");
    const priority = clip.video?.user ? getPlanLimits(clip.video.user.plan as Plan).jobPriority : 3;
    await videoQueue.add(
      "generate-clip",
      {
        type: JobType.GENERATE_CLIP,
        clipId: clip.id,
        ...(preset && { presetId: preset.id }),
      },
      { jobId: dbJob.id, priority },
    );

    return NextResponse.json({
      success: true,
      jobId: dbJob.id,
      message: "Clip rendering queued",
    });
  } catch (error) {
    console.error("[API] Render clip error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(error as Error) },
      { status: 500 },
    );
  }
}
