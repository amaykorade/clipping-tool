import { prisma } from "@/lib/db";
import { scoreAndTitleSegments, comparativeRank } from "@/lib/ai/clipScoring";
import { getBeatsFromTranscript } from "@/lib/ai/semanticSegmentation";
import { refineClipBoundaries, applyTrailingAndOpeningRules } from "@/lib/ai/clipRefinement";
import { analyzeAudioEnergy, formatEnergyTag } from "@/lib/ai/audioEnergy";
import type { Transcript, ClipSuggestion, TranscriptWord } from "@/types";
import { ClipStatus, AspectRatio } from "@/generated/prisma";

/** Find the dominant speaker in a time range by total speaking time. */
function getDominantSpeaker(
  words: TranscriptWord[],
  startTime: number,
  endTime: number,
): string | null {
  const durations = new Map<string, number>();
  for (const w of words) {
    if (!w.speaker || w.start < startTime || w.end > endTime) continue;
    durations.set(w.speaker, (durations.get(w.speaker) ?? 0) + (w.end - w.start));
  }
  if (durations.size === 0) return null;
  let best = "";
  let bestDur = 0;
  for (const [speaker, dur] of durations) {
    if (dur > bestDur) {
      best = speaker;
      bestDur = dur;
    }
  }
  return best;
}

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
  options: { maxClips?: number; videoFilePath?: string } = {},
): Promise<CreatedClip[]> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { clips: true },
  });

  if (!video) throw new Error("Video not found");
  if (video.status !== "READY" && video.status !== "ANALYZING")
    throw new Error("Video must be transcribed first (status READY)");

  // Collect feedback from existing clips before deleting
  const feedbackData = { liked: [] as { title: string; text: string }[], disliked: [] as { title: string; text: string }[] };
  if (video.clips.length > 0) {
    for (const c of video.clips) {
      if (c.feedback === "like" || c.feedback === "dislike") {
        // Get the text for this clip from the transcript
        const rawTranscript = video.transcript as Transcript | null | undefined;
        const clipText = rawTranscript?.sentences
          ?.filter((s) => s.start >= c.startTime && s.end <= c.endTime)
          .map((s) => s.text)
          .join(" ") ?? "";
        const entry = { title: c.title, text: clipText };
        if (c.feedback === "like") feedbackData.liked.push(entry);
        else feedbackData.disliked.push(entry);
      }
    }
    console.log(
      "[generateClipsFromTranscript] Video already has clips, deleting and regenerating",
      `(feedback: ${feedbackData.liked.length} liked, ${feedbackData.disliked.length} disliked)`,
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

  const minClipSec = 15; // allow punchy short clips (15-25s perform best on TikTok)
  const maxClipSec = 70;
  const maxSentencesPerClip = 8; // more sentences allowed since min duration is lower
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

  // If we have beats, build candidates within each beat + across adjacent beat boundaries.
  const withinBeatRanges: { start: number; end: number }[] =
    beats.length > 0
      ? beats.map((b) => ({ start: b.startSentenceIndex, end: b.endSentenceIndex }))
      : [{ start: 0, end: sentences.length - 1 }];

  // Cross-beat candidates: last N sentences of beat K + first M sentences of beat K+1
  // This catches "bridging moments" — transitions often contain reveals/reactions.
  const crossBeatRanges: { start: number; end: number }[] = [];
  if (beats.length > 1) {
    for (let k = 0; k < beats.length - 1; k++) {
      const beatA = beats[k];
      const beatB = beats[k + 1];
      // Take last 3 sentences of beat A + first 3 of beat B (up to 6 total)
      const crossStart = Math.max(beatA.startSentenceIndex, beatA.endSentenceIndex - 2);
      const crossEnd = Math.min(beatB.endSentenceIndex, beatB.startSentenceIndex + 2);
      if (crossEnd > crossStart) {
        crossBeatRanges.push({ start: crossStart, end: crossEnd });
      }
    }
  }

  const rangesToUse = [...withinBeatRanges, ...crossBeatRanges];

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

  // Audio energy analysis: tag segments with energy levels before sending to scoring LLM.
  // This helps the LLM prefer clips with energetic delivery (louder, more emphatic speech).
  let segmentsForScoring = segments;
  if (options.videoFilePath) {
    try {
      const energyResults = await analyzeAudioEnergy(options.videoFilePath, segments);
      segmentsForScoring = segments.map((seg, idx) => {
        const tag = energyResults[idx] ? formatEnergyTag(energyResults[idx].energy) : "";
        return tag ? { ...seg, text: `${seg.text} ${tag}` } : seg;
      });
      const highCount = energyResults.filter((e) => e.energy === "high").length;
      const lowCount = energyResults.filter((e) => e.energy === "low").length;
      console.log(
        `[generateClipsFromTranscript] Audio energy: ${highCount} high, ${lowCount} low, ${energyResults.length - highCount - lowCount} medium`,
      );
    } catch (err) {
      console.warn("[generateClipsFromTranscript] Audio energy analysis failed, proceeding without:", err);
    }
  }

  const hasFeedback = feedbackData.liked.length > 0 || feedbackData.disliked.length > 0;
  let suggestions = await scoreAndTitleSegments(segmentsForScoring, {
    maxClips,
    ...(hasFeedback && { feedback: feedbackData }),
  });
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

  // Step 4b: Comparative ranking — re-order clips by head-to-head LLM comparison
  // (much better than relying on absolute confidence scores alone).
  if (suggestions.length > 2) {
    suggestions = await comparativeRank(suggestions, segments);
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
          speaker: getDominantSpeaker(transcript.words, s.startTime, s.endTime),
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
