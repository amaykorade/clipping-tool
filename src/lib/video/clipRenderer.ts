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

    // Download original video to temp location (reuse cached file if available)
    const inputPath = path.join("/tmp", `${video.id}-original.mp4`);
    const { existsSync } = await import("fs");
    if (existsSync(inputPath)) {
      console.log(`[ClipRenderer] Reusing cached video at ${inputPath}`);
    } else {
      await storage.downloadToFile(video.storageKey, inputPath);
    }

    // Use edited times if user has trimmed, otherwise use AI-generated times
    const rawStartTime = clip.editedStartTime ?? clip.startTime;
    const rawEndTime = clip.editedEndTime ?? clip.endTime;

    // Clamp clip times to actual file duration to avoid ffmpeg "Conversion failed" (exit 234)
    const fileInfo = await getVideoInfo(inputPath);
    const durationSec = fileInfo.duration;
    let startTime = Math.max(0, Math.min(rawStartTime, durationSec - MIN_CLIP_DURATION_SEC));
    let endTime = Math.min(durationSec, Math.max(rawEndTime, startTime + MIN_CLIP_DURATION_SEC));
    if (endTime - startTime < MIN_CLIP_DURATION_SEC) {
      endTime = Math.min(durationSec, startTime + MIN_CLIP_DURATION_SEC);
    }

    // Generate output path
    const outputFileName = `${uuidv4()}.mp4`;
    const outputPath = path.join("/tmp", outputFileName);

    // Get transcript words for captions, applying any user edits
    const transcript = video.transcript as any;
    let clipWords = extractClipWords(
      transcript?.words || [],
      startTime,
      endTime,
    );

    // Apply caption edits (user-corrected words)
    if (clip.captionEdits && typeof clip.captionEdits === "object") {
      const edits = clip.captionEdits as Record<string, string>;
      const allWords = transcript?.words || [];
      clipWords = clipWords.map((w: { text: string; start: number; end: number }) => {
        const idx = allWords.findIndex((aw: { start: number; end: number }) => aw.start === w.start && aw.end === w.end);
        const editedText = edits[String(idx)];
        return editedText !== undefined ? { ...w, text: editedText } : w;
      });
    }

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
        cropMode: clip.cropMode === "FIT" ? "fit" : "fill",
      },
      captions:
        clipWords.length > 0 && !!clip.captionStyle && clip.captionStyle !== "none"
          ? {
              style: (clip.captionStyle || "modern") as "default" | "bold" | "modern",
              words: clipWords,
              positionX: clip.captionPositionX ?? undefined,
              positionY: clip.captionPositionY ?? undefined,
              scale: clip.captionScale ?? undefined,
              activeColor: clip.captionColor ?? undefined,
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

    // Update clip with output URL, thumbnail, and actual aspect ratio used
    const renderedAspect = preset
      ? preset.aspectRatio === "1:1" ? AspectRatio.SQUARE
        : preset.aspectRatio === "16:9" ? AspectRatio.LANDSCAPE
        : AspectRatio.VERTICAL
      : clip.aspectRatio;
    await prisma.clip.update({
      where: { id: clipId },
      data: {
        outputUrl: uploadResult.url,
        thumbnailUrl,
        aspectRatio: renderedAspect,
        status: ClipStatus.COMPLETED,
      },
    });

    // Cleanup temp files (keep inputPath cached for other clips from same video)
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
