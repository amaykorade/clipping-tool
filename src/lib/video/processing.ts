import ffmpeg from "fluent-ffmpeg";
import { existsSync } from "fs";

// Use ffmpeg-full (with libfreetype for drawtext captions) if available
const FFMPEG_FULL = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";
const FFPROBE_FULL = "/opt/homebrew/opt/ffmpeg-full/bin/ffprobe";

const ffmpegPath = process.env.FFMPEG_PATH || (existsSync(FFMPEG_FULL) ? FFMPEG_FULL : undefined);
const ffprobePath = process.env.FFPROBE_PATH || (existsSync(FFPROBE_FULL) ? FFPROBE_FULL : undefined);

if (ffmpegPath) {
  console.log("[FFmpeg] Using:", ffmpegPath);
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

export interface CropOptions {
  aspectRatio: "9:16" | "1:1" | "16:9";
  position?: "center" | "top" | "bottom";
  cropMode?: "fill" | "fit";
}

export interface RenderClipOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  crop?: CropOptions;
  captions?: CaptionOptions;
  /** When true, overlay a watermark. */
  watermark?: boolean;
  /** Watermark position. Defaults to bottom-right. */
  watermarkPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Watermark opacity 0.0-1.0. Defaults to 0.6. */
  watermarkOpacity?: number;
  /** Called with progress percentage (0-100) during FFmpeg rendering. */
  onProgress?: (percent: number) => void;
}

export interface CaptionOptions {
  style: "default" | "bold" | "modern" | "minimal" | "karaoke" | "outline";
  words: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  /** Caption X position as percentage 0-100 (default: 50, centered) */
  positionX?: number;
  /** Caption Y position as percentage 0-100 (default: ~85, near bottom) */
  positionY?: number;
  /** Caption scale factor 0.5-2.0 (default: 1.0) */
  scale?: number;
  /** Hex color for active word highlight in karaoke mode */
  activeColor?: string;
}

/**
 * Main clip rendering function
 * Combines: trimming, cropping, caption overlay
 */
export async function renderClip(options: RenderClipOptions): Promise<void> {
  const { inputPath, outputPath, startTime, endTime, crop, captions, watermark, watermarkPosition, watermarkOpacity, onProgress } = options;

  const durationSec = endTime - startTime;
  if (durationSec < 0.5) {
    return Promise.reject(new Error(`Invalid clip duration: ${durationSec}s (start=${startTime}, end=${endTime})`));
  }

  const isFitMode = crop?.cropMode === "fit";

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(durationSec);

    if (isFitMode && crop) {
      // Fit mode: use complex filter graph (split → blur bg + fit fg → overlay)
      const fitGraph = buildFitFilterGraph(
        crop,
        captions ? buildCaptionFilter(captions, startTime) : null,
        watermark ? buildWatermarkFilter(watermarkPosition, watermarkOpacity) : null,
      );
      // Use raw -filter_complex via outputOptions to avoid fluent-ffmpeg's
      // complexFilter() auto-mapping which can conflict with audio mapping
      command = command.outputOptions([
        "-filter_complex", fitGraph.graph,
        "-map", `[${fitGraph.outputLabel}]`,
        "-map", "0:a?",
      ]);
    } else {
      // Fill mode: linear filter chain (existing behavior)
      const filters: string[] = [];

      if (crop) {
        filters.push(buildCropFilter(crop));
      }

      if (captions) {
        const captionFilter = buildCaptionFilter(captions, startTime);
        if (captionFilter) filters.push(captionFilter);
      }

      if (watermark) {
        filters.push(buildWatermarkFilter(watermarkPosition, watermarkOpacity));
      }

      if (filters.length > 0) {
        command = command.videoFilters(filters.join(","));
      }
    }

    // Output settings: -t ensures we never read past requested duration (avoids ffmpeg 234)
    command
      .outputOptions([
        "-t",
        String(durationSec),
        "-c:v libx264",
        "-preset fast",
        "-crf 23",
        "-c:a aac",
        "-b:a 128k",
        "-movflags +faststart",
      ])
      .output(outputPath)
      .on("start", (cmd) => {
        console.log("[FFmpeg] Command:", cmd);
      })
      .on("progress", (progress) => {
        const pct = progress.percent ?? 0;
        console.log(`[FFmpeg] Progress: ${pct.toFixed(1)}%`);
        if (onProgress) onProgress(Math.round(pct));
      })
      .on("end", () => {
        console.log("[FFmpeg] Clip rendering complete");
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("[FFmpeg] Error:", err.message);
        if (stderr) console.error("[FFmpeg] stderr:", stderr);
        reject(err);
      })
      .run();
  });
}

