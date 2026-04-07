import { execFile } from "child_process";
import { promisify } from "util";

import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

/** Path to YouTube cookies file — avoids bot detection on cloud server IPs. */
const COOKIES_PATH = path.join(process.cwd(), "cookies.txt");

function getCookiesArgs(): string[] {
  if (fs.existsSync(COOKIES_PATH)) {
    return ["--cookies", COOKIES_PATH];
  }
  return [];
}

const YOUTUBE_URL_REGEX =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch\?.*v=|shorts\/|live\/)|youtu\.be\/)[a-zA-Z0-9_-]+/;

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Strict YouTube URL validation — prevents SSRF by only allowing known YouTube domains. */
export function isValidYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const allowed = ["www.youtube.com", "youtube.com", "youtu.be"];
    if (!allowed.includes(u.hostname)) return false;
    return YOUTUBE_URL_REGEX.test(url);
  } catch {
    return false;
  }
}

/** Extract the 11-character video ID from a YouTube URL. */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return VIDEO_ID_REGEX.test(id) ? id : null;
    }
    if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/live/")) {
      const id = u.pathname.split("/")[2];
      return id && VIDEO_ID_REGEX.test(id) ? id : null;
    }
    const id = u.searchParams.get("v");
    return id && VIDEO_ID_REGEX.test(id) ? id : null;
  } catch {
    return null;
  }
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  duration: number;
  filesizeApprox: number;
  thumbnail: string;
  uploader: string;
  isLive: boolean;
}

export class YouTubeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "PRIVATE"
      | "UNAVAILABLE"
      | "AGE_RESTRICTED"
      | "GEO_BLOCKED"
      | "LIVE_STREAM"
      | "TIMEOUT"
      | "NOT_FOUND"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "YouTubeError";
  }
}

function classifyYtDlpError(stderr: string): YouTubeError {
  const s = stderr.toLowerCase();
  if (s.includes("private video") || s.includes("sign in"))
    return new YouTubeError("This video is private. Only public YouTube videos can be imported.", "PRIVATE");
  if (s.includes("video unavailable") || s.includes("not available"))
    return new YouTubeError("This YouTube video is unavailable or has been removed.", "UNAVAILABLE");
  if (s.includes("age") && s.includes("confirm"))
    return new YouTubeError("This video is age-restricted and cannot be imported.", "AGE_RESTRICTED");
  if (s.includes("not available in your country") || s.includes("geo"))
    return new YouTubeError("This video is not available in your region.", "GEO_BLOCKED");
  if (s.includes("is live") || s.includes("livestream") || s.includes("live stream"))
    return new YouTubeError("Live streams cannot be imported. Wait until the stream ends.", "LIVE_STREAM");
  return new YouTubeError("Could not download this YouTube video. Please check the URL and try again.", "UNKNOWN");
}

/** Fetch YouTube video metadata without downloading. */
export async function getYouTubeVideoInfo(url: string): Promise<YouTubeVideoInfo> {
  if (!isValidYouTubeUrl(url)) {
    throw new YouTubeError("Invalid YouTube URL", "NOT_FOUND");
  }

  try {
    const { stdout } = await execFileAsync(
      "yt-dlp",
      [...getCookiesArgs(), "--dump-json", "--no-download", "--no-playlist", url],
      { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
    );

    const data = JSON.parse(stdout) as Record<string, unknown>;
    return {
      id: String(data.id ?? ""),
      title: String(data.title ?? "Untitled"),
      duration: Number(data.duration ?? 0),
      filesizeApprox: Number(data.filesize_approx ?? data.filesize ?? 0),
      thumbnail: String(data.thumbnail ?? ""),
      uploader: String(data.uploader ?? data.channel ?? ""),
      isLive: data.is_live === true,
    };
  } catch (err: unknown) {
    const error = err as { stderr?: string; killed?: boolean; code?: string };
    if (error.killed || error.code === "ETIMEDOUT") {
      throw new YouTubeError("Timed out fetching video info. Please try again.", "TIMEOUT");
    }
    if (error.stderr) {
      throw classifyYtDlpError(error.stderr);
    }
    if (error.code === "ENOENT") {
      console.error("[YouTube] yt-dlp not found. Install it: brew install yt-dlp");
      throw new YouTubeError("YouTube import is not available. Server is missing yt-dlp.", "UNKNOWN");
    }
    throw new YouTubeError("Could not fetch YouTube video info. Please check the URL.", "UNKNOWN");
  }
}

/** Download a YouTube video to a local path. Returns the actual file size. */
export async function downloadYouTubeVideo(
  url: string,
  outputPath: string,
  onProgress?: (percent: number) => void,
): Promise<{ filePath: string; fileSize: number }> {
  if (!isValidYouTubeUrl(url)) {
    throw new YouTubeError("Invalid YouTube URL", "NOT_FOUND");
  }

  return new Promise((resolve, reject) => {
    const args = [
      ...getCookiesArgs(),
      "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/best[height<=1080]",
      "--merge-output-format", "mp4",
      "--no-playlist",
      "--no-overwrites",
      "--socket-timeout", "30",
      "-o", outputPath,
      url,
    ];

    const proc = execFile("yt-dlp", args, {
      timeout: 30 * 60 * 1000, // 30 minutes
      maxBuffer: 50 * 1024 * 1024,
    }, async (error, _stdout, stderr) => {
      if (error) {
        const err = error as { killed?: boolean; code?: string };
        if (err.killed || err.code === "ETIMEDOUT") {
          reject(new YouTubeError("Download timed out. The video may be too large.", "TIMEOUT"));
        } else {
          reject(classifyYtDlpError(stderr));
        }
        return;
      }

      try {
        const fs = await import("fs/promises");
        const stat = await fs.stat(outputPath);
        resolve({ filePath: outputPath, fileSize: stat.size });
      } catch {
        reject(new YouTubeError("Download completed but file not found.", "UNKNOWN"));
      }
    });

    // Parse progress from stderr
    if (onProgress && proc.stderr) {
      proc.stderr.on("data", (chunk: Buffer) => {
        const line = chunk.toString();
        const match = line.match(/\[download\]\s+([\d.]+)%/);
        if (match) {
          onProgress(parseFloat(match[1]));
        }
      });
    }
  });
}
