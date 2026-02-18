import { prisma } from "@/lib/db";
import { scoreAndTitleSegments } from "@/lib/ai/clipScoring";
import { getBeatsFromTranscript } from "@/lib/ai/semanticSegmentation";
import { refineClipBoundaries, applyTrailingAndOpeningRules } from "@/lib/ai/clipRefinement";
import type { Transcript, ClipSuggestion } from "@/types";
import { ClipStatus, AspectRatio } from "@/generated/prisma";

/** Round to 1s for dedup key so the same segment doesn't become multiple clips with different titles. */
function timeRangeKey(startTime: number, endTime: number): string {
  return `${Math.round(startTime)}-${Math.round(endTime)}`;
}

/**
 * Deduplicate suggestions by time range. The LLM often returns several picks that snap to the same
 * segment (same start/end), producing duplicate clips with different names. Keep one per unique range (highest confidence).
 */
function deduplicateSuggestionsByTimeRange(suggestions: ClipSuggestion[]): ClipSuggestion[] {
  const byKey = new Map<string, ClipSuggestion>();
  for (const s of suggestions) {
    const key = timeRangeKey(s.startTime, s.endTime);
    const existing = byKey.get(key);
    if (!existing || (s.confidence ?? 0) > (existing.confidence ?? 0)) {
      byKey.set(key, s);
    }
  }
  const deduped = [...byKey.values()];
  if (deduped.length < suggestions.length) {
    console.log(
      "[generateClipsFromTranscript] Deduplicated by time range:",
      suggestions.length,
      "→",
      deduped.length,
      "clips",
    );
  }
  return deduped;
}

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

  const LONG_PAUSE_SEC = 1.5; // Step 3: prefer clip boundaries at long pauses
  type SegmentWithIndices = { start: number; end: number; text: string; startSentenceIndex: number; endSentenceIndex: number };
  const segmentsWithIndices: SegmentWithIndices[] = [];

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
            segmentsWithIndices.push({
              start,
              end,
              text: textParts.join(" "),
              startSentenceIndex: i,
              endSentenceIndex: j,
            });
          }

          if (duration > maxClipSec || segmentsWithIndices.length >= maxCandidates * 2) {
            if (segmentsWithIndices.length >= maxCandidates * 2) break outer;
            break;
          }
        }
      }
    }
  }

  // Step 3: Prefer candidates that start/end at long pauses. Rank by boundary quality, then cap at maxCandidates.
  const sentenceGaps = transcript.sentenceGaps;
  const segments: { start: number; end: number; text: string }[] = (() => {
    let list = segmentsWithIndices;
    if (sentenceGaps && sentenceGaps.length > 0) {
      list = [...segmentsWithIndices].sort((a, b) => {
        const score = (seg: SegmentWithIndices) => {
          const gapAtStart = seg.startSentenceIndex < sentenceGaps.length ? (sentenceGaps[seg.startSentenceIndex] ?? 0) : 0;
          const gapAfterEnd = seg.endSentenceIndex + 1 < sentenceGaps.length ? (sentenceGaps[seg.endSentenceIndex + 1] ?? 0) : 0;
          const startNatural = gapAtStart >= LONG_PAUSE_SEC ? 1 : 0;
          const endNatural = gapAfterEnd >= LONG_PAUSE_SEC ? 1 : 0;
          return startNatural + endNatural; // 2 = both, 1 = one, 0 = none
        };
        return score(b) - score(a); // higher first
      });
    }
    return list.slice(0, maxCandidates).map(({ start, end, text }) => ({ start, end, text }));
  })();

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

  // Step 5: Refinement — LLM suggests tighter start/end sentence; re-cut to sentence boundaries.
  if (sentences.length > 0 && suggestions.length > 0) {
    suggestions = await refineClipBoundaries(transcript, suggestions);
  }

  // Step 6: Trailing/opening phrase rules — reject clips that end on "So next…" or start with "So, anyway…".
  suggestions = applyTrailingAndOpeningRules(suggestions, transcript);

  // Deduplicate: LLM can return multiple suggestions that map to the same time range (same segment), causing duplicate clips with different names. Keep one per unique range (highest confidence).
  suggestions = deduplicateSuggestionsByTimeRange(suggestions);

  // Step 7: Save and render — persist clips with 9:16 vertical (Reels, TikTok, Shorts). Platform presets (e.g. different min/max length per app) can be added via options later.
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
