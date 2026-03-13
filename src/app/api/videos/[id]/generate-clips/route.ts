import { generateClipsFromTranscript } from "@/lib/video/generateClipsFromTranscript";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: videoId } = await context.params;
    const session = await getSession();
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true },
    });
    if (!video || !canAccessVideo(video, session)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (session?.user?.id) {
      const rl = checkRateLimit(`generateClips:${session.user.id}`, RATE_LIMITS.generateClips);
      if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);
    }

    // Download video to temp file for audio energy analysis
    const video2 = await prisma.video.findUnique({ where: { id: videoId }, select: { storageKey: true } });
    let videoFilePath: string | undefined;
    const tmpPath = `/tmp/${videoId}-clips.mp4`;
    try {
      if (video2?.storageKey) {
        const storage = getStorage();
        await storage.downloadToFile(video2.storageKey, tmpPath);
        videoFilePath = tmpPath;
      }
    } catch { /* proceed without audio energy */ }

    let clips;
    try {
      clips = await generateClipsFromTranscript(videoId, { maxClips: 10, videoFilePath });
    } finally {
      if (videoFilePath) {
        const fs = await import("fs/promises");
        fs.unlink(tmpPath).catch(() => {});
      }
    }
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
