import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessVideo } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { JobType, JobStatus } from "@/generated/prisma";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  const clip = await prisma.clip.findUnique({
    where: { id },
    include: { video: { select: { userId: true } } },
  });

  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }
  if (!clip.video || !canAccessVideo(clip.video, session)) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  if (clip.status === "COMPLETED") {
    return NextResponse.json({
      success: true,
      message: "Clip already rendered",
      outputUrl: clip.outputUrl,
    });
  }

  try {
    const { videoQueue } = await import("@/lib/queue");
    const dbJob = await prisma.job.create({
      data: {
        type: JobType.GENERATE_CLIP,
        status: JobStatus.QUEUED,
        videoId: clip.videoId,
        progress: 0,
      },
    });

    await videoQueue.add(
      "generate-clip",
      {
        type: JobType.GENERATE_CLIP,
        clipId: clip.id,
      },
      { jobId: dbJob.id },
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
