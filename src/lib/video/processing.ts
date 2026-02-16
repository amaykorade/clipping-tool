import ffmpeg from "fluent-ffmpeg";

export interface CropOptions {
  aspectRatio: "9:16" | "1:1" | "16:9";
  position?: "center" | "top" | "bottom";
}

export interface RenderClipOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  crop?: CropOptions;
  captions?: CaptionOptions;
  /** When true, overlay a "Clipflow" watermark (e.g. for free plan). */
  watermark?: boolean;
}

export interface CaptionOptions {
  style: "default" | "bold" | "modern";
  words: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

/**
 * Main clip rendering function
 * Combines: trimming, cropping, caption overlay
 */
export async function renderClip(options: RenderClipOptions): Promise<void> {
  const { inputPath, outputPath, startTime, endTime, crop, captions, watermark } = options;

  const durationSec = endTime - startTime;
  if (durationSec < 0.5) {
    return Promise.reject(new Error(`Invalid clip duration: ${durationSec}s (start=${startTime}, end=${endTime})`));
  }

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(durationSec);

    // Add video filters
    const filters: string[] = [];

    // 1. Crop to aspect ratio
    if (crop) {
      const cropFilter = buildCropFilter(crop);
      filters.push(cropFilter);
    }

    // 2. Caption overlay (drawtext; requires ffmpeg with libfreetype)
    if (captions) {
      const captionFilter = buildCaptionFilter(captions, startTime);
      if (captionFilter) filters.push(captionFilter);
    }

    // 3. Watermark (free plan)
    if (watermark) {
      filters.push(buildWatermarkFilter());
    }

    if (filters.length > 0) {
      command = command.videoFilters(filters.join(","));
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
        console.log(`[FFmpeg] Progress: ${progress.percent?.toFixed(1)}%`);
      })
      .on("end", () => {
        console.log("[FFmpeg] Clip rendering complete");
        resolve();
      })
      .on("error", (err) => {
        console.error("[FFmpeg] Error:", err);
        reject(err);
      })
      .run();
  });
}

/**
 * Build watermark drawtext filter (bottom-right, semi-transparent).
 */
function buildWatermarkFilter(): string {
  const text = "Clipflow";
  const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
  return `drawtext=text='${escaped}':x=w-tw-24:y=h-th-16:fontsize=22:fontcolor=white@0.6:bordercolor=black@0.4:borderw=1`;
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
  const { style, words } = captions;

  const chunks = chunkWords(words, 4);

  const filters = chunks.map((chunk) => {
    const text = chunk.map((w) => w.text).join(" ");
    const start = chunk[0].start - clipStartTime;
    const end = chunk[chunk.length - 1].end - clipStartTime;

    const styleConfig = getCaptionStyle(style);

    const escapedText = text
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:");

    return `drawtext=text='${escapedText}':${styleConfig}:enable='between(t,${start},${end})'`;
  });

  return filters.join(",");
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

/**
 * Get caption style configuration
 */
function getCaptionStyle(
  style: "default" | "bold" | "modern",
): string {
  const baseStyle = {
    fontsize: 60,
    fontcolor: "white",
    borderw: 3,
    bordercolor: "black",
    x: "(w-text_w)/2",
    y: "h-th-100",
  };

  const styles = {
    default: {
      ...baseStyle,
      fontfile: "/System/Library/Fonts/Helvetica.ttc",
    },
    bold: {
      ...baseStyle,
      fontsize: 70,
      fontcolor: "yellow",
      borderw: 4,
      fontfile: "/System/Library/Fonts/Helvetica.ttc",
    },
    modern: {
      ...baseStyle,
      fontsize: 65,
      fontcolor: "white",
      box: 1,
      boxcolor: "black@0.5",
      boxborderw: 10,
      fontfile: "/System/Library/Fonts/Helvetica.ttc",
    },
  };

  const config = styles[style];

  return Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join(":");
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
