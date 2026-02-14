import { prisma } from "@/lib/db";
import { scoreAndTitleSegments } from "@/lib/ai/clipScoring";
import { getBeatsFromTranscript } from "@/lib/ai/semanticSegmentation";
import type { Transcript } from "@/types";
import { ClipStatus, AspectRatio } from "@/generated/prisma/enums";

export interface CreatedClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number | null;
  status: string;
  outputUrl: string | null;
  aspectRatio: string;
}

/**
 * Generate short-form clips (9:16 vertical for Insta Reels, TikTok, YT Shorts)
 * from a video that already has a transcript. Idempotent: skips if clips already exist.
 * Returns created clips.
 */
export async function generateClipsFromTranscript(
  videoId: string,
  options: { maxClips?: number } = {},
): Promise<CreatedClip[]> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { clips: true },
  });

  if (!video) throw new Error("Video not found");
  if (video.status !== "READY")
    throw new Error("Video must be transcribed first (status READY)");

  // Always regenerate clips from the latest transcript.
  // If clips already exist for this video, delete them so we don't keep
  // outdated or low-quality ones around.
  if (video.clips.length > 0) {
    console.log(
      "[generateClipsFromTranscript] Video already has clips, deleting and regenerating",
    );
    await prisma.clip.deleteMany({ where: { videoId } });
  }

  const transcript = video.transcript as Transcript | null | undefined;

  if (!transcript || !Array.isArray(transcript.words) || transcript.words.length === 0) {
    throw new Error("Transcript has no word timings");
  }

  // Build candidate segments from RUNS OF SENTENCES, not raw time windows.
  // This lets the model pick 1–4 consecutive sentences as a clip, which is
  // much closer to how a human editor thinks about beats.
  const sentences =
    (transcript as any).sentences && Array.isArray((transcript as any).sentences)
      ? ((transcript as any).sentences as { text: string; start: number; end: number }[])
      : [];

  const minClipSec = 25; // target: more substantial clips
  const maxClipSec = 70;
  const maxSentencesPerClip = 6;
  const maxCandidates = 200;

  const endsWithSentencePunctuation = (text: string): boolean => {
    const t = text.trim();
    if (!t) return false;
    const last = t[t.length - 1];
    return last === "." || last === "!" || last === "?" || last === "؟" || last === "۔";
  };

  // Step 2: Semantic segmentation — get beats (one-idea ranges) so we only build candidates within each beat.
  let beats: { startSentenceIndex: number; endSentenceIndex: number }[] = [];
  try {
    beats = await getBeatsFromTranscript(transcript);
  } catch (err) {
    console.warn("[generateClipsFromTranscript] Beat detection failed, using full transcript:", err);
  }

  // If we have beats, build candidates only within each beat; otherwise use the whole transcript as one range.
  const rangesToUse: { start: number; end: number }[] =
    beats.length > 0
      ? beats.map((b) => ({ start: b.startSentenceIndex, end: b.endSentenceIndex }))
      : [{ start: 0, end: sentences.length - 1 }];

  const segments: { start: number; end: number; text: string }[] = [];

  if (sentences.length > 0) {
    outer: for (const range of rangesToUse) {
      const rangeStart = range.start;
      const rangeEnd = range.end;
      for (let i = rangeStart; i <= rangeEnd; i++) {
        const first = sentences[i];
        let start = first.start;
        const textParts: string[] = [];

        for (let j = i; j <= Math.min(i + maxSentencesPerClip - 1, rangeEnd); j++) {
          const s = sentences[j];
          const end = s.end;
          const duration = end - start;
          textParts.push(s.text);

          const endsClean = endsWithSentencePunctuation(s.text);

          if (endsClean && duration >= minClipSec && duration <= maxClipSec) {
            segments.push({
              start,
              end,
              text: textParts.join(" "),
            });
          }

          if (duration > maxClipSec || segments.length >= maxCandidates) {
            if (segments.length >= maxCandidates) break outer;
            break;
          }
        }
      }
    }
  }

  if (segments.length === 0) {
    throw new Error("No suitable segments found in transcript");
  }

  const maxClips = options.maxClips ?? 10;
  console.log(
    "[generateClipsFromTranscript] Beats:",
    beats.length > 0 ? beats.length : "none (full transcript)",
    "| Candidate segments:",
    segments.length,
  );
  let suggestions = await scoreAndTitleSegments(segments, { maxClips });
  console.log("[generateClipsFromTranscript] Suggestions count:", suggestions.length);

  if (suggestions.length === 0 && segments.length > 0) {
    suggestions = segments.slice(0, maxClips).map((s) => ({
      startTime: s.start,
      endTime: s.end,
      title: s.text.slice(0, 80) || "Clip",
      keywords: [] as string[],
      confidence: 0.5,
      reason: "Fallback from segment",
    }));
    console.log("[generateClipsFromTranscript] Using fallback suggestions:", suggestions.length);
  }

  const created = await prisma.$transaction(
    suggestions.map((s) =>
      prisma.clip.create({
        data: {
          videoId,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.endTime - s.startTime,
          confidence: s.confidence,
          keywords: s.keywords ?? [],
          aspectRatio: AspectRatio.VERTICAL, // 9:16 for Reels, TikTok, YT Shorts
          status: ClipStatus.PENDING,
        },
      }),
    ),
  );

  return created.map((c) => ({
    id: c.id,
    title: c.title,
    startTime: c.startTime,
    endTime: c.endTime,
    duration: c.duration,
    confidence: c.confidence,
    status: c.status,
    outputUrl: c.outputUrl,
    aspectRatio: c.aspectRatio,
  }));
}
