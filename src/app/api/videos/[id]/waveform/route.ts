import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { generateWaveform } from "@/lib/video/waveform";

const MAX_SAMPLES = 2000;
const DEFAULT_SAMPLES = 200;

/**
 * GET /api/videos/[id]/waveform?start=0&end=30&samples=200
 * Returns audio waveform peaks (0–1) for a time range.
 * Results are cached in storage for subsequent requests.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  try {
    // Parse and validate query params
    const { searchParams } = req.nextUrl;
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");
    const samplesStr = searchParams.get("samples");

    if (!startStr || !endStr) {
      return NextResponse.json(
        { error: "start and end query parameters are required" },
        { status: 400 },
      );
    }

    const start = parseFloat(startStr);
    const end = parseFloat(endStr);
    const samples = samplesStr ? parseInt(samplesStr, 10) : DEFAULT_SAMPLES;

    if (isNaN(start) || isNaN(end) || isNaN(samples)) {
      return NextResponse.json(
        { error: "start, end, and samples must be valid numbers" },
        { status: 400 },
      );
    }
    if (start < 0 || end <= start) {
      return NextResponse.json(
        { error: "end must be greater than start, and start must be >= 0" },
        { status: 400 },
      );
    }
    if (samples < 1 || samples > MAX_SAMPLES) {
      return NextResponse.json(
        { error: `samples must be between 1 and ${MAX_SAMPLES}` },
        { status: 400 },
      );
    }

    // Fetch video and check access
    const video = await prisma.video.findUnique({
      where: { id },
      select: { id: true, userId: true, storageKey: true, duration: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (!canAccessVideo(video, session)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (!video.storageKey) {
      return NextResponse.json(
        { error: "Video file not available" },
        { status: 404 },
      );
    }

    // Clamp end to video duration if known
    const effectiveEnd = video.duration ? Math.min(end, video.duration) : end;
    if (effectiveEnd <= start) {
      return NextResponse.json(
        { error: "Requested range is outside video duration" },
        { status: 400 },
      );
    }

    const storage = getStorage();

    // Use rounded values for cache key to improve cache hit rate
    const cacheStart = Math.floor(start * 10) / 10;
    const cacheEnd = Math.ceil(effectiveEnd * 10) / 10;
    const cacheKey = `videos/${video.id}/waveform-${cacheStart}-${cacheEnd}-${samples}.json`;

    // Check for cached result
    const cached = await storage.exists(cacheKey);
    if (cached) {
      try {
        const data = await storage.download(cacheKey);
        const parsed = JSON.parse(data.toString("utf-8"));
        return NextResponse.json(parsed);
      } catch {
        // Cache corrupted — regenerate
      }
    }

    // Generate waveform
    const peaks = await generateWaveform(
      video.storageKey,
      start,
      effectiveEnd,
      samples,
    );

    const result = { peaks };

    // Cache the result (fire-and-forget; don't fail the request if caching fails)
    storage
      .upload(Buffer.from(JSON.stringify(result)), cacheKey, {
        contentType: "application/json",
      })
      .catch((err) => {
        console.warn("[API] Failed to cache waveform:", err);
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Waveform error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(error as Error) },
      { status: 500 },
    );
  }
}
