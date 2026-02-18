import { NextRequest, NextResponse } from "next/server";
import { generateClipsForVideo } from "@/lib/video/clipGeneration";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!video.transcript) {
    return NextResponse.json(
      { error: "Transcript not ready yet" },
      { status: 400 },
    );
  }

  try {
    const clips = await generateClipsForVideo(video.id);

    return NextResponse.json({
      success: true,
      count: clips.length,
      clips,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
