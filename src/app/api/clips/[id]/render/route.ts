import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { videoQueue } from "@/lib/queue";
import { JobType, JobStatus } from "@/generated/prisma";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const clip = await prisma.clip.findUnique({
    where: { id },
  });

  if (!clip) {
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
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