/**
 * Build watermark drawtext filter with configurable position and opacity.
 */
function buildWatermarkFilter(
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left",
  opacity?: number,
): string {
  const text = "Kllivo";
  const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
  const alpha = opacity ?? 0.6;
  const pos = position ?? "bottom-right";
  const x = pos.includes("right") ? "w-tw-24" : "24";
  const y = pos.includes("bottom") ? "h-th-16" : "16";
  return `drawtext=text='${escaped}':x=${x}:y=${y}:fontsize=22:fontcolor=white@${alpha}:bordercolor=black@${alpha * 0.67}:borderw=1`;
}

/**
 * Build FFmpeg crop filter based on aspect ratio
 */
function buildCropFilter(crop: CropOptions): string {
  const { aspectRatio, position = "center" } = crop;

  // Calculate dimensions
  let cropExpression = "";

  switch (aspectRatio) {
    case "9:16": // Vertical (TikTok, Reels)
      // Target: 9:16 ratio
      // If video is 1920x1080 (16:9), crop to 607x1080
      cropExpression = "crop=ih*9/16:ih";

      // Position adjustment
      if (position === "center") {
        cropExpression = "crop=ih*9/16:ih:(iw-ow)/2:0";
      } else if (position === "top") {
        cropExpression = "crop=ih*9/16:ih:(iw-ow)/2:0";
      } else if (position === "bottom") {
        cropExpression = "crop=ih*9/16:ih:(iw-ow)/2:ih-oh";
      }
      break;

    case "1:1": // Square (Instagram)
      cropExpression = "crop=min(iw\\,ih):min(iw\\,ih)";
      break;

    case "16:9": // Landscape (YouTube)
      // Keep original if already 16:9, else crop
      cropExpression = "crop=iw:iw*9/16";
      break;
  }

  // Scale to common resolutions
  const scaleMap = {
    "9:16": "scale=1080:1920",
    "1:1": "scale=1080:1080",
    "16:9": "scale=1920:1080",
  };

  return `${cropExpression},${scaleMap[aspectRatio]}`;
}

/**
 * Build a complex filter graph for "Fit" crop mode.
 * Splits the input into two streams:
 * - Background: scaled to fill, heavily blurred and darkened
 * - Foreground: scaled to fit (no crop), padded with transparency, overlaid on top
 */
function buildFitFilterGraph(
  crop: CropOptions,
  captionFilter: string | null,
  watermarkFilter: string | null,
): { graph: string; outputLabel: string } {
  const scaleMap: Record<string, { w: number; h: number }> = {
    "9:16": { w: 1080, h: 1920 },
    "1:1": { w: 1080, h: 1080 },
    "16:9": { w: 1920, h: 1080 },
  };

  const { w, h } = scaleMap[crop.aspectRatio];
  const parts: string[] = [];

  // Split input video into two streams
  parts.push(`[0:v]split[bg_in][fg_in]`);

  // Background: scale to fill (increase to cover), crop to exact size, blur, darken
  parts.push(
    `[bg_in]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:5,eq=brightness=-0.3[bg]`,
  );

  // Foreground: scale to fit (decrease to contain), pad to exact size centered
  parts.push(
    `[fg_in]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2[fg]`,
  );

  // Overlay foreground on background
  parts.push(`[bg][fg]overlay=0:0[composed]`);

  // Chain additional filters (captions, watermark) onto the composed output
  let currentLabel = "composed";
  if (captionFilter) {
    parts.push(`[${currentLabel}]${captionFilter}[captioned]`);
    currentLabel = "captioned";
  }
  if (watermarkFilter) {
    parts.push(`[${currentLabel}]${watermarkFilter}[watermarked]`);
    currentLabel = "watermarked";
  }

  return {
    graph: parts.join(";"),
    outputLabel: currentLabel,
  };
}

