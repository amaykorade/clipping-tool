import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      clips: {
        orderBy: { startTime: "asc" },
      },
    },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: video.id,
    title: video.title,
    status: video.status,
    duration: video.duration,
    originalUrl: video.originalUrl,
    thumbnailUrl: video.thumbnailUrl,
    transcribedAt: video.transcribedAt,
    clips: video.clips.map((c) => ({
      id: c.id,
      title: c.title,
      startTime: c.startTime,
      endTime: c.endTime,
      confidence: c.confidence,
      status: c.status,
      outputUrl: c.outputUrl,
    })),
  });
}
