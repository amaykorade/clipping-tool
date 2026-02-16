import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { segmentTranscript } from "@/lib/ai/clipSegmentation";
import type { Transcript } from "@/types";

/**
 * GET /api/videos/[id]/transcript
 * Returns the stored transcript and the segments we use for clip generation,
 * so you can see exactly what we're feeding to the model.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();
  const video = await prisma.video.findUnique({
    where: { id },
    select: { transcript: true, status: true, userId: true },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (!canAccessVideo(video, session)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  const transcript = video.transcript as Transcript | null;
  if (!transcript) {
    return NextResponse.json({
      transcript: { words: [], sentences: [] },
      segments: [],
    });
  }

  // Segments we actually use for clip generation (sentence-boundary segmentation)
  let segments: { start: number; end: number; text: string }[] = [];
  try {
    const segs = segmentTranscript(transcript, {
      minDurationSec: 20,
      maxDurationSec: 90,
      maxGapSec: 2,
    });
    segments = segs.map((s) => ({ start: s.start, end: s.end, text: s.text }));
  } catch (e) {
    console.warn("[transcript API] segmentTranscript failed:", e);
  }

  const t = transcript as {
    words?: { text: string; start: number; end: number }[];
    sentences?: { text: string; start: number; end: number }[];
  };

  return NextResponse.json({
    transcript: {
      words: t.words ?? [],
      sentences: t.sentences ?? [],
    },
    segments,
  });
}
