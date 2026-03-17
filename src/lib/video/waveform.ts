import { execFile } from "child_process";
import { getStorage } from "@/lib/storage";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { unlink } from "fs/promises";

/**
 * Generate audio waveform peaks for a time range of a video.
 *
 * Extracts raw PCM audio via FFmpeg, buckets into `samples` bins,
 * takes the absolute peak per bucket, and normalizes to 0–1.
 */
export async function generateWaveform(
  storageKey: string,
  start: number,
  end: number,
  samples: number,
): Promise<number[]> {
  const storage = getStorage();
  const tempPath = join(tmpdir(), `waveform-${randomUUID()}.tmp`);

  try {
    // Download source video to a temp file
    await storage.downloadToFile(storageKey, tempPath);

    // Extract mono PCM f32le audio at 8kHz for the given time range
    const rawPcm = await extractPcm(tempPath, start, end);

    // Convert raw bytes to Float32Array
    const floats = new Float32Array(rawPcm.buffer, rawPcm.byteOffset, Math.floor(rawPcm.length / 4));

    if (floats.length === 0) {
      // No audio data — return flat waveform
      return new Array(samples).fill(0);
    }

    // Bucket into `samples` bins and take absolute peak per bucket
    const peaks: number[] = [];
    const bucketSize = Math.max(1, Math.floor(floats.length / samples));

    for (let i = 0; i < samples; i++) {
      const bucketStart = i * bucketSize;
      const bucketEnd = Math.min(bucketStart + bucketSize, floats.length);
      let peak = 0;
      for (let j = bucketStart; j < bucketEnd; j++) {
        const abs = Math.abs(floats[j]);
        if (abs > peak) peak = abs;
      }
      peaks.push(peak);
    }

    // Normalize to 0–1 range
    const maxPeak = Math.max(...peaks);
    if (maxPeak > 0) {
      for (let i = 0; i < peaks.length; i++) {
        peaks[i] = peaks[i] / maxPeak;
      }
    }

    return peaks;
  } finally {
    // Clean up temp file
    await unlink(tempPath).catch(() => {});
  }
}

/**
 * Run FFmpeg to extract raw PCM f32le mono audio from a video file.
 * Returns a Buffer of raw float32 samples.
 */
function extractPcm(
  inputPath: string,
  start: number,
  end: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const duration = end - start;
    const args = [
      "-i", inputPath,
      "-ss", String(start),
      "-t", String(duration),
      "-ac", "1",          // mono
      "-f", "f32le",       // raw 32-bit float, little-endian
      "-ar", "8000",       // 8 kHz sample rate (sufficient for waveform visualization)
      "pipe:1",
    ];

    const child = execFile("ffmpeg", args, {
      maxBuffer: 50 * 1024 * 1024, // 50 MB — plenty for audio-only output
      encoding: "buffer" as BufferEncoding,
    }, (error, stdout) => {
      if (error) {
        reject(new Error(`FFmpeg waveform extraction failed: ${error.message}`));
        return;
      }
      resolve(stdout as unknown as Buffer);
    });

    // FFmpeg writes logs to stderr; ignore them
    child.stderr?.resume();
  });
}
