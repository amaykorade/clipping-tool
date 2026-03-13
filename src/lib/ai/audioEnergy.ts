import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

interface SegmentEnergy {
  start: number;
  end: number;
  /** Root-mean-square loudness (dB). Higher = louder. */
  rmsDb: number;
  /** Peak loudness (dB). */
  peakDb: number;
  /** Energy level derived from relative loudness. */
  energy: "high" | "medium" | "low";
}

/**
 * Analyze audio energy for a list of segments by extracting per-segment RMS loudness via FFmpeg.
 * Returns energy tags that can be passed to the scoring LLM.
 *
 * This uses ffmpeg's `astats` filter which is lightweight and doesn't require any API calls.
 */
export async function analyzeAudioEnergy(
  videoPath: string,
  segments: { start: number; end: number }[],
): Promise<SegmentEnergy[]> {
  if (segments.length === 0) return [];

  // Batch: analyze all segments concurrently (max 10 at a time to avoid fd exhaustion)
  const BATCH_SIZE = 10;
  const results: SegmentEnergy[] = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((seg) => analyzeSegmentEnergy(videoPath, seg.start, seg.end)),
    );
    results.push(...batchResults);
  }

  // Compute relative energy: compare each segment to the median
  const rmsValues = results.map((r) => r.rmsDb).filter((v) => isFinite(v));
  if (rmsValues.length === 0) return results;

  const sorted = [...rmsValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const highThreshold = median + 3; // 3dB above median = noticeably louder
  const lowThreshold = median - 6;  // 6dB below median = noticeably quieter

  for (const r of results) {
    if (!isFinite(r.rmsDb)) {
      r.energy = "medium"; // fallback
    } else if (r.rmsDb >= highThreshold) {
      r.energy = "high";
    } else if (r.rmsDb <= lowThreshold) {
      r.energy = "low";
    } else {
      r.energy = "medium";
    }
  }

  return results;
}

/**
 * Analyze a single segment's audio loudness using FFmpeg astats.
 */
function analyzeSegmentEnergy(
  videoPath: string,
  startTime: number,
  endTime: number,
): Promise<SegmentEnergy> {
  const duration = endTime - startTime;

  return new Promise((resolve) => {
    let stderrData = "";

    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .audioFilters("astats=metadata=1:reset=0")
      .format("null")
      .output("-")
      .on("stderr", (line: string) => {
        stderrData += line + "\n";
      })
      .on("end", () => {
        const rmsMatch = stderrData.match(/RMS level dB:\s*([-\d.]+)/);
        const peakMatch = stderrData.match(/Peak level dB:\s*([-\d.]+)/);
        const rmsDb = rmsMatch ? parseFloat(rmsMatch[1]) : -Infinity;
        const peakDb = peakMatch ? parseFloat(peakMatch[1]) : -Infinity;

        resolve({
          start: startTime,
          end: endTime,
          rmsDb,
          peakDb,
          energy: "medium", // will be overwritten by relative comparison
        });
      })
      .on("error", () => {
        // On error, return neutral values
        resolve({
          start: startTime,
          end: endTime,
          rmsDb: -Infinity,
          peakDb: -Infinity,
          energy: "medium",
        });
      })
      .run();
  });
}

/**
 * Format energy data as a concise string to append to segment text for the LLM.
 */
export function formatEnergyTag(energy: "high" | "medium" | "low"): string {
  if (energy === "high") return "[ENERGETIC DELIVERY — speaker is loud, emphatic, or animated]";
  if (energy === "low") return "[QUIET DELIVERY — speaker is calm, subdued]";
  return ""; // don't tag medium — it's the default
}
