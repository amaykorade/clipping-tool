import { generateClipsFromTranscript } from "@/lib/video/generateClipsFromTranscript";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
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

    // Check if clip generation is already in progress
    const currentVideo = await prisma.video.findUnique({
      where: { id: videoId },
      select: { status: true, storageKey: true },
    });
    if (currentVideo?.status === "ANALYZING") {
      return NextResponse.json(
        { error: "Clip generation is already in progress" },
        { status: 409 },
      );
    }

    // Set status to ANALYZING so UI shows processing state (survives page refresh)
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "ANALYZING" },
    });

    // Download video to temp file for audio energy analysis
    let videoFilePath: string | undefined;
    const tmpPath = `/tmp/${videoId}-clips.mp4`;
    try {
      if (currentVideo?.storageKey) {
        const storage = getStorage();
        await storage.downloadToFile(currentVideo.storageKey, tmpPath);
        videoFilePath = tmpPath;
      }
    } catch { /* proceed without audio energy */ }

    let clips;
    try {
      clips = await generateClipsFromTranscript(videoId, { maxClips: 10, videoFilePath });
    } catch (genErr) {
      // Restore status to READY so user can retry
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "READY" },
      });
      throw genErr;
    } finally {
      if (videoFilePath) {
        const fs = await import("fs/promises");
        fs.unlink(tmpPath).catch(() => {});
      }
    }

    // Restore status to READY now that clips are generated
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "READY" },
    });

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
    const rawMsg = (err as Error).message || "";
    const status =
      rawMsg.includes("not found") ? 404
      : rawMsg.includes("transcribed") || rawMsg.includes("No transcript") ? 400
      : 500;
    // For 4xx, the message is user-facing and safe; for 5xx, use safe error mapping
    const message = status < 500 ? rawMsg : getSafeApiErrorMessage(err as Error);
    return NextResponse.json({ error: message }, { status });
  }
}
