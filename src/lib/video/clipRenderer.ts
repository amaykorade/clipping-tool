import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { getPlanLimits } from "@/lib/plans";
import { renderClip, getVideoInfo } from "./processing";
import { generateThumbnail } from "./metadata";
import { ClipStatus, AspectRatio } from "@/generated/prisma";
import { getPreset, type ExportPreset } from "@/lib/video/presets";
import fs from "fs/promises";

const MIN_CLIP_DURATION_SEC = 1;

export async function renderAndUploadClip(
  clipId: string,
  onProgress?: (percent: number) => void,
  presetId?: string,
): Promise<string> {
  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { video: { include: { user: { select: { plan: true, watermarkKey: true, watermarkPosition: true, watermarkOpacity: true } } } } },
  });

  if (!clip) throw new Error("Clip not found");
  if (!clip.video) throw new Error("Video not found");

  const video = clip.video;

  // Update status
  await prisma.clip.update({
    where: { id: clipId },
    data: { status: ClipStatus.PROCESSING },
  });

  try {
    const storage = getStorage();

    // Download original video to temp location
    const inputPath = path.join("/tmp", `${video.id}-original.mp4`);
    await storage.downloadToFile(video.storageKey, inputPath);

    // Clamp clip times to actual file duration to avoid ffmpeg "Conversion failed" (exit 234)
    const fileInfo = await getVideoInfo(inputPath);
    const durationSec = fileInfo.duration;
    let startTime = Math.max(0, Math.min(clip.startTime, durationSec - MIN_CLIP_DURATION_SEC));
    let endTime = Math.min(durationSec, Math.max(clip.endTime, startTime + MIN_CLIP_DURATION_SEC));
    if (endTime - startTime < MIN_CLIP_DURATION_SEC) {
      endTime = Math.min(durationSec, startTime + MIN_CLIP_DURATION_SEC);
    }

    // Generate output path
    const outputFileName = `${uuidv4()}.mp4`;
    const outputPath = path.join("/tmp", outputFileName);

    // Get transcript words for captions
    const transcript = video.transcript as any;
    const clipWords = extractClipWords(
      transcript?.words || [],
      startTime,
      endTime,
    );

    const userRecord = clip.video.user;
    const plan = userRecord?.plan ?? "FREE";
    const addWatermark = getPlanLimits(plan).watermark;
    const preset = presetId ? getPreset(presetId) : undefined;

    // Render clip (preset overrides aspect ratio if provided)
    const aspectRatio = preset?.aspectRatio ?? aspectRatioToString(clip.aspectRatio);
    await renderClip({
      inputPath,
      outputPath,
      startTime,
      endTime,
      crop: {
        aspectRatio,
        position: "center",
      },
      captions:
        clipWords.length > 0
          ? {
              style: "modern",
              words: clipWords,
            }
          : undefined,
      watermark: addWatermark,
      watermarkPosition: (userRecord?.watermarkPosition as "bottom-right" | "bottom-left" | "top-right" | "top-left") ?? undefined,
      watermarkOpacity: userRecord?.watermarkOpacity ?? undefined,
      onProgress,
    });

    // Upload rendered clip under the video's namespace so each video's shorts are stored together
    const clipBuffer = await fs.readFile(outputPath);
    const storageKey = `videos/${video.id}/clips/${clip.id}/${outputFileName}`;

    const uploadResult = await storage.upload(clipBuffer, storageKey, {
      contentType: "video/mp4",
    });

    // Generate thumbnail from rendered clip (best frame = 1 second in)
    let thumbnailUrl: string | undefined;
    const thumbPath = `/tmp/${clip.id}-thumb.jpg`;
    try {
      await generateThumbnail(outputPath, thumbPath, 1);
      const thumbBuffer = await fs.readFile(thumbPath);
      const thumbKey = `videos/${video.id}/clips/${clip.id}/thumb.jpg`;
      const thumbResult = await storage.upload(thumbBuffer, thumbKey, { contentType: "image/jpeg" });
      thumbnailUrl = thumbResult.url;
      await fs.unlink(thumbPath).catch(() => {});
    } catch (e) {
      console.warn("[ClipRenderer] Thumbnail generation failed:", e);
    }

    // Update clip with output URL and thumbnail
    await prisma.clip.update({
      where: { id: clipId },
      data: {
        outputUrl: uploadResult.url,
        thumbnailUrl,
        status: ClipStatus.COMPLETED,
      },
    });

    // Cleanup temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    console.log(`[ClipRenderer] Rendered clip ${clipId}`);

    return uploadResult.url;
  } catch (error) {
    console.error("[ClipRenderer] Error:", error);

    await prisma.clip.update({
      where: { id: clipId },
      data: { status: ClipStatus.ERROR },
    });

    throw error;
  }
}

/**
 * Extract words that fall within clip timerange
 */
function extractClipWords(
  allWords: Array<{ text: string; start: number; end: number }>,
  startTime: number,
  endTime: number,
): Array<{ text: string; start: number; end: number }> {
  return allWords.filter((w) => w.start >= startTime && w.end <= endTime);
}

/**
 * Convert Prisma enum to format string
 */
function aspectRatioToString(
  ratio: AspectRatio,
): "9:16" | "1:1" | "16:9" {
  const map: Record<AspectRatio, "9:16" | "1:1" | "16:9"> = {
    VERTICAL: "9:16",
    SQUARE: "1:1",
    LANDSCAPE: "16:9",
  };
  return map[ratio];
}
