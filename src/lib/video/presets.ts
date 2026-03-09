/**
 * Platform-specific export presets for clip rendering.
 * Each preset defines aspect ratio, resolution, max duration, and encoding hints.
 */

export interface ExportPreset {
  id: string;
  label: string;
  platform: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  width: number;
  height: number;
  maxDurationSec: number;
  /** FFmpeg output options specific to this preset */
  ffmpegOptions?: string[];
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "tiktok",
    label: "TikTok",
    platform: "TikTok",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    maxDurationSec: 60,
  },
  {
    id: "instagram-reels",
    label: "Instagram Reels",
    platform: "Instagram",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    maxDurationSec: 90,
  },
  {
    id: "youtube-shorts",
    label: "YouTube Shorts",
    platform: "YouTube",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    maxDurationSec: 60,
  },
  {
    id: "twitter",
    label: "Twitter / X",
    platform: "Twitter",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    maxDurationSec: 140,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    platform: "LinkedIn",
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
    maxDurationSec: 600,
  },
];

export function getPreset(id: string): ExportPreset | undefined {
  return EXPORT_PRESETS.find((p) => p.id === id);
}

/** Validate that clip duration fits within preset limits. Returns error string or null. */
export function validatePreset(
  preset: ExportPreset,
  clipDurationSec: number,
): string | null {
  if (clipDurationSec > preset.maxDurationSec) {
    return `Clip is ${Math.ceil(clipDurationSec)}s but ${preset.label} max is ${preset.maxDurationSec}s. Trim the clip first.`;
  }
  return null;
}
