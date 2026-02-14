import { v4 as uuidv4 } from "uuid";
import { generateThumbnail, validateVideo } from "./metadata";
import path from "path";
import { getStorage } from "../storage";
import fs from "fs/promises";
import { prisma } from "../db";

export interface UploadOptions {
  title: string;
  originalFileName: string;
  tempFilePath: string;
}

export interface UploadResult {
  videoId: string;
  storageKey: string;
  url: string;
  thumbnailUrl?: string;
  metadata: any;
}

export async function processVideoUpload(
  options: UploadOptions,
): Promise<UploadResult> {
  const { title, originalFileName, tempFilePath } = options;
  let storageKey = "";
  let thumbnailKey = "";

  try {
    // Step 1: Validate video
    console.log("[Upload] Validating video...");
    const validation = await validateVideo(tempFilePath);

    if (!validation.valid) {
      throw new Error(validation.error || "Invalid video file");
    }

    const metadata = validation.metadata!;

    // Generate unique storage key
    const videoId = uuidv4();
    const ext = path.extname(originalFileName);
    storageKey = `videos/${videoId}/${ext}`;
    thumbnailKey = `thumbnails/${videoId}.jpg`;

    console.log("[Upload] Generating thumbnail...");

    // Generate thumbnail
    const tempThumbnailPath = `/tmp/${videoId}-thumb.jpg`;
    try {
      await generateThumbnail(tempFilePath, tempThumbnailPath, 0);
    } catch (error) {
      console.warn("[Upload] Thumbnail generation failed:", error);
    }

    // Upload to storage
    console.log("[Upload] Uploading to storage...");
    const storage = getStorage();

    // Upload video
    const videoBuffer = await fs.readFile(tempFilePath);
    const uploadResult = await storage.upload(videoBuffer, storageKey, {
      contentType: "video/mp4",
      fileSize: metadata.fileSize,
    });

    // Upload thumbnail (if generated)
    let thumbnailUrl: string | undefined;
    try {
      const thumbnailBuffer = await fs.readFile(tempThumbnailPath);
      const thumbResult = await storage.upload(thumbnailBuffer, thumbnailKey, {
        contentType: "image/jpeg",
      });
      thumbnailUrl = thumbResult.url;

      // Clean up temp thumbnail
      await fs.unlink(tempThumbnailPath);
    } catch (error) {
      console.warn("[Upload] Thumbnail upload failed:", error);
    }

    //  Create database record
    console.log("[Upload] Creating database record...");
    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        fileName: originalFileName,
        fileSize: metadata.fileSize,
        duration: metadata.duration,
        storageKey,
        thumbnailUrl,
        status: "UPLOADED",
      },
    });

    // Clean up temp file
    await fs.unlink(tempFilePath);

    console.log("[Upload] Upload complete:", videoId);

    return {
      videoId: video.id,
      storageKey,
      url: uploadResult.url,
      thumbnailUrl,
      metadata,
    };
  } catch (error) {
    // Cleanup on error
    console.error("[Upload] Error:", error);

    // Delete from storage if uploaded
    const storage = getStorage();
    if (storageKey) {
      try {
        await storage.delete(storageKey);
      } catch (e) {
        console.error("[Upload] Failed to cleanup storage:", e);
      }
    }
    if (thumbnailKey) {
      try {
        await storage.delete(thumbnailKey);
      } catch (e) {
        console.error("[Upload] Failed to cleanup thumbnail:", e);
      }
    }

    // Delete temp file
    try {
      await fs.unlink(tempFilePath);
    } catch (e) {
      // Ignore if already deleted
    }

    throw error;
  }
}
