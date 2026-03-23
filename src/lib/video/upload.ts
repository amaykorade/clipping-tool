import { v4 as uuidv4 } from "uuid";
import { generateThumbnail, validateVideo, compressVideo } from "./metadata";
import path from "path";
import { getStorage, isS3Storage } from "../storage";
import fs from "fs/promises";
import { prisma } from "../db";
import { canUploadVideo, getPlanLimits } from "../plans";

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

const PENDING_PREFIX = "pending/";

const ALLOWED_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]);

function validateFileName(fileName: string): void {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`);
  }
}

/**
 * Fast path: save file to pending storage and create a minimal Video record.
 * Worker will run finalizePendingUpload then transcribe. Use this in the API
 * so the request returns quickly without running ffmpeg.
 */
export async function savePendingUpload(
  options: SavePendingOptions,
): Promise<UploadResult> {
  const { title, originalFileName, fileBuffer, userId } = options;
  validateFileName(originalFileName);
  const videoId = uuidv4();
  const ext = path.extname(originalFileName).toLowerCase();
  const pendingKey = `${PENDING_PREFIX}${videoId}${ext}`;

  // Atomic quota check + increment inside transaction to prevent race conditions
  await prisma.$transaction(async (tx) => {
    if (userId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { plan: true, totalVideosUploaded: true, billingInterval: true },
      });
      if (user) {
        const billing = (user.billingInterval === "yearly" ? "yearly" : "monthly") as "monthly" | "yearly" | null;
        const check = canUploadVideo(user.plan as "FREE" | "STARTER" | "PRO", user.totalVideosUploaded, 0, billing);
        if (!check.ok) throw new Error(check.error);
      }
    }
    await tx.video.create({
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
    if (userId) {
      await tx.user.update({
        where: { id: userId },
        data: { totalVideosUploaded: { increment: 1 } },
      });
    }
  });

  const storage = getStorage();
  await storage.upload(fileBuffer, pendingKey, {
    contentType: "video/mp4",
    fileSize: fileBuffer.length,
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
  validateFileName(originalFileName);
  const storage = getStorage();
  if (!isS3Storage(storage)) {
    throw new Error("Direct upload requires STORAGE_TYPE=s3");
  }

  const videoId = uuidv4();
  const ext = path.extname(originalFileName).toLowerCase();
  const pendingKey = `${PENDING_PREFIX}${videoId}${ext}`;

  // Atomic quota check + increment inside transaction to prevent race conditions
  await prisma.$transaction(async (tx) => {
    if (userId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { plan: true, totalVideosUploaded: true, billingInterval: true },
      });
      if (user) {
        const billing = (user.billingInterval === "yearly" ? "yearly" : "monthly") as "monthly" | "yearly" | null;
        const check = canUploadVideo(user.plan as "FREE" | "STARTER" | "PRO", user.totalVideosUploaded, 0, billing);
        if (!check.ok) throw new Error(check.error);
      }
    }
    await tx.video.create({
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
    if (userId) {
      await tx.user.update({
        where: { id: userId },
        data: { totalVideosUploaded: { increment: 1 } },
      });
    }
  });

  const uploadUrl = await storage.getPresignedPutUrl(pendingKey, contentType);

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
  const compressedPath = `/tmp/${videoId}-compressed.mp4`;
  try {
    await storage.downloadToFile(video.storageKey, tempFilePath);

    const validation = await validateVideo(tempFilePath);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid video file");
    }
    const metadata = validation.metadata!;

    // Check duration against plan limit (count was already validated in savePendingUpload)
    if (video.userId) {
      const user = await prisma.user.findUnique({
        where: { id: video.userId },
        select: { plan: true },
      });
      if (user) {
        const durationSec = Math.ceil(metadata.duration);
        const limits = getPlanLimits(user.plan as "FREE" | "STARTER" | "PRO");
        if (durationSec > limits.maxDurationSec) {
          const maxMin = Math.floor(limits.maxDurationSec / 60);
          // Revert the increment from savePendingUpload (video will remain but user gets slot back)
          await prisma.user.update({
            where: { id: video.userId },
            data: { totalVideosUploaded: { decrement: 1 } },
          });
          throw new Error(`Video must be ${maxMin} minutes or less on your plan. Upgrade for longer videos.`);
        }
      }
    }

    const ext = path.extname(video.fileName).toLowerCase() || ".mp4";
    const finalStorageKey = `videos/${videoId}/video${ext}`;
    const thumbnailKey = `thumbnails/${videoId}.jpg`;
    const tempThumbPath = `/tmp/${videoId}-thumb.jpg`;

    try {
      await generateThumbnail(tempFilePath, tempThumbPath, 0);
    } catch (e) {
      console.warn("[Worker] Thumbnail generation failed:", e);
    }

    // Compress video if bitrate is above threshold (H.264 CRF 23, 5 Mbps cap)
    let finalFilePath = tempFilePath;
    try {
      const result = await compressVideo(tempFilePath, compressedPath);
      if (result.compressed) {
        finalFilePath = compressedPath;
        console.log(`[Worker] Video compressed: ${videoId}`);
      }
    } catch (e) {
      console.warn("[Worker] Compression failed, using original:", e);
      // Fall back to uncompressed original
    }

    const videoBuffer = await fs.readFile(finalFilePath);
    const finalFileSize = videoBuffer.length;
    await storage.upload(videoBuffer, finalStorageKey, {
      contentType: "video/mp4",
      fileSize: finalFileSize,
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
        fileSize: finalFileSize,
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
    try {
      await fs.unlink(compressedPath);
    } catch {
      // ignore
    }
  }
}
