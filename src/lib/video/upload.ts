import { v4 as uuidv4 } from "uuid";
import { generateThumbnail, validateVideo } from "./metadata";
import path from "path";
import { getStorage, isS3Storage } from "../storage";
import fs from "fs/promises";
import { prisma } from "../db";
import { canUploadVideo } from "../plans";

export interface UploadOptions {
  title: string;
  originalFileName: string;
  tempFilePath: string;
  /** Logged-in user id; if provided, video is owned by this user. */
  userId?: string | null;
}

/** Options for fast path: API only saves file to pending, worker does the rest. */
export interface SavePendingOptions {
  title: string;
  originalFileName: string;
  fileBuffer: Buffer;
  /** Logged-in user id; if provided, video is owned by this user. */
  userId?: string | null;
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
  const { title, originalFileName, tempFilePath, userId } = options;
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

    // Plan limits: video count and max duration
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, _count: { select: { videos: true } } },
      });
      if (user) {
        const durationSec = Math.ceil(metadata.duration);
        const check = canUploadVideo(user.plan, user._count.videos, durationSec);
        if (!check.ok) throw new Error(check.error);
      }
    }

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
        ...(userId && { userId }),
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

const PENDING_PREFIX = "pending/";

/**
 * Fast path: save file to pending storage and create a minimal Video record.
 * Worker will run finalizePendingUpload then transcribe. Use this in the API
 * so the request returns quickly without running ffmpeg.
 */
export async function savePendingUpload(
  options: SavePendingOptions,
): Promise<UploadResult> {
  const { title, originalFileName, fileBuffer, userId } = options;
  const videoId = uuidv4();
  const ext = path.extname(originalFileName);
  const pendingKey = `${PENDING_PREFIX}${videoId}${ext}`;

  // Plan check: only video count (duration check happens in worker after we have metadata)
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, _count: { select: { videos: true } } },
    });
    if (user) {
      const check = canUploadVideo(user.plan, user._count.videos, 0);
      if (!check.ok) throw new Error(check.error);
    }
  }

  const storage = getStorage();
  await storage.upload(fileBuffer, pendingKey, {
    contentType: "video/mp4",
    fileSize: fileBuffer.length,
  });

  await prisma.video.create({
    data: {
      id: videoId,
      title,
      fileName: originalFileName,
      fileSize: fileBuffer.length,
      duration: 0,
      storageKey: pendingKey,
      thumbnailUrl: null,
      status: "UPLOADED",
      ...(userId && { userId }),
    },
  });

  return {
    videoId,
    storageKey: pendingKey,
    url: storage.getUrl(pendingKey),
    thumbnailUrl: undefined,
    metadata: { duration: 0, fileSize: fileBuffer.length },
  };
}

/** Options for S3 direct upload: no file yet, client will PUT to presigned URL. */
export interface CreatePendingForDirectUploadOptions {
  title: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  userId?: string | null;
}

/** Returns presigned PUT URL so the client uploads directly to S3. Job is NOT queued yet. */
export async function createPendingUploadForDirectUpload(
  options: CreatePendingForDirectUploadOptions,
): Promise<{ videoId: string; uploadUrl: string; storageKey: string }> {
  const { title, originalFileName, fileSize, contentType, userId } = options;
  const storage = getStorage();
  if (!isS3Storage(storage)) {
    throw new Error("Direct upload requires STORAGE_TYPE=s3");
  }

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, _count: { select: { videos: true } } },
    });
    if (user) {
      const check = canUploadVideo(user.plan, user._count.videos, 0);
      if (!check.ok) throw new Error(check.error);
    }
  }

  const videoId = uuidv4();
  const ext = path.extname(originalFileName);
  const pendingKey = `${PENDING_PREFIX}${videoId}${ext}`;

  const uploadUrl = await storage.getPresignedPutUrl(pendingKey, contentType);

  await prisma.video.create({
    data: {
      id: videoId,
      title,
      fileName: originalFileName,
      fileSize,
      duration: 0,
      storageKey: pendingKey,
      thumbnailUrl: null,
      status: "UPLOADED",
      ...(userId && { userId }),
    },
  });

  return { videoId, uploadUrl, storageKey: pendingKey };
}

/**
 * Worker-only: move pending upload to final storage, run ffmpeg (validate + thumbnail),
 * update Video record. Call this at the start of TRANSCRIBE when storageKey starts with "pending/".
 */
export async function finalizePendingUpload(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video || !video.storageKey.startsWith(PENDING_PREFIX)) return;

  const storage = getStorage();
  const tempFilePath = `/tmp/${videoId}${path.extname(video.fileName)}`;
  try {
    const buffer = await storage.download(video.storageKey);
    await fs.writeFile(tempFilePath, buffer);

    const validation = await validateVideo(tempFilePath);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid video file");
    }
    const metadata = validation.metadata!;

    if (video.userId) {
      const user = await prisma.user.findUnique({
        where: { id: video.userId },
        select: { plan: true, _count: { select: { videos: true } } },
      });
      if (user) {
        const durationSec = Math.ceil(metadata.duration);
        const check = canUploadVideo(user.plan, user._count.videos, durationSec);
        if (!check.ok) throw new Error(check.error);
      }
    }

    const ext = path.extname(video.fileName);
    const finalStorageKey = `videos/${videoId}/${ext}`;
    const thumbnailKey = `thumbnails/${videoId}.jpg`;
    const tempThumbPath = `/tmp/${videoId}-thumb.jpg`;

    try {
      await generateThumbnail(tempFilePath, tempThumbPath, 0);
    } catch (e) {
      console.warn("[Worker] Thumbnail generation failed:", e);
    }

    const videoBuffer = await fs.readFile(tempFilePath);
    await storage.upload(videoBuffer, finalStorageKey, {
      contentType: "video/mp4",
      fileSize: metadata.fileSize,
    });

    let thumbnailUrl: string | undefined;
    try {
      const thumbBuffer = await fs.readFile(tempThumbPath);
      const thumbResult = await storage.upload(thumbBuffer, thumbnailKey, {
        contentType: "image/jpeg",
      });
      thumbnailUrl = thumbResult.url;
      await fs.unlink(tempThumbPath);
    } catch (e) {
      console.warn("[Worker] Thumbnail upload failed:", e);
    }

    await prisma.video.update({
      where: { id: videoId },
      data: {
        storageKey: finalStorageKey,
        duration: metadata.duration,
        fileSize: metadata.fileSize,
        thumbnailUrl,
      },
    });

    await storage.delete(video.storageKey);
  } finally {
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // ignore
    }
  }
}
