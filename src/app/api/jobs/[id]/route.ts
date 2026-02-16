import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessVideo } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();
  const job = await prisma.job.findUnique({
    where: { id },
    include: { video: { select: { userId: true } } },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (!job.video || !canAccessVideo(job.video, session)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    error: job.error,
    videoId: job.videoId,
  });
}