/**
 * Build caption overlay filter (drawtext).
 * Only use when FFmpeg is built with drawtext support (libfreetype).
 * Many minimal/Homebrew FFmpeg builds don't include it, so we skip by default
 * unless ENABLE_FFMPEG_CAPTIONS=1 to avoid "Filter not found".
 */
function buildCaptionFilter(
  captions: CaptionOptions,
  clipStartTime: number,
): string | null {
  if (process.env.ENABLE_FFMPEG_CAPTIONS !== "1") {
    return null;
  }
  const { style, words, positionX, positionY, scale, activeColor } = captions;

  // Karaoke mode: per-word drawtext with individual colors
  if (style === "karaoke") {
    return buildKaraokeCaptionFilter(words, clipStartTime, positionX, positionY, scale, activeColor);
  }

  const fontFile = getFontFile();
  const s = scale ?? 1;
  const highlightColor = activeColor ?? "#c084fc";
  const xExpr = positionX != null ? `w*${positionX / 100}-text_w/2` : "(w-text_w)/2";
  const yExpr = positionY != null ? `h*${positionY / 100}-th/2` : "h-th-100";
  const styleConfig = getCaptionStyle(style, positionX, positionY, scale);
  const fontSize = getStyleFontSize(style, s);

  const chunks = chunkWords(words, 4);
  const filters: string[] = [];

  for (const chunk of chunks) {
    const chunkStart = chunk[0].start - clipStartTime;
    const chunkEnd = chunk[chunk.length - 1].end - clipStartTime;
    const fullText = chunk.map((w) => w.text).join(" ");
    const escapedFull = escapeDrawtext(fullText);

    // Background: full chunk text in normal style
    filters.push(
      `drawtext=text='${escapedFull}':${styleConfig}:enable='between(t,${chunkStart},${chunkEnd})'`,
    );

    // Foreground: highlight each active word
    for (const word of chunk) {
      const wStart = word.start - clipStartTime;
      const wEnd = word.end - clipStartTime;
      const escapedWord = escapeDrawtext(word.text);
      const wordsBefore = chunk.slice(0, chunk.indexOf(word));
      const prefixText = wordsBefore.map((w) => w.text).join(" ") + (wordsBefore.length > 0 ? " " : "");
      filters.push(
        `drawtext=text='${escapedWord}':fontfile=${fontFile}:fontsize=${fontSize}:fontcolor=${highlightColor}:borderw=3:bordercolor=black:x=${xExpr}+text_w*${prefixText.length}/${fullText.length}:y=${yExpr}:enable='between(t,${wStart},${wEnd})'`,
      );
    }
  }

  return filters.join(",");
}

/**
 * Karaoke mode: render each word group twice — once dimmed (all words), once bright (active word).
 * This creates the word-by-word highlight effect.
 */
