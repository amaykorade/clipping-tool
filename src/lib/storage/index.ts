import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

/**
 * Storage abstraction interface
 * This allows us to swap storage providers (local → S3 → Cloudflare R2)
 * without changing business logic
 */

export interface IStorage {
  upload(
    file: Buffer | Readable,
    key: string,
    metadata?: UploadMetadata,
  ): Promise<UploadResult>;

  delete(key: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

export interface UploadMetadata {
  contentType?: string;
  fileSize?: number;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

/**
 * Local filesystem storage implementation
 * Good for: Development, testing, small-scale production
 * Limitations: Not scalable, no CDN, single server
 */

export class LocalStorage implements IStorage {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = process.env.STORAGE_PATH || "./uploads";
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(path.join(this.basePath, "videos"), { recursive: true });
      await fs.mkdir(path.join(this.basePath, "clips"), { recursive: true });
      await fs.mkdir(path.join(this.basePath, "pending"), { recursive: true });
      await fs.mkdir(path.join(this.basePath, "thumbnail"), {
        recursive: true,
      });
    } catch (error) {
      console.error("Failed to create storage directories:", error);
    }
  }

  async upload(
    file: Buffer | Readable,
    key: string,
    metadata?: UploadMetadata,
  ): Promise<UploadResult> {
    const fullPath = path.join(this.basePath, key);
    const directory = path.dirname(fullPath);

    await fs.mkdir(directory, { recursive: true });

    let size = 0;
    if (Buffer.isBuffer(file)) {
      await fs.writeFile(fullPath, file);
      size = file.length;
    } else {
      const writeStream = createWriteStream(fullPath);

      // Track upload progress
      file.on("data", (chunk) => {
        size += chunk.length;
      });

      await pipeline(file, writeStream);
    }

    return {
      key,
      url: this.getUrl(key),
      size: metadata?.fileSize || size,
    };
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new Error(`File not found: ${key}`);
    }
  }

  getUrl(key: string): string {
    // Public URL served by our Next.js route at app/upload/[...path]/route.ts
    return `${this.baseUrl}/upload/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, key);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * AWS S3 storage
 * Uses presigned URLs for direct browser uploads (no file through our server).
 */
export class S3Storage implements IStorage {
  private bucket: string;
  private region: string;
  private baseUrl: string;

  constructor() {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "ap-south-1";
    if (!bucket) throw new Error("AWS_S3_BUCKET is required when STORAGE_TYPE=s3");
    this.bucket = bucket;
    this.region = region;
    this.baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  }

  async upload(
    file: Buffer | Readable,
    key: string,
    metadata?: UploadMetadata,
  ): Promise<UploadResult> {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: this.region });
    const body = Buffer.isBuffer(file) ? file : await this.readStream(file);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: metadata?.contentType || "application/octet-stream",
    });
    await client.send(cmd);
    return {
      key,
      url: `${this.baseUrl}/upload/${key}`,
      size: metadata?.fileSize || body.length,
    };
  }

  private async readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async download(key: string): Promise<Buffer> {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: this.region });
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await client.send(cmd);
    if (!res.Body) throw new Error(`File not found: ${key}`);
    return Buffer.from(await res.Body.transformToByteArray());
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/upload/${key}`;
  }

  /** Generate a presigned PUT URL for direct browser upload (expires in 1 hour). */
  async getPresignedPutUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = new S3Client({ region: this.region });
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(client, cmd, { expiresIn });
  }

  /** Generate a presigned GET URL for secure file access (expires in 1 hour). */
  async getPresignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = new S3Client({ region: this.region });
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(client, cmd, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: this.region });
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    const { S3Client, HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: this.region });
    try {
      await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}

export function isS3Storage(storage: IStorage): storage is S3Storage {
  return storage instanceof S3Storage;
}

/**
 * Storage factory
 * Returns appropriate storage implementation based on environment
 */
export function getStorage(): IStorage {
  const storageType = process.env.STORAGE_TYPE || "local";

  switch (storageType) {
    case "s3":
      return new S3Storage();
    case "local":
    default:
      return new LocalStorage();
  }
}
