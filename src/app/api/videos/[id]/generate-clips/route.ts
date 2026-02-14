import { generateClipsFromTranscript } from "@/lib/video/generateClipsFromTranscript";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: videoId } = await context.params;
    const clips = await generateClipsFromTranscript(videoId, { maxClips: 10 });
    return NextResponse.json({
      clips: clips.map((c) => ({
        id: c.id,
        title: c.title,
        startTime: c.startTime,
        endTime: c.endTime,
        confidence: c.confidence,
        status: c.status,
        outputUrl: c.outputUrl,
      })),
    });
  } catch (err) {
    console.error("[generate-clips]", err);
    const message = (err as Error).message || "Failed to generate clips";
    const status =
      message.includes("not found") ? 404
      : message.includes("transcribed") || message.includes("No transcript") ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
