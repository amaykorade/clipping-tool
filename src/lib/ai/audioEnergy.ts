import { execFile } from "child_process";

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
 * Per-second loudness entry extracted from a single FFmpeg pass.
 */
interface SecondLoudness {
  second: number;
  rmsDb: number;
  peakDb: number;
}

/**
 * Run a SINGLE FFmpeg pass over the entire file to extract per-second RMS loudness.
 * This replaces the old approach of spawning one FFmpeg process per segment (200 processes → 1).
 *
 * Uses `astats` with reset=1 (reset stats every second) and `ametadata` to print
 * per-second RMS and peak levels to stderr, which we then parse.
 */
async function extractPerSecondLoudness(videoPath: string): Promise<SecondLoudness[]> {
  return new Promise((resolve) => {
    const args = [
      "-i", videoPath,
      "-vn", // skip video — only process audio (much faster)
      "-af", "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:key=lavfi.astats.Overall.Peak_level",
      "-f", "null",
      "-",
    ];

    execFile("ffmpeg", args, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for long videos
    }, (_error, _stdout, stderr) => {
      const stderrData = stderr || "";
      const entries: SecondLoudness[] = [];
      const lines = stderrData.split("\n");

      let currentRms = -Infinity;
      let secondIndex = 0;

      for (const line of lines) {
        const rmsMatch = line.match(/RMS_level=([-\d.]+|inf|-inf)/);
        const peakMatch = line.match(/Peak_level=([-\d.]+|inf|-inf)/);

        if (rmsMatch) {
          currentRms = rmsMatch[1] === "-inf" ? -Infinity : parseFloat(rmsMatch[1]);
        }
        if (peakMatch) {
          const peakVal = peakMatch[1] === "-inf" ? -Infinity : parseFloat(peakMatch[1]);
          entries.push({
            second: secondIndex,
            rmsDb: currentRms,
            peakDb: peakVal,
          });
          secondIndex++;
          currentRms = -Infinity;
        }
      }

      resolve(entries);
    });

    // If ffmpeg binary not found, resolve empty
  }).catch(() => []) as Promise<SecondLoudness[]>;
}

/**
 * Analyze audio energy for a list of segments using a SINGLE FFmpeg pass.
 *
 * Old approach: 200 segments → 200 FFmpeg processes → 30-60 seconds
 * New approach: 1 FFmpeg pass → map segments to per-second data → 2-3 seconds
 *
 * Returns energy tags (high/medium/low) that get passed to the scoring LLM.
 */
export async function analyzeAudioEnergy(
  videoPath: string,
  segments: { start: number; end: number }[],
): Promise<SegmentEnergy[]> {
  if (segments.length === 0) return [];

  // Single FFmpeg pass — extracts per-second loudness for the entire file
  const perSecond = await extractPerSecondLoudness(videoPath);

  if (perSecond.length === 0) {
    // FFmpeg failed — return neutral values for all segments
    return segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      rmsDb: -Infinity,
      peakDb: -Infinity,
      energy: "medium" as const,
    }));
  }

  // Map each segment to its average loudness from the per-second data
  const results: SegmentEnergy[] = segments.map((seg) => {
    const startSec = Math.floor(seg.start);
    const endSec = Math.ceil(seg.end);

    // Get all per-second entries within this segment's range
    const relevant = perSecond.filter(
      (s) => s.second >= startSec && s.second < endSec,
    );

    if (relevant.length === 0) {
      return {
        start: seg.start,
        end: seg.end,
        rmsDb: -Infinity,
        peakDb: -Infinity,
        energy: "medium" as const,
      };
    }

    // Average RMS and max peak across the segment's seconds
    const finiteRms = relevant.filter((r) => isFinite(r.rmsDb));
    const finitePeak = relevant.filter((r) => isFinite(r.peakDb));

    const avgRms = finiteRms.length > 0
      ? finiteRms.reduce((sum, r) => sum + r.rmsDb, 0) / finiteRms.length
      : -Infinity;
    const maxPeak = finitePeak.length > 0
      ? Math.max(...finitePeak.map((r) => r.peakDb))
      : -Infinity;

    return {
      start: seg.start,
      end: seg.end,
      rmsDb: avgRms,
      peakDb: maxPeak,
      energy: "medium" as const, // will be overwritten below
    };
  });

  // Compute relative energy: compare each segment to the median
  const rmsValues = results.map((r) => r.rmsDb).filter((v) => isFinite(v));
  if (rmsValues.length === 0) return results;

  const sorted = [...rmsValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const highThreshold = median + 3; // 3dB above median = noticeably louder
  const lowThreshold = median - 6;  // 6dB below median = noticeably quieter

  for (const r of results) {
    if (!isFinite(r.rmsDb)) {
      r.energy = "medium";
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
 * Format energy data as a concise string to append to segment text for the LLM.
 */
export function formatEnergyTag(energy: "high" | "medium" | "low"): string {
  if (energy === "high") return "[ENERGETIC DELIVERY — speaker is loud, emphatic, or animated]";
  if (energy === "low") return "[QUIET DELIVERY — speaker is calm, subdued]";
  return ""; // don't tag medium — it's the default
}
