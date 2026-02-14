import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { renderClip } from "./processing";
import { ClipStatus, AspectRatio } from "@/generated/prisma";
import fs from "fs/promises";

export async function renderAndUploadClip(clipId: string): Promise<string> {
  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { video: true },
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
    const videoBuffer = await storage.download(video.storageKey);
    await fs.writeFile(inputPath, videoBuffer);

    // Generate output path
    const outputFileName = `${uuidv4()}.mp4`;
    const outputPath = path.join("/tmp", outputFileName);

    // Get transcript words for captions
    const transcript = video.transcript as any;
    const clipWords = extractClipWords(
      transcript?.words || [],
      clip.startTime,
      clip.endTime,
    );

    // Render clip
    await renderClip({
      inputPath,
      outputPath,
      startTime: clip.startTime,
      endTime: clip.endTime,
      crop: {
        aspectRatio: aspectRatioToString(clip.aspectRatio),
        position: "center",
      },
      captions:
        clipWords.length > 0
          ? {
              style: "modern",
              words: clipWords,
            }
          : undefined,
    });

    // Upload rendered clip
    const clipBuffer = await fs.readFile(outputPath);
    const storageKey = `clips/${clip.id}/${outputFileName}`;

    const uploadResult = await storage.upload(clipBuffer, storageKey, {
      contentType: "video/mp4",
    });

    // Update clip with output URL
    await prisma.clip.update({
      where: { id: clipId },
      data: {
        outputUrl: uploadResult.url,
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