function buildKaraokeCaptionFilter(
  words: Array<{ text: string; start: number; end: number }>,
  clipStartTime: number,
  positionX?: number,
  positionY?: number,
  scale?: number,
  activeColor?: string,
): string {
  const fontFile = getFontFile();
  const s = scale ?? 1;
  const fontSize = Math.round(65 * s);
  const xExpr = positionX != null ? `w*${positionX / 100}-text_w/2` : "(w-text_w)/2";
  const yExpr = positionY != null ? `h*${positionY / 100}-th/2` : "h-th-100";
  const highlightColor = activeColor ?? "white";
  const chunks = chunkWords(words, 4);
  const filters: string[] = [];

  for (const chunk of chunks) {
    const chunkStart = chunk[0].start - clipStartTime;
    const chunkEnd = chunk[chunk.length - 1].end - clipStartTime;
    const fullText = chunk.map((w) => w.text).join(" ");
    const escapedFull = escapeDrawtext(fullText);

    // Background: all words dimmed
    filters.push(
      `drawtext=text='${escapedFull}':fontfile=${fontFile}:fontsize=${fontSize}:fontcolor=white@0.4:borderw=3:bordercolor=black:box=1:boxcolor=black@0.7:boxborderw=10:x=${xExpr}:y=${yExpr}:enable='between(t,${chunkStart},${chunkEnd})'`,
    );

    // Foreground: each word bright when active
    for (const word of chunk) {
      const wStart = word.start - clipStartTime;
      const wEnd = word.end - clipStartTime;
      const escapedWord = escapeDrawtext(word.text);
      const wordsBefore = chunk.slice(0, chunk.indexOf(word));
      const prefixText = wordsBefore.map((w) => w.text).join(" ") + (wordsBefore.length > 0 ? " " : "");
      filters.push(
        `drawtext=text='${escapedWord}':fontfile=${fontFile}:fontsize=${fontSize}:fontcolor=${highlightColor}:borderw=3:bordercolor=black:x=${xExpr}+text_w*${prefixText.length}/${fullText.length}:y=${yExpr}:enable='between(t,${wStart},${wEnd})'`,
      );
    }
  }

  return filters.join(",");
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")  // Replace apostrophes with unicode right single quote to avoid breaking FFmpeg single-quote delimiters
    .replace(/:/g, "\\:");
}

/**
 * Chunk words into groups for caption display
 */
function chunkWords(
  words: Array<{ text: string; start: number; end: number }>,
  chunkSize: number,
): Array<Array<{ text: string; start: number; end: number }>> {
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize));
  }

  return chunks;
}

function getFontFile(): string {
  // Use system font — works on macOS. On Linux, override via FFMPEG_FONT_PATH env var.
  return process.env.FFMPEG_FONT_PATH || "/System/Library/Fonts/Helvetica.ttc";
}

/**
 * Get caption style configuration for FFmpeg drawtext filter.
 */
function getCaptionStyle(
  style: string,
  positionX?: number,
  positionY?: number,
  scale?: number,
): string {
  const fontfile = getFontFile();
  const s = scale ?? 1;
  const baseFontsize = 60;
  // Custom position: convert percentage to FFmpeg expression
  const xExpr = positionX != null ? `w*${positionX / 100}-text_w/2` : "(w-text_w)/2";
  const yExpr = positionY != null ? `h*${positionY / 100}-th/2` : "h-th-100";
  const baseStyle = {
    fontsize: Math.round(baseFontsize * s),
    fontcolor: "white",
    borderw: 3,
    bordercolor: "black",
    x: xExpr,
    y: yExpr,
    fontfile,
  };

  const styles: Record<string, Record<string, string | number>> = {
    default: {
      ...baseStyle,
    },
    bold: {
      ...baseStyle,
      fontsize: Math.round(70 * s),
      fontcolor: "yellow",
      borderw: 4,
    },
    modern: {
      ...baseStyle,
      fontsize: Math.round(65 * s),
      box: 1,
      boxcolor: "black@0.5",
      boxborderw: 10,
    },
    minimal: {
      ...baseStyle,
      fontsize: Math.round(48 * s),
      borderw: 2,
      ...(positionX == null && { x: "40" }),
      ...(positionY == null && { y: "h-th-80" }),
    },
    outline: {
      ...baseStyle,
      fontsize: Math.round(65 * s),
      borderw: 5,
      bordercolor: "#7c3aed",
    },
    // karaoke is handled separately in buildKaraokeCaptionFilter
  };

  const config = styles[style] ?? styles.modern;

  return Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join(":");
}

/** Get the font size used by a given caption style (needed for highlight overlay alignment). */
function getStyleFontSize(style: string, scale: number): number {
  const map: Record<string, number> = {
    default: 60,
    bold: 70,
    modern: 65,
    minimal: 48,
    outline: 65,
  };
  return Math.round((map[style] ?? 65) * scale);
}

/**
 * Get video info quickly
 */
export async function getVideoInfo(filePath: string): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const stream = metadata.streams.find((s) => s.codec_type === "video");
      if (!stream) return reject(new Error("No video stream"));

      resolve({
        width: stream.width || 0,
        height: stream.height || 0,
        duration: parseFloat(String(metadata.format.duration ?? 0)),
      });
    });
  });
}
