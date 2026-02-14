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
 * S3-compatible storage (AWS S3, Cloudflare R2, DigitalOcean Spaces)
 * We'll implement this in Phase 6 when we optimize for production
 */
export class S3Storage implements IStorage {
  // TODO: Implement S3 logic
  async upload(file: Buffer | Readable, key: string): Promise<UploadResult> {
    throw new Error("S3Storage not implemented yet");
  }

  async download(key: string): Promise<Buffer> {
    throw new Error("S3Storage not implemented yet");
  }

  getUrl(key: string): string {
    throw new Error("S3Storage not implemented yet");
  }

  async delete(key: string): Promise<void> {
    throw new Error("S3Storage not implemented yet");
  }

  async exists(key: string): Promise<boolean> {
    throw new Error("S3Storage not implemented yet");
  }
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
