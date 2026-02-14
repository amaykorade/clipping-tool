import path from "path";
import Ffmpeg, { ffprobe } from "fluent-ffmpeg";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  fileSize: number;
  hasAudio: boolean;
  audioCodec?: string;
}

// Extract metadata
export async function extractMetadata(
  filePath: string,
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to extract metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video",
      );
      const audioStream = metadata.streams.find(
        (s) => s.codec_type === "audio",
      );

      if (!videoStream) {
        reject(new Error("No video stream found"));
        return;
      }

      const duration =
        metadata.format.duration ||
        parseFloat(videoStream.duration || "0") ||
        0;

      let fps = 30;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
        fps = den ? num / den : num;
      }

      resolve({
        duration: Math.round(duration),
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: Math.round(fps),
        bitrate: metadata.format.bit_rate || 0,
        codec: videoStream.codec_name || "unknown",
        fileSize: metadata.format.size || 0,
        hasAudio: !!audioStream,
        audioCodec: audioStream?.codec_name,
      });
    });
  });
}

// Generate thumbnail from video
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timestampSeconds: number = 0,
): Promise<void> {
  const folder = path.dirname(outputPath);
  const filename = path.basename(outputPath);

  return new Promise((resolve, reject) => {
    Ffmpeg(inputPath)
      .screenshots({
        timemarks: [timestampSeconds],
        filename,
        folder,
        size: "1280x720",
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
}

//  Validate video file
//  Checks if file is a valid video and meets requirements

export async function validateVideo(
  filePath: string,
): Promise<{ valid: boolean; error?: string; metadata?: VideoMetadata }> {
  try {
    const metadata = await extractMetadata(filePath);

    if (metadata.duration < 1) {
      return { valid: false, error: "Video is too short (minimum 1 second)" };
    }

    if (metadata.duration > 3600) {
      return { valid: false, error: "Video is too long (maximum 1 hour)" };
    }

    if (metadata.width < 480 || metadata.height < 480) {
      return { valid: false, error: "Video resolution too low (minimum 480p)" };
    }

    if (!metadata.hasAudio) {
      return {
        valid: false,
        error: "Video must have audio track for transcription",
      };
    }

    return { valid: true, metadata };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid video file: ${(error as Error).message}`,
    };
  }
}
